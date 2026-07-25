package com.pharmalink.home_service.controller;

import com.pharmalink.home_service.model.HealthTip;
import com.pharmalink.home_service.security.AuthContext;
import com.pharmalink.home_service.service.HomeService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/home")
public class HomeController {

    private final HomeService homeService;

    public HomeController(HomeService homeService) {
        this.homeService = homeService;
    }

    @GetMapping("/health-tip/current")
    public ResponseEntity<HealthTip> getCurrentHealthTip() {
        return ResponseEntity.ok(homeService.getCurrentHealthTip());
    }

    // Phase 2 (step 8): the dashboard summary is per-user data (medication
    // count, health tip) — owner-or-admin only, same as everywhere else.
    @GetMapping("/summary/{userId}")
    public ResponseEntity<?> getSummary(@PathVariable String userId, HttpServletRequest request) {
        if (!AuthContext.isOwnerOrAdmin(request, userId)) {
            return ResponseEntity.status(403).body(Map.of("message", "You may only access your own data"));
        }
        return ResponseEntity.ok(homeService.getHomeSummary(userId));
    }
}
