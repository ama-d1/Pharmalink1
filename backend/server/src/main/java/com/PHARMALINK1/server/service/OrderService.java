package com.PHARMALINK1.server.service;

import com.PHARMALINK1.server.dto.OrderRequest;
import com.PHARMALINK1.server.model.DrugCatalog;
import com.PHARMALINK1.server.model.DrugOrder;
import com.PHARMALINK1.server.repository.DrugCatalogRepository;
import com.PHARMALINK1.server.repository.DrugOrderRepository;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrderService {

    private final DrugOrderRepository drugOrderRepository;
    private final DrugCatalogRepository drugCatalogRepository;

    public OrderService(DrugOrderRepository drugOrderRepository, DrugCatalogRepository drugCatalogRepository) {
        this.drugOrderRepository = drugOrderRepository;
        this.drugCatalogRepository = drugCatalogRepository;
    }

    public List<DrugCatalog> getAvailableDrugs() {
        return drugCatalogRepository.findByInStockTrue();
    }

    public DrugOrder createOrder(OrderRequest request) {
        DrugOrder order = new DrugOrder();
        order.setUserId(request.getUserId());
        order.setDeliveryAddress(request.getDeliveryAddress());
        order.setPaymentMethod(request.getPaymentMethod());

        List<DrugOrder.OrderItem> items = request.getItems().stream()
            .map(i -> new DrugOrder.OrderItem(i.getDrugName(), i.getQuantity(), i.getUnitPrice()))
            .collect(Collectors.toList());
        order.setItems(items);

        double total = items.stream().mapToDouble(i -> i.getUnitPrice() * i.getQuantity()).sum();
        order.setTotalAmount(total);
        return drugOrderRepository.save(order);
    }

    public DrugOrder processPayment(String orderId) {
        DrugOrder order = drugOrderRepository.findById(orderId)
            .orElseThrow(() -> new RuntimeException("Order not found"));
        order.setPaymentStatus(DrugOrder.PaymentStatus.PAID);
        order.setOrderStatus(DrugOrder.OrderStatus.CONFIRMED);
        return drugOrderRepository.save(order);
    }

    public List<DrugOrder> getUserOrders(String userId) {
        return drugOrderRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
}
