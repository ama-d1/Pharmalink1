package com.pharmalink.user_profile_service.service;

import com.pharmalink.user_profile_service.client.MedicationClient;
import com.pharmalink.user_profile_service.dto.BookAppointmentRequest;
import com.pharmalink.user_profile_service.dto.CreateProfileRequest;
import com.pharmalink.user_profile_service.dto.ProfileUpdateRequest;
import com.pharmalink.user_profile_service.dto.SaveLocationRequest;
import com.pharmalink.user_profile_service.model.Appointment;
import com.pharmalink.user_profile_service.model.Profile;
import com.pharmalink.user_profile_service.model.SavedLocation;
import com.pharmalink.user_profile_service.repository.AppointmentRepository;
import com.pharmalink.user_profile_service.repository.ProfileRepository;
import com.pharmalink.user_profile_service.repository.SavedLocationRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProfileService {

    private final ProfileRepository profileRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicationClient medicationClient;
    private final SavedLocationRepository savedLocationRepository;

    public ProfileService(ProfileRepository profileRepository,
                           AppointmentRepository appointmentRepository,
                           MedicationClient medicationClient,
                           SavedLocationRepository savedLocationRepository) {
        this.profileRepository = profileRepository;
        this.appointmentRepository = appointmentRepository;
        this.medicationClient = medicationClient;
        this.savedLocationRepository = savedLocationRepository;
    }

    // Called by auth-service (via InternalProfileController) right after a
    // new User is created, so every user has a profile row from day one.
    public Profile createProfile(CreateProfileRequest request) {
        Profile profile = new Profile();
        profile.setUserId(request.getUserId());
        profile.setFullName(request.getFullName());
        profile.setPhoneNumber(request.getPhoneNumber());
        profile.setRole(request.getRole());
        profile.setEmail(request.getEmail());
        return profileRepository.save(profile);
    }

    // NOTE: getProfile()'s response still doesn't include "email" (unlike
    // the monolith's old getProfile) even though Profile now technically
    // stores a denormalized copy — deliberately not surfacing it here to
    // avoid callers accidentally treating this response as authoritative
    // for email. The denormalized copy exists only to serve
    // searchByRole()/resolveNames() below, not general profile reads.
    public Map<String, Object> getProfile(String userId) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("userId", profile.getUserId());
        result.put("fullName", profile.getFullName());
        result.put("phoneNumber", profile.getPhoneNumber());
        result.put("profilePictureUrl", profile.getProfilePictureUrl());
        result.put("bloodGroup", profile.getBloodGroup());
        result.put("allergies", profile.getAllergies());
        result.put("conditions", profile.getConditions());
        result.put("adherenceRate", profile.getAdherenceRate() != null ? profile.getAdherenceRate() : 0);
        result.put("dayStreak", profile.getDayStreak() != null ? profile.getDayStreak() : 0);
        result.put("medicationCount", medicationClient.getActiveMedicationCount(userId));
        result.put("appointmentCount", appointmentRepository.countByUserId(userId));
        result.put("notificationsEnabled", profile.isNotificationsEnabled());
        result.put("privacyMode", profile.isPrivacyMode());
        result.put("communityAlerts", profile.isCommunityAlerts());
        result.put("appointmentReminders", profile.isAppointmentReminders());
        result.put("emailNotifications", profile.isEmailNotifications());
        // Added 2026-07-23 — the frontend's pharmacist stock/pricing screens
        // need to know their own pharmacyId after login (there was
        // previously no self-service way to read this at all; only the
        // /internal/** lookup existed, unreachable from the app directly).
        // Harmless to include for non-pharmacists — just null/empty.
        result.put("pharmacyId", profile.getPharmacyId());
        result.put("pharmacyName", profile.getPharmacyName());
        result.put("pharmacyRole", profile.getPharmacyRole());
        return result;
    }

    public Map<String, Object> updateProfile(String userId, ProfileUpdateRequest request) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        if (request.getFullName() != null) profile.setFullName(request.getFullName());
        if (request.getPhoneNumber() != null) profile.setPhoneNumber(request.getPhoneNumber());
        if (request.getProfilePictureUrl() != null) profile.setProfilePictureUrl(request.getProfilePictureUrl());
        if (request.getBloodGroup() != null) profile.setBloodGroup(request.getBloodGroup());
        if (request.getAllergies() != null) profile.setAllergies(request.getAllergies());
        if (request.getConditions() != null) profile.setConditions(request.getConditions());
        if (request.getNotificationsEnabled() != null) profile.setNotificationsEnabled(request.getNotificationsEnabled());
        if (request.getPrivacyMode() != null) profile.setPrivacyMode(request.getPrivacyMode());
        if (request.getCommunityAlerts() != null) profile.setCommunityAlerts(request.getCommunityAlerts());
        if (request.getAppointmentReminders() != null) profile.setAppointmentReminders(request.getAppointmentReminders());
        if (request.getEmailNotifications() != null) profile.setEmailNotifications(request.getEmailNotifications());

        profileRepository.save(profile);
        return getProfile(userId);
    }

    // Coming-soon roadmap item #3: lets community-service check this
    // before notifying a post's author, without exposing the rest of the
    // profile. Defaults to true (fail-open) if the profile itself is
    // missing — this is a nice-to-have gate, not a security boundary, so an
    // edge case here should never be the reason a notification is dropped.
    public boolean isCommunityAlertsEnabled(String userId) {
        return profileRepository.findById(userId)
                .map(Profile::isCommunityAlerts)
                .orElse(true);
    }

    // Coming-soon roadmap item #6: lets notification-service decide whether
    // (and where) to send an email in one call, instead of two separate
    // lookups. Returns an empty map if the profile is missing — there's no
    // denormalized email to send to in that case regardless of the
    // preference, so this deliberately does NOT fail-open the way
    // isCommunityAlertsEnabled() does (nothing to fail open *to*).
    public Map<String, Object> getEmailPreference(String userId) {
        return profileRepository.findById(userId)
                .<Map<String, Object>>map(p -> Map.of(
                        "email", p.getEmail(),
                        "enabled", p.isEmailNotifications()))
                .orElse(Map.of());
    }

    // Added 2026-07-23 for pharmacy-service's stock/pricing ownership check
    // (see InternalProfileController.getPharmacy()'s javadoc). Uses
    // Map.of/HashMap rather than the same Map.of(...) one-liner as
    // getEmailPreference above because pharmacyId/pharmacyName can genuinely
    // be null (a profile exists but was never assigned a pharmacy) —
    // Map.of() throws NullPointerException on a null value, HashMap doesn't.
    public Map<String, Object> getPharmacyAssignment(String userId) {
        return profileRepository.findById(userId)
                .<Map<String, Object>>map(p -> {
                    Map<String, Object> result = new java.util.HashMap<>();
                    result.put("pharmacyId", p.getPharmacyId());
                    result.put("pharmacyName", p.getPharmacyName());
                    result.put("pharmacyRole", p.getPharmacyRole());
                    return result;
                })
                .orElse(Map.of());
    }

    public List<Appointment> getAppointments(String userId) {
        return appointmentRepository.findByUserIdOrderByAppointmentDateAsc(userId);
    }

    public Appointment bookAppointment(String userId, BookAppointmentRequest request) {
        Appointment appt = new Appointment();
        appt.setUserId(userId);
        appt.setProfessionalName(request.getProfessionalName());
        appt.setSpecialty(request.getSpecialty());
        appt.setAppointmentDate(LocalDate.parse(request.getAppointmentDate()));
        appt.setAppointmentTime(LocalTime.parse(request.getAppointmentTime()));
        return appointmentRepository.save(appt);
    }

    // Restored now that medication-service exists (was dropped during this
    // service's own extraction — see MICROSERVICES_PLAN.md §6 step 2). The
    // actual DoseLog row is created in medication-service, which owns that
    // data; this service only owns the derived dayStreak/adherenceRate
    // stats. NOT best-effort: if medication-service's call fails, this
    // throws rather than incrementing a streak for a dose that was never
    // actually recorded (see MedicationClient javadoc).
    public Map<String, Object> logDose(String userId, String medicationId) {
        medicationClient.logDose(userId, medicationId);

        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        int streak = profile.getDayStreak() != null ? profile.getDayStreak() + 1 : 1;
        profile.setDayStreak(streak);
        double adherence = Math.min(100, (profile.getAdherenceRate() != null ? profile.getAdherenceRate() : 0) + 2);
        profile.setAdherenceRate(adherence);
        profileRepository.save(profile);

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("dayStreak", streak);
        result.put("adherenceRate", adherence);
        return result;
    }

    // Restored alongside logDose() — same reasoning.
    public Map<String, Object> getAdherenceReport(String userId) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("adherenceRate", profile.getAdherenceRate());
        report.put("dayStreak", profile.getDayStreak());
        report.put("totalDosesLogged", medicationClient.getDoseCount(userId));
        report.put("activeMedications", medicationClient.getActiveMedicationCount(userId));
        return report;
    }

    // Added during chat-service extraction (step 5b) — replaces the
    // monolith's UserRepository.findByRoleAndPharmacyId /
    // findByRoleAndFullNameContainingIgnoreCase, which ChatService used to
    // call directly. Same two-mode filter logic as the original: pharmacyId
    // takes priority if present, otherwise falls back to name-contains.
    public List<Profile> searchByRole(String role, String pharmacyId, String name) {
        if (pharmacyId != null && !pharmacyId.isBlank()) {
            return profileRepository.findByRoleAndPharmacyId(role, pharmacyId);
        }
        return profileRepository.findByRoleAndFullNameContainingIgnoreCase(role, name == null ? "" : name);
    }

    // Added 2026-07-23 for the owner/manager dashboard's staff-list section —
    // every PHARMACIST profile assigned to a given pharmacy (owner + any
    // managers), shaped for direct display rather than exposing the whole
    // Profile entity. Reuses the same findByRoleAndPharmacyId query
    // searchByRole above already calls.
    public List<Map<String, Object>> getPharmacyStaff(String pharmacyId) {
        return profileRepository.findByRoleAndPharmacyId("PHARMACIST", pharmacyId).stream()
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("userId", p.getUserId());
                    m.put("fullName", p.getFullName());
                    m.put("email", p.getEmail());
                    m.put("pharmacyRole", p.getPharmacyRole());
                    return m;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    // Added during chat-service extraction (step 5b) — batch name lookup so
    // chat-service can resolve "other participant" display names for a
    // whole conversation list in one call instead of N calls.
    public Map<String, String> resolveNames(List<String> userIds) {
        return profileRepository.findAllById(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(Profile::getUserId, Profile::getFullName));
    }

    // Added 2026-07-24 for community-service's "health professional" post
    // badge (task: let pharmacist posts show a verified badge in the feed).
    // Reuses the same denormalized `role` copy resolveNames() reads
    // fullName from — see Profile's class javadoc for why that copy exists
    // and its staleness caveat (acceptable here for the same reasons).
    public Map<String, String> resolveRoles(List<String> userIds) {
        return profileRepository.findAllById(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(Profile::getUserId, Profile::getRole));
    }

    // ── Admin-service support (MICROSERVICES_PLAN.md §6 step 7c) ───────────

    // Lightweight projection — deliberately NOT returning full Profile rows
    // (bloodGroup/allergies/conditions etc.) for a "list everyone" endpoint.
    // Admin-service only needs display fields to build its user table;
    // auth-service is the authoritative source for email/role/enabled.
    public List<Map<String, Object>> getDirectory() {
        return profileRepository.findAll().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("userId", p.getUserId());
            m.put("fullName", p.getFullName());
            m.put("phoneNumber", p.getPhoneNumber());
            return m;
        }).collect(java.util.stream.Collectors.toList());
    }

    // Keeps the denormalized role copy (see Profile's class javadoc on
    // staleness) in sync when admin-service changes a user's role via
    // auth-service. Called best-effort by admin-service right after the
    // authoritative auth-service update — auth-service's User.role is still
    // the source of truth; this just prevents the copy from immediately
    // going stale on the one write path most likely to trigger it.
    public void updateDenormalizedRole(String userId, String role) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));
        profile.setRole(role);
        profileRepository.save(profile);
    }

    // Added 2026-07-23 for pharmacist provisioning (mirrors
    // updateDenormalizedRole exactly) — called by admin-service right after
    // it promotes a user to PHARMACIST, so this profile's pharmacyId/
    // pharmacyName (already-existing fields, previously never set by
    // anything) actually get populated. Without this, chat-service's
    // pharmacist search (the original reason these two fields exist at all —
    // see Profile's class javadoc) would have no way to know which pharmacy
    // a newly-promoted pharmacist belongs to.
    public void updateDenormalizedPharmacy(String userId, String pharmacyId, String pharmacyName) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));
        profile.setPharmacyId(pharmacyId);
        profile.setPharmacyName(pharmacyName);
        profileRepository.save(profile);
    }

    // Added 2026-07-23 — same pattern, extended to also carry the
    // OWNER/MANAGER tier (a pharmacy can now have multiple staff accounts).
    public void updateDenormalizedPharmacy(String userId, String pharmacyId, String pharmacyName, String pharmacyRole) {
        Profile profile = profileRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Profile not found"));
        profile.setPharmacyId(pharmacyId);
        profile.setPharmacyName(pharmacyName);
        profile.setPharmacyRole(pharmacyRole);
        profileRepository.save(profile);
    }

    // ── Saved locations (address book) ──────────────────────────────────────
    // New feature backing locationService.ts — see SavedLocation's class
    // javadoc for why it lives here rather than in a dedicated service.

    public List<Map<String, Object>> getSavedLocations(String userId) {
        return savedLocationRepository.findByUserIdOrderByIsDefaultDescNameAsc(userId).stream()
                .map(this::toSuggestion)
                .toList();
    }

    // Frontend's `searchLocations(query)` never passes a userId — it's meant
    // as a shared address lookup (same intent as its own local
    // POPULAR_LOCATIONS fallback), so this searches across every saved
    // location rather than one user's.
    public List<Map<String, Object>> searchLocations(String query) {
        return savedLocationRepository.search(query == null ? "" : query).stream()
                .map(this::toSuggestion)
                .toList();
    }

    public Map<String, Object> saveLocation(String userId, SaveLocationRequest request) {
        SavedLocation location = new SavedLocation();
        location.setUserId(userId);
        location.setName(request.getName());
        location.setAddress(request.getAddress());
        location.setCity(request.getCity());
        location.setRegion(request.getRegion());
        location.setCountry(request.getCountry());
        if (request.getCoordinates() != null) {
            location.setLatitude(request.getCoordinates().getLatitude());
            location.setLongitude(request.getCoordinates().getLongitude());
        }
        boolean makeDefault = Boolean.TRUE.equals(request.getIsDefault());
        location.setDefault(makeDefault);

        if (makeDefault) {
            clearExistingDefault(userId);
        }

        return toLocation(savedLocationRepository.save(location));
    }

    public void deleteLocation(String userId, String locationId) {
        SavedLocation location = savedLocationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        if (!location.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Location not found");
        }
        savedLocationRepository.delete(location);
    }

    public void setDefaultLocation(String userId, String locationId) {
        SavedLocation target = savedLocationRepository.findById(locationId)
                .orElseThrow(() -> new IllegalArgumentException("Location not found"));
        if (!target.getUserId().equals(userId)) {
            throw new IllegalArgumentException("Location not found");
        }
        clearExistingDefault(userId);
        target.setDefault(true);
        savedLocationRepository.save(target);
    }

    private void clearExistingDefault(String userId) {
        savedLocationRepository.findByUserIdOrderByIsDefaultDescNameAsc(userId).stream()
                .filter(SavedLocation::isDefault)
                .forEach(l -> {
                    l.setDefault(false);
                    savedLocationRepository.save(l);
                });
    }

    // Shape matches the frontend's LocationSuggestion type (id, name,
    // address, city, region, type) — used by getSavedLocations/search.
    private Map<String, Object> toSuggestion(SavedLocation l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("name", l.getName());
        m.put("address", l.getAddress());
        m.put("city", l.getCity());
        m.put("region", l.getRegion());
        m.put("type", "saved");
        return m;
    }

    // Shape matches the frontend's full Location type (id, name, address,
    // city, region, country, coordinates, isDefault) — used by saveLocation,
    // which the frontend types as returning Promise<Location>.
    private Map<String, Object> toLocation(SavedLocation l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.getId());
        m.put("name", l.getName());
        m.put("address", l.getAddress());
        m.put("city", l.getCity());
        m.put("region", l.getRegion());
        m.put("country", l.getCountry());
        if (l.getLatitude() != null && l.getLongitude() != null) {
            Map<String, Object> coords = new LinkedHashMap<>();
            coords.put("latitude", l.getLatitude());
            coords.put("longitude", l.getLongitude());
            m.put("coordinates", coords);
        }
        m.put("isDefault", l.isDefault());
        return m;
    }
}
