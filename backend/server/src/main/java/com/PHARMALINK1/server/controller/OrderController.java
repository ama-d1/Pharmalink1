package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.dto.OrderRequest;
import com.PHARMALINK1.server.model.DrugCatalog;
import com.PHARMALINK1.server.model.DrugOrder;
import com.PHARMALINK1.server.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping("/drugs")
    public ResponseEntity<List<DrugCatalog>> getDrugs() {
        return ResponseEntity.ok(orderService.getAvailableDrugs());
    }

    @PostMapping
    public ResponseEntity<DrugOrder> createOrder(@RequestBody OrderRequest request) {
        return ResponseEntity.ok(orderService.createOrder(request));
    }

    @PostMapping("/{orderId}/pay")
    public ResponseEntity<DrugOrder> pay(@PathVariable String orderId) {
        return ResponseEntity.ok(orderService.processPayment(orderId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DrugOrder>> getUserOrders(@PathVariable String userId) {
        return ResponseEntity.ok(orderService.getUserOrders(userId));
    }
}
