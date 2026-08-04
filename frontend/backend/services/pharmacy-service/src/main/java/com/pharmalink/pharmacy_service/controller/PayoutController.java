package com.pharmalink.pharmacy_service.controller;

import com.pharmalink.pharmacy_service.client.PaystackClient;
import com.pharmalink.pharmacy_service.client.ProfileClient;
import com.pharmalink.pharmacy_service.model.Pharmacy;
import com.pharmalink.pharmacy_service.security.AuthContext;
import com.pharmalink.pharmacy_service.service.PayoutService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Added 2026-07-24 — pharmacy bank-account / Paystack subaccount
 * onboarding, backing real payment splitting (90% pharmacy / 10% platform,
 * applied at checkout by payment-service via the `subaccount` field on
 * Paystack's Initialize Transaction). See PayoutService/PaystackClient for
 * the actual work; this is routing + auth only.
 *
 * Ownership model: OWNER of the pharmacy or ADMIN only, for anything that
 * reads or writes a specific pharmacy's bank details — a MANAGER can run
 * day-to-day stock/orders but must not be able to redirect where the
 * pharmacy's money goes. This mirrors PharmacyStockController's ownership
 * pattern but additionally requires pharmacyRole == "OWNER" (not just "any
 * assigned pharmacist"), since a MANAGER is also "assigned" to the pharmacy.
 */
@RestController
public class PayoutController {

    private final PayoutService payoutService;
    private final ProfileClient profileClient;

    public PayoutController(PayoutService payoutService, ProfileClient profileClient) {
        this.payoutService = payoutService;
        this.profileClient = profileClient;
    }

    // Any authenticated user — just a reference list to populate the bank
    // picker on the frontend, no pharmacy-specific data in it.
    @GetMapping("/api/pharmacies/banks")
    public ResponseEntity<List<PaystackClient.Bank>> listBanks(HttpServletRequest request) {
        if (AuthContext.currentUserId(request) == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(payoutService.listBanks());
    }

    @PostMapping("/api/pharmacies/{pharmacyId}/resolve-account")
    public ResponseEntity<?> resolveAccount(
            @PathVariable String pharmacyId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        ResponseEntity<?> denied = checkOwnership(request, pharmacyId);
        if (denied != null) return denied;

        String accountNumber = body.get("accountNumber");
        String bankCode = body.get("bankCode");
        if (accountNumber == null || accountNumber.isBlank() || bankCode == null || bankCode.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "accountNumber and bankCode are required"));
        }

        Optional<String> accountName = payoutService.resolveAccount(accountNumber, bankCode);
        if (accountName.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Could not verify this account number against the selected bank. Double-check the details and try again."));
        }
        return ResponseEntity.ok(Map.of("accountName", accountName.get()));
    }

    @PostMapping("/api/pharmacies/{pharmacyId}/bank-account")
    public ResponseEntity<?> saveBankAccount(
            @PathVariable String pharmacyId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        ResponseEntity<?> denied = checkOwnership(request, pharmacyId);
        if (denied != null) return denied;

        String accountNumber = body.get("accountNumber");
        String bankCode = body.get("bankCode");
        String accountName = body.get("accountName");
        if (accountNumber == null || accountNumber.isBlank() || bankCode == null || bankCode.isBlank()
                || accountName == null || accountName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "accountNumber, bankCode, and accountName are required"));
        }

        Optional<Pharmacy> saved = payoutService.saveBankAccount(pharmacyId, accountNumber, bankCode, accountName);
        if (saved.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Could not set up this bank account with Paystack. Please verify the details and try again."));
        }
        return payoutService.getBankAccountStatus(pharmacyId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("message", "Pharmacy not found")));
    }

    @GetMapping("/api/pharmacies/{pharmacyId}/bank-account")
    public ResponseEntity<?> getBankAccount(@PathVariable String pharmacyId, HttpServletRequest request) {
        ResponseEntity<?> denied = checkOwnership(request, pharmacyId);
        if (denied != null) return denied;

        return payoutService.getBankAccountStatus(pharmacyId)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body(Map.of("message", "Pharmacy not found")));
    }

    // Internal-only — no gateway route exists for /internal/**, same
    // convention as every other internal endpoint in this system. Consumed
    // by payment-service's PharmacyClient at checkout. Always 200, even when
    // the pharmacy has no subaccount set up yet — payment-service treats
    // {subaccountCode: null, active: false} as "no split, pay platform in
    // full" rather than a checkout-blocking error.
    @GetMapping("/internal/pharmacies/{pharmacyId}/subaccount")
    public ResponseEntity<Map<String, Object>> getSubaccountForPayment(@PathVariable String pharmacyId) {
        return ResponseEntity.ok(payoutService.getSubaccountForPayment(pharmacyId));
    }

    private ResponseEntity<?> checkOwnership(HttpServletRequest request, String pharmacyId) {
        if (AuthContext.isAdmin(request)) return null;

        String userId = AuthContext.currentUserId(request);
        if (userId == null) {
            return ResponseEntity.status(401).body(Map.of("message", "Authentication required"));
        }

        boolean isOwnerOfThisPharmacy = profileClient.getPharmacyAssignment(userId)
                .filter(a -> pharmacyId.equals(a.pharmacyId()) && "OWNER".equals(a.pharmacyRole()))
                .isPresent();
        if (!isOwnerOfThisPharmacy) {
            return ResponseEntity.status(403).body(Map.of("message", "Only this pharmacy's owner can manage payout settings"));
        }
        return null;
    }
}
