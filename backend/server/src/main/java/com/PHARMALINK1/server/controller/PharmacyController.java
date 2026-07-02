package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.model.Pharmacy;
import com.PHARMALINK1.server.service.PharmacyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/pharmacies")
@CrossOrigin(origins = "*")
public class PharmacyController {

    private final PharmacyService pharmacyService;

    public PharmacyController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    @GetMapping
    public ResponseEntity<List<Pharmacy>> getAll() {
        return ResponseEntity.ok(pharmacyService.getAllPharmacies());
    }

    @GetMapping("/search")
    public ResponseEntity<List<Pharmacy>> search(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(pharmacyService.searchPharmacies(q));
    }
}
