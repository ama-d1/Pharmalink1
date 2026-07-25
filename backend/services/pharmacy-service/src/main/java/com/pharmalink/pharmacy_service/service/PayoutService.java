package com.pharmalink.pharmacy_service.service;

import com.pharmalink.pharmacy_service.client.PaystackClient;
import com.pharmalink.pharmacy_service.model.Pharmacy;
import com.pharmalink.pharmacy_service.repository.PharmacyRepository;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Added 2026-07-24 for real Paystack payment splitting — the DB read/write
 * side of pharmacy bank-account onboarding (PaystackClient owns the actual
 * Paystack API calls; this owns persisting the result onto Pharmacy). Same
 * split as PharmacyStockService/PharmacyStockRepository for consistency.
 */
@Service
public class PayoutService {

    private final PharmacyRepository pharmacyRepository;
    private final PaystackClient paystackClient;

    public PayoutService(PharmacyRepository pharmacyRepository, PaystackClient paystackClient) {
        this.pharmacyRepository = pharmacyRepository;
        this.paystackClient = paystackClient;
    }

    public List<PaystackClient.Bank> listBanks() {
        return paystackClient.listBanks();
    }

    public Optional<String> resolveAccount(String accountNumber, String bankCode) {
        return paystackClient.resolveAccount(accountNumber, bankCode);
    }

    /**
     * Creates the Paystack subaccount and, only on success, saves everything
     * onto the Pharmacy row in one shot. Never saves partial state — if
     * Paystack fails, the pharmacy's existing bank-account fields (if any)
     * are left untouched.
     */
    public Optional<Pharmacy> saveBankAccount(String pharmacyId, String accountNumber, String bankCode, String accountName) {
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId).orElse(null);
        if (pharmacy == null) return Optional.empty();

        Optional<String> subaccountCode = paystackClient.createSubaccount(pharmacy.getName(), bankCode, accountNumber);
        if (subaccountCode.isEmpty()) return Optional.empty();

        pharmacy.setBankCode(bankCode);
        pharmacy.setBankAccountNumber(accountNumber);
        pharmacy.setBankAccountName(accountName);
        pharmacy.setPaystackSubaccountCode(subaccountCode.get());
        pharmacy.setSubaccountActive(true);
        return Optional.of(pharmacyRepository.save(pharmacy));
    }

    /**
     * Status for the OWNER-facing screen — masks the account number to its
     * last 4 digits, matching the "never return the full number back out"
     * rule (see PayoutController javadoc).
     */
    public Optional<Map<String, Object>> getBankAccountStatus(String pharmacyId) {
        return pharmacyRepository.findById(pharmacyId).map(pharmacy -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("bankCode", pharmacy.getBankCode());
            result.put("bankAccountName", pharmacy.getBankAccountName());
            result.put("subaccountActive", pharmacy.isSubaccountActive());
            result.put("lastFourDigits", lastFour(pharmacy.getBankAccountNumber()));
            return result;
        });
    }

    /**
     * Internal-only projection for payment-service's PharmacyClient — just
     * enough to apply (or skip) the Paystack split at checkout.
     */
    public Map<String, Object> getSubaccountForPayment(String pharmacyId) {
        Map<String, Object> result = new LinkedHashMap<>();
        Pharmacy pharmacy = pharmacyRepository.findById(pharmacyId).orElse(null);
        if (pharmacy == null || !pharmacy.isSubaccountActive()) {
            result.put("subaccountCode", null);
            result.put("active", false);
            return result;
        }
        result.put("subaccountCode", pharmacy.getPaystackSubaccountCode());
        result.put("active", true);
        return result;
    }

    private String lastFour(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) return null;
        return accountNumber.length() <= 4 ? accountNumber : accountNumber.substring(accountNumber.length() - 4);
    }
}
