package com.pharmalink.pharmacy_service.service;

import com.pharmalink.pharmacy_service.model.PharmacyStock;
import com.pharmalink.pharmacy_service.repository.PharmacyRepository;
import com.pharmalink.pharmacy_service.repository.PharmacyStockRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Added 2026-07-23 alongside the PharmacyStock entity — see its class
 * javadoc for the full feature context. Two audiences: pharmacists managing
 * their own pharmacy's stock/pricing (getStockForPharmacy/upsertStock/
 * deleteStock), and the public price-comparison search any logged-in user
 * can hit (searchAcrossPharmacies) that powers the Home screen's rebuilt
 * "Order Meds" flow.
 */
@Service
public class PharmacyStockService {

    private final PharmacyStockRepository stockRepository;
    private final PharmacyRepository pharmacyRepository;

    public PharmacyStockService(PharmacyStockRepository stockRepository, PharmacyRepository pharmacyRepository) {
        this.stockRepository = stockRepository;
        this.pharmacyRepository = pharmacyRepository;
    }

    public List<PharmacyStock> getStockForPharmacy(String pharmacyId) {
        return stockRepository.findByPharmacyId(pharmacyId);
    }

    /**
     * Create-or-update — one row per (pharmacy, drug), per the unique
     * constraint. A pharmacist re-submitting the same drug just updates
     * price/quantity on the existing row rather than erroring or duplicating.
     */
    public PharmacyStock upsertStock(String pharmacyId, String drugId, String drugName, double price, int quantity, String imageBase64) {
        if (price < 0) throw new IllegalArgumentException("price cannot be negative");
        if (quantity < 0) throw new IllegalArgumentException("quantity cannot be negative");

        PharmacyStock stock = stockRepository.findByPharmacyIdAndDrugId(pharmacyId, drugId)
                .orElseGet(PharmacyStock::new);
        stock.setPharmacyId(pharmacyId);
        stock.setDrugId(drugId);
        stock.setDrugName(drugName);
        stock.setPrice(price);
        stock.setQuantity(quantity);
        // Added 2026-07-23 — null/blank means "leave whatever image was
        // already there" (an update to price/quantity shouldn't silently
        // wipe a photo the pharmacist already uploaded); anything else
        // replaces it outright, including an explicit empty string meaning
        // "remove the photo" from the stock screen's delete-image action.
        if (imageBase64 != null) {
            stock.setImageBase64(imageBase64.isBlank() ? null : imageBase64);
        }
        return stockRepository.save(stock);
    }

    public void deleteStock(String pharmacyId, String stockId) {
        PharmacyStock stock = getStockEntity(pharmacyId, stockId);
        stockRepository.delete(stock);
    }

    // Used by the controller's ownership check (a pharmacist may only
    // delete their own pharmacy's rows) before the actual delete happens —
    // same split as ReviewController/ReviewService.
    public PharmacyStock getStockEntity(String pharmacyId, String stockId) {
        PharmacyStock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Stock entry not found"));
        if (!stock.getPharmacyId().equals(pharmacyId)) {
            throw new RuntimeException("Stock entry not found");
        }
        return stock;
    }

    /**
     * Cross-pharmacy price comparison — given a medication name, return
     * every pharmacy stocking it (with quantity > 0) alongside that
     * pharmacy's own display info, cheapest first. This is the core query
     * behind the Home screen's rebuilt Order Meds flow (search → compare
     * prices across nearby pharmacies → choose one → order).
     */
    public List<Map<String, Object>> searchAcrossPharmacies(String drugName) {
        List<PharmacyStock> matches = stockRepository.findByDrugNameContainingIgnoreCase(drugName);

        return matches.stream()
                .filter(s -> s.getQuantity() > 0)
                .map(this::toComparisonRow)
                .flatMap(Optional::stream)
                .sorted((a, b) -> Double.compare((double) a.get("price"), (double) b.get("price")))
                .toList();
    }

    private Optional<Map<String, Object>> toComparisonRow(PharmacyStock stock) {
        return pharmacyRepository.findById(stock.getPharmacyId()).map(pharmacy -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("stockId", stock.getId());
            row.put("drugId", stock.getDrugId());
            row.put("drugName", stock.getDrugName());
            row.put("price", stock.getPrice());
            row.put("quantity", stock.getQuantity());
            row.put("imageBase64", stock.getImageBase64());
            row.put("pharmacyId", pharmacy.getId());
            row.put("pharmacyName", pharmacy.getName());
            row.put("pharmacyAddress", pharmacy.getAddress());
            row.put("pharmacyCity", pharmacy.getCity());
            row.put("latitude", pharmacy.getLatitude());
            row.put("longitude", pharmacy.getLongitude());
            row.put("rating", pharmacy.getRating());
            return row;
        });
    }
}
