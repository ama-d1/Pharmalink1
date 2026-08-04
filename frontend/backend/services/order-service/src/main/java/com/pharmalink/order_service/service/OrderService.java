package com.pharmalink.order_service.service;

import com.pharmalink.order_service.client.DrugCatalogClient;
import com.pharmalink.order_service.client.NotificationClient;
import com.pharmalink.order_service.dto.OrderRequest;
import com.pharmalink.order_service.model.DrugOrder;
import com.pharmalink.order_service.repository.DrugOrderRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// Moved as-is from the monolith's service/OrderService.java, plus a
// NotificationClient call wired in during notification-service's build
// (MICROSERVICES_PLAN.md §6 step 7b) — the one producer you chose for this
// pass.
@Service
public class OrderService {

    private final DrugOrderRepository drugOrderRepository;
    private final DrugCatalogClient drugCatalogClient;
    private final NotificationClient notificationClient;

    public OrderService(
            DrugOrderRepository drugOrderRepository,
            DrugCatalogClient drugCatalogClient,
            NotificationClient notificationClient) {
        this.drugOrderRepository = drugOrderRepository;
        this.drugCatalogClient = drugCatalogClient;
        this.notificationClient = notificationClient;
    }

    public List<Map<String, Object>> getAvailableDrugs() {
        return drugCatalogClient.getAvailableDrugs();
    }

    public DrugOrder createOrder(OrderRequest request) {
        DrugOrder order = new DrugOrder();
        order.setUserId(request.getUserId());
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setPaymentMethod(request.getPaymentMethod());
        order.setPharmacyId(request.getPharmacyId());

        // Added 2026-07-23 — see DrugOrder.FulfillmentType javadoc. Falls
        // back to the entity's own default (DELIVERY) rather than throwing
        // if the frontend didn't send one, for backward compat.
        if (request.getFulfillmentType() != null && !request.getFulfillmentType().isBlank()) {
            order.setFulfillmentType(DrugOrder.FulfillmentType.valueOf(request.getFulfillmentType()));
        }
        double deliveryFee = order.getFulfillmentType() == DrugOrder.FulfillmentType.PICKUP ? 0 : Math.max(0, request.getDeliveryFee());
        order.setDeliveryFee(deliveryFee);

        List<DrugOrder.OrderItem> items = request.getItems().stream()
            .map(i -> new DrugOrder.OrderItem(i.getDrugName(), i.getQuantity(), i.getUnitPrice()))
            .collect(Collectors.toList());
        order.setItems(items);

        double itemsTotal = items.stream().mapToDouble(i -> i.getUnitPrice() * i.getQuantity()).sum();
        order.setTotalAmount(itemsTotal + deliveryFee);
        return drugOrderRepository.save(order);
    }

    /**
     * NOT a real payment integration — carried over unchanged from the
     * monolith originally. As of 2026-07-23, this endpoint is superseded by
     * the real flow: payment-service (POST /api/payments/initialize, then
     * GET /api/payments/verify/{reference}) actually talks to Paystack, and
     * only THAT service calling markPaymentResult() below can flip an order
     * to PAID now. This method is left in place only for whatever old
     * frontend code paths haven't been migrated yet — do not rely on it for
     * anything real, it still does the old unconditional flip with no
     * gateway involved.
     */
    public DrugOrder processPayment(String orderId) {
        DrugOrder order = drugOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setPaymentStatus(DrugOrder.PaymentStatus.PAID);
        order.setOrderStatus(DrugOrder.OrderStatus.CONFIRMED);
        DrugOrder saved = drugOrderRepository.save(order);
        notificationClient.notifyOrderStatusChange(saved.getUserId(), saved.getId(), saved.getOrderStatus().name());
        return saved;
    }

    /**
     * NEW (2026-07-23) — the real payment finalization path. Called only by
     * payment-service's OrderClient, only after it has independently
     * verified a transaction directly against Paystack's API (never on the
     * strength of anything a frontend claims). Lives under
     * /internal/orders/** (see InternalOrderController), unreachable from
     * outside the Docker network — same convention as every other internal
     * endpoint in this system, and the reason this is safe to expose without
     * its own separate secret/signature check.
     */
    public DrugOrder markPaymentResult(String orderId, boolean paid) {
        DrugOrder order = drugOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setPaymentStatus(paid ? DrugOrder.PaymentStatus.PAID : DrugOrder.PaymentStatus.UNPAID);
        order.setOrderStatus(paid ? DrugOrder.OrderStatus.CONFIRMED : DrugOrder.OrderStatus.PENDING);
        DrugOrder saved = drugOrderRepository.save(order);
        notificationClient.notifyOrderStatusChange(saved.getUserId(), saved.getId(), saved.getOrderStatus().name());
        return saved;
    }

    public List<DrugOrder> getUserOrders(String userId) {
        return drugOrderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * NEW — added for delivery-service (MICROSERVICES_PLAN.md §6 step 7a).
     * There was previously no way to fetch a single order by id; delivery
     * requests only carry an orderId, not a userId, so delivery-service
     * needs to resolve ownership by looking the order up here before it can
     * record who a delivery belongs to.
     */
    public DrugOrder getOrderById(String orderId) {
        return drugOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
    }

    // Phase 2 ownership-check support (MICROSERVICES_PLAN.md §6 step 8) —
    // null (not an exception) on a not-found id, so the controller can
    // return a plain 404 instead of conflating "doesn't exist" with
    // "forbidden".
    public String getOrderOwnerId(String orderId) {
        return drugOrderRepository.findById(orderId).map(DrugOrder::getUserId).orElse(null);
    }

    // Added for admin-service (step 7c) — "all orders across all users" is
    // admin-only data, so it backs /internal/orders, not a public
    // /api/orders/** route (that prefix is permitAll+gateway-routed).
    public List<DrugOrder> getAllOrders() {
        return drugOrderRepository.findAll();
    }

    // Added 2026-07-23 for the pharmacist owner/manager dashboard — a
    // pharmacy's own order history. Ownership (caller is staff at this
    // pharmacyId, or admin) is checked in the controller before this is
    // called, same split as getUserOrders/getOrderById above.
    public List<DrugOrder> getOrdersForPharmacy(String pharmacyId) {
        return drugOrderRepository.findByPharmacyIdOrderByCreatedAtDesc(pharmacyId);
    }

    // Added 2026-07-23, same dashboard — revenue only counts orders that
    // actually got paid (PAID payments), not every order ever placed
    // (abandoned/failed carts shouldn't inflate "revenue").
    public Map<String, Object> getPharmacyOrderSummary(String pharmacyId) {
        List<DrugOrder> orders = drugOrderRepository.findByPharmacyIdOrderByCreatedAtDesc(pharmacyId);
        long paidCount = orders.stream().filter(o -> o.getPaymentStatus() == DrugOrder.PaymentStatus.PAID).count();
        double revenue = orders.stream()
                .filter(o -> o.getPaymentStatus() == DrugOrder.PaymentStatus.PAID)
                .mapToDouble(DrugOrder::getTotalAmount)
                .sum();
        return Map.of(
                "totalOrders", orders.size(),
                "paidOrders", paidCount,
                "revenue", revenue
        );
    }
}
