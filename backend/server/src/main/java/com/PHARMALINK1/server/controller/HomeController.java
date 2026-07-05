package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.model.HealthTip;
import com.PHARMALINK1.server.service.HomeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/home")
@CrossOrigin(origins = "*")
public class HomeController {

    private final HomeService homeService;

    public HomeController(HomeService homeService) {
        this.homeService = homeService;
    }

    @GetMapping("/health-tip/current")
    public ResponseEntity<HealthTip> getCurrentHealthTip() {
        return ResponseEntity.ok(homeService.getCurrentHealthTip());
    }

    @GetMapping("/summary/{userId}")
    public ResponseEntity<Map<String, Object>> getSummary(@PathVariable String userId) {
        return ResponseEntity.ok(homeService.getHomeSummary(userId));
    }
}
