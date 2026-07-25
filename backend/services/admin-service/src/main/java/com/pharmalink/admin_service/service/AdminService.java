package com.pharmalink.admin_service.service;

import com.pharmalink.admin_service.client.*;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Pure orchestrator — no database of its own (MICROSERVICES_PLAN.md §2 row
 * 12). Every method here shapes data pulled from other services into
 * exactly what frontend/services/adminService.ts expects (AdminUser,
 * AdminPharmacy, AdminOrder, AdminReportedPost) — that file was already
 * built against this contract before this service existed.
 */
@Service
public class AdminService {

    private final AuthClient authClient;
    private final ProfileClient profileClient;
    private final PharmacyClient pharmacyClient;
    private final OrderClient orderClient;
    private final CommunityClient communityClient;

    public AdminService(
            AuthClient authClient,
            ProfileClient profileClient,
            PharmacyClient pharmacyClient,
            OrderClient orderClient,
            CommunityClient communityClient) {
        this.authClient = authClient;
        this.profileClient = profileClient;
        this.pharmacyClient = pharmacyClient;
        this.orderClient = orderClient;
        this.communityClient = communityClient;
    }

    // ── Users — joins auth-service (authoritative: email/role/enabled/
    // createdAt) with user-profile-service's directory (fullName/
    // phoneNumber) by userId. ────────────────────────────────────────────

    public List<Map<String, Object>> getAllUsers(String query) {
        List<Map<String, Object>> authUsers = authClient.listAllUsers();
        List<Map<String, Object>> directory = profileClient.getDirectory();

        Map<String, Map<String, Object>> directoryById = directory.stream()
                .collect(Collectors.toMap(p -> (String) p.get("userId"), p -> p, (a, b) -> a));

        List<Map<String, Object>> merged = authUsers.stream().map(u -> {
            String userId = (String) u.get("id");
            Map<String, Object> profile = directoryById.get(userId);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", userId);
            result.put("fullName", profile != null ? profile.get("fullName") : null);
            result.put("email", u.get("email"));
            result.put("phoneNumber", profile != null ? profile.get("phoneNumber") : null);
            result.put("role", u.get("role"));
            result.put("status", Boolean.TRUE.equals(u.get("enabled")) ? "ACTIVE" : "DISABLED");
            result.put("createdAt", u.get("createdAt"));
            return result;
        }).collect(Collectors.toList());

        if (query == null || query.isBlank()) {
            return merged;
        }
        String q = query.toLowerCase();
        return merged.stream()
                .filter(u -> containsIgnoreCase(u.get("fullName"), q) || containsIgnoreCase(u.get("email"), q))
                .collect(Collectors.toList());
    }

    private boolean containsIgnoreCase(Object field, String query) {
        return field != null && field.toString().toLowerCase().contains(query);
    }

    public void setUserStatus(String userId, String status) {
        boolean enabled = "ACTIVE".equalsIgnoreCase(status);
        authClient.setUserEnabled(userId, enabled);
    }

    public void setUserRole(String userId, String role) {
        // auth-service is authoritative — this call must succeed for the
        // action to count as done.
        authClient.setUserRole(userId, role);
        // Best-effort keep-in-sync of user-profile-service's denormalized
        // copy (see ProfileClient javadoc) — a failure here doesn't undo
        // the role change that already happened.
        profileClient.syncRole(userId, role);
    }

    // Added 2026-07-23 for pharmacist provisioning — pharmacyId/pharmacyName
    // only make sense when the role IS (or is becoming) PHARMACIST, but this
    // deliberately doesn't enforce that here: an admin re-assigning an
    // already-PHARMACIST user to a different pharmacy is a legitimate call
    // too (role param just gets passed through to the same authoritative
    // auth-service call as setUserRole above). pharmacyName is passed in
    // rather than looked up here because the frontend already has it from
    // the same pharmacy-picker dropdown it used to get pharmacyId — no need
    // for a second round trip to pharmacy-service just to re-fetch a name it
    // already displayed.
    public void setUserRoleWithPharmacy(String userId, String role, String pharmacyId, String pharmacyName) {
        authClient.setUserRole(userId, role);
        profileClient.syncRole(userId, role);
        profileClient.syncPharmacy(userId, pharmacyId, pharmacyName);
    }

    // Added 2026-07-23 — same as setUserRoleWithPharmacy above, extended to
    // also carry the OWNER/MANAGER tier through to ProfileClient's 4-arg
    // syncPharmacy overload.
    public void setUserRoleWithPharmacy(String userId, String role, String pharmacyId, String pharmacyName, String pharmacyRole) {
        authClient.setUserRole(userId, role);
        profileClient.syncRole(userId, role);
        profileClient.syncPharmacy(userId, pharmacyId, pharmacyName, pharmacyRole);
    }

    // ── Pharmacies ───────────────────────────────────────────────────────

    public List<Map<String, Object>> getAllPharmacies() {
        return pharmacyClient.getAllPharmacies();
    }

    public Map<String, Object> createPharmacy(Map<String, Object> pharmacy) {
        return pharmacyClient.createPharmacy(pharmacy);
    }

    public void setPharmacyVerified(String pharmacyId, boolean verified) {
        pharmacyClient.setVerified(pharmacyId, verified);
    }

    // ── Orders ───────────────────────────────────────────────────────────

    public List<Map<String, Object>> getAllOrders() {
        return orderClient.getAllOrders();
    }

    // ── Community moderation ────────────────────────────────────────────

    public List<Map<String, Object>> getReportedPosts() {
        return communityClient.getReportedPosts();
    }

    public void removePost(String postId) {
        communityClient.deletePost(postId);
    }

    public void removeComment(String commentId) {
        communityClient.deleteComment(commentId);
    }
}
