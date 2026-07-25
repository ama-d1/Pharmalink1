package com.pharmalink.pharmacy_service.client;

import com.pharmalink.pharmacy_service.model.Pharmacy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Added 2026-07-24 to close task 63 ("Find Pharmacy" was only ever showing
 * the 3 hand-seeded rows from DataInitializer, regardless of where the user
 * actually is). Google Places was the first choice but requires a Google
 * Cloud BILLING ACCOUNT (a card on file) even to stay within its free tier
 * — the user doesn't have a card, so that's a hard blocker. OpenStreetMap's
 * Overpass API needs no API key, no card, and no account at all, in
 * exchange for two real tradeoffs the user was told about and accepted:
 *   1. Coverage is crowd-sourced, so it can be sparser than Google in some
 *      areas (better in well-mapped cities, worse in rural/underserved ones).
 *   2. These are informational pins only, NOT PharmaLink-registered
 *      pharmacies — they have no stock, no checkout, no pharmacist account
 *      behind them. See PharmacyService.getNearbyPharmacies() and the
 *      frontend's handling of `source: "osm"` for how that distinction is
 *      preserved end-to-end instead of silently pretending they're orderable.
 *
 * Best-effort by design: Overpass is a shared public instance with no SLA
 * (can be slow or briefly down), so every failure mode here degrades to an
 * empty list rather than breaking the nearby-pharmacies screen — the
 * request's own DB-backed registered pharmacies still return normally.
 */
@Component
public class OverpassClient {

    private static final Logger log = LoggerFactory.getLogger(OverpassClient.class);
    private static final String ENDPOINT = "https://overpass-api.de/api/interpreter";

    private final RestClient restClient;

    public OverpassClient() {
        // Overpass's public instance can be slow under load — a generous but
        // bounded timeout so a slow response degrades this one feature
        // instead of hanging the whole /nearby request indefinitely.
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    /**
     * Queries every node/way tagged amenity=pharmacy within radiusKm of the
     * given point. Returns plain (unsaved, non-persisted) Pharmacy objects —
     * reusing the JPA entity purely as a convenient response shape, exactly
     * like every other read path in this service already does via
     * pharmacyToMap(); these are never passed to the repository.
     */
    @SuppressWarnings("unchecked")
    public List<Pharmacy> fetchNearbyPharmacies(double lat, double lng, double radiusKm) {
        double radiusMeters = radiusKm * 1000;
        String query = String.format(Locale.ROOT,
            "[out:json][timeout:12];(node[\"amenity\"=\"pharmacy\"](around:%.0f,%f,%f);" +
            "way[\"amenity\"=\"pharmacy\"](around:%.0f,%f,%f););out center %d;",
            radiusMeters, lat, lng, radiusMeters, lat, lng, 40);

        try {
            Map<String, Object> body = restClient.get()
                .uri(ENDPOINT + "?data={data}", query)
                .retrieve()
                .body(Map.class);

            if (body == null || !(body.get("elements") instanceof List)) return List.of();
            List<Map<String, Object>> elements = (List<Map<String, Object>>) body.get("elements");

            List<Pharmacy> results = new ArrayList<>();
            for (Map<String, Object> el : elements) {
                Pharmacy p = elementToPharmacy(el);
                if (p != null) results.add(p);
            }
            return results;
        } catch (RestClientException | ClassCastException e) {
            log.warn("Overpass nearby-pharmacy lookup failed (lat={}, lng={}, radiusKm={}): {}",
                lat, lng, radiusKm, e.getMessage());
            return List.of();
        }
    }

    @SuppressWarnings("unchecked")
    private Pharmacy elementToPharmacy(Map<String, Object> el) {
        Object latObj = el.get("lat");
        Object lonObj = el.get("lon");
        // Ways (buildings) don't carry a direct lat/lon — Overpass's
        // "out center" clause adds a computed centroid under "center"
        // instead, for exactly this case.
        if (latObj == null && el.get("center") instanceof Map) {
            Map<String, Object> center = (Map<String, Object>) el.get("center");
            latObj = center.get("lat");
            lonObj = center.get("lon");
        }
        if (latObj == null || lonObj == null) return null;

        Map<String, Object> tags = el.get("tags") instanceof Map
            ? (Map<String, Object>) el.get("tags") : Map.of();

        Pharmacy p = new Pharmacy();
        p.setId("osm-" + el.get("type") + "-" + el.get("id"));
        p.setName(str(tags.get("name"), "Pharmacy"));
        p.setAddress(buildAddress(tags));
        p.setCity(str(tags.get("addr:city"), null));
        p.setRegion(str(tags.get("addr:state"), null));
        p.setLatitude(((Number) latObj).doubleValue());
        p.setLongitude(((Number) lonObj).doubleValue());
        p.setPhone(str(tags.get("phone"), str(tags.get("contact:phone"), null)));
        p.setWebsite(str(tags.get("website"), null));
        p.setOpenHours(str(tags.get("opening_hours"), "Hours not listed"));
        p.setRating(0);
        p.setReviewCount(0);
        p.setServices(List.of());
        p.setVerified(false);
        // Unknown open/closed state (Overpass gives a raw opening_hours
        // string, not a live yes/no) — default to true rather than false so
        // these don't all wrongly show a red "Closed" badge in the list.
        p.setOpen(true);
        return p;
    }

    private String buildAddress(Map<String, Object> tags) {
        String houseNumber = str(tags.get("addr:housenumber"), null);
        String street = str(tags.get("addr:street"), null);
        if (street != null) {
            return houseNumber != null ? houseNumber + " " + street : street;
        }
        String city = str(tags.get("addr:city"), null);
        return city != null ? "Near " + city : "Nearby (exact address not mapped)";
    }

    private String str(Object o, String fallback) {
        if (o == null) return fallback;
        String s = o.toString().trim();
        return s.isEmpty() ? fallback : s;
    }
}
