package com.PHARMALINK1.server.controller;

import com.PHARMALINK1.server.service.DrugCatalogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

/**
 * DrugSearchController
 *
 * Proxies the OpenFDA Drug Label API so the mobile app never contacts an
 * external API directly (avoids CORS, normalises the response shape, and
 * keeps rate-limit handling server-side).
 *
 * Endpoints
 * ---------
 *   GET /api/drugs/search?q=paracetamol&limit=10
 *       Full drug-info search (brand name, generic name, indications, etc.)
 *
 *   GET /api/drugs/suggest?q=para&limit=8
 *       Fast autocomplete — local catalog first, supplemented by OpenFDA.
 *
 *   GET /api/drugs/catalog
 *       Returns the locally seeded drug catalog (no external call).
 *
 * OpenFDA API docs : https://open.fda.gov/apis/drug/label/
 * Rate limit       : 240 req/min without an API key (sufficient for dev).
 */
@RestController
@RequestMapping("/api/drugs")
@CrossOrigin(origins = "*")
public class DrugSearchController {

    private static final Logger log = LoggerFactory.getLogger(DrugSearchController.class);
    private static final String OPENFDA_BASE = "https://api.fda.gov/drug/label.json";

    // Typed reference avoids raw Map casts when calling exchange()
    private static final ParameterizedTypeReference<Map<String, Object>> FDA_RESPONSE_TYPE =
        new ParameterizedTypeReference<>() {};

    private final DrugCatalogService drugCatalogService;
    private final RestTemplate restTemplate;

    public DrugSearchController(DrugCatalogService drugCatalogService) {
        this.drugCatalogService = drugCatalogService;

        // Spring Framework 7 / Spring Boot 4: use JdkClientHttpRequestFactory
        // with java.net.http.HttpClient for proper timeout support.
        // SimpleClientHttpRequestFactory.setConnectTimeout(int) / setReadTimeout(int)
        // were removed in Spring Framework 7.
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(4))
            .build();

        org.springframework.http.client.JdkClientHttpRequestFactory factory =
            new org.springframework.http.client.JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(8));

        this.restTemplate = new RestTemplate(factory);
    }

    // ── GET /api/drugs/search ─────────────────────────────────────────────────

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> search(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "10") int limit) {

        if (q == null || q.isBlank()) {
            return ResponseEntity.ok(List.of());
        }

        String query = q.trim();

        try {
            // OpenFDA Lucene OR: space-separated terms = OR, "+" = AND (required).
            // Using a space between clauses gives results matching EITHER field.
            String searchExpr = String.format(
                "(openfda.brand_name:\"%s\" openfda.generic_name:\"%s\")",
                query, query
            );

            String url = UriComponentsBuilder.fromUriString(OPENFDA_BASE)
                .queryParam("search", searchExpr)
                .queryParam("limit", Math.min(limit, 20))
                .toUriString();

            ResponseEntity<Map<String, Object>> fdaResponse =
                restTemplate.exchange(url, HttpMethod.GET, null, FDA_RESPONSE_TYPE);

            if (!fdaResponse.getStatusCode().is2xxSuccessful() || fdaResponse.getBody() == null) {
                return ResponseEntity.ok(drugCatalogService.searchLocal(query));
            }

            List<Map<String, Object>> normalised = normaliseFdaResults(fdaResponse.getBody());
            return ResponseEntity.ok(normalised.isEmpty()
                ? drugCatalogService.searchLocal(query)
                : normalised);

        } catch (Exception e) {
            log.warn("OpenFDA /search failed for '{}': {}. Using local catalog.", query, e.getMessage());
            return ResponseEntity.ok(drugCatalogService.searchLocal(query));
        }
    }

    // ── GET /api/drugs/suggest ────────────────────────────────────────────────

    @GetMapping("/suggest")
    public ResponseEntity<List<Map<String, String>>> suggest(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "8") int limit) {

        if (q == null || q.isBlank() || q.trim().length() < 2) {
            return ResponseEntity.ok(List.of());
        }

        String query = q.trim();

        // 1. DB read is done first — transaction closes before the HTTP call
        List<Map<String, String>> localResults =
            drugCatalogService.getLocalSuggestions(query, limit);

        if (localResults.size() >= limit) {
            return ResponseEntity.ok(localResults);
        }

        // 2. Supplement with OpenFDA — no DB connection held during this call
        try {
            String url = UriComponentsBuilder.fromUriString(OPENFDA_BASE)
                .queryParam("search", "openfda.generic_name:\"" + query + "\"")
                .queryParam("limit", limit - localResults.size())
                .toUriString();

            ResponseEntity<Map<String, Object>> fdaResponse =
                restTemplate.exchange(url, HttpMethod.GET, null, FDA_RESPONSE_TYPE);

            if (fdaResponse.getStatusCode().is2xxSuccessful() && fdaResponse.getBody() != null) {
                localResults.addAll(extractSuggestions(fdaResponse.getBody()));
            }
        } catch (Exception e) {
            log.debug("OpenFDA /suggest supplemental call failed: {}", e.getMessage());
        }

        return ResponseEntity.ok(localResults);
    }

    // ── GET /api/drugs/catalog ────────────────────────────────────────────────

    @GetMapping("/catalog")
    public ResponseEntity<List<Map<String, Object>>> getCatalog() {
        return ResponseEntity.ok(drugCatalogService.getCatalog());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Converts raw OpenFDA drug label results into frontend-friendly maps.
     * Skips any entry that cannot be safely processed rather than throwing.
     */
    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> normaliseFdaResults(Map<String, Object> body) {
        List<Map<String, Object>> results = new ArrayList<>();
        Object resultsObj = body.get("results");
        if (!(resultsObj instanceof List<?> list)) return results;

        for (Object item : list) {
            if (!(item instanceof Map<?, ?> rawEntry)) continue;
            try {
                Map<String, Object> entry = (Map<String, Object>) rawEntry;

                Object openfdaRaw = entry.get("openfda");
                Map<String, Object> openfda = (openfdaRaw instanceof Map<?, ?>)
                    ? (Map<String, Object>) openfdaRaw
                    : Collections.emptyMap();

                Map<String, Object> normalised = new LinkedHashMap<>();
                normalised.put("id",               getFirst(openfda, "application_number", UUID.randomUUID().toString()));
                normalised.put("name",             getFirst(openfda, "brand_name",         "Unknown"));
                normalised.put("genericName",      getFirst(openfda, "generic_name",       ""));
                normalised.put("manufacturer",     getFirst(openfda, "manufacturer_name",  ""));
                normalised.put("route",            getFirst(openfda, "route",              ""));
                normalised.put("dosageForm",       getFirst(openfda, "dosage_form",        ""));

                String purpose     = getFirstFromList(entry, "purpose");
                String description = getFirstFromList(entry, "description");
                normalised.put("purpose",            purpose.isEmpty() ? description : purpose);
                normalised.put("indications",        getFirstFromList(entry, "indications_and_usage"));
                normalised.put("warnings",           getFirstFromList(entry, "warnings"));
                normalised.put("dosageInstructions", getFirstFromList(entry, "dosage_and_administration"));
                normalised.put("source",             "openFDA");

                results.add(normalised);
            } catch (ClassCastException e) {
                log.debug("Skipping malformed FDA result entry: {}", e.getMessage());
            }
        }
        return results;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, String>> extractSuggestions(Map<String, Object> body) {
        List<Map<String, String>> suggestions = new ArrayList<>();
        Object resultsObj = body.get("results");
        if (!(resultsObj instanceof List<?> list)) return suggestions;

        for (Object item : list) {
            if (!(item instanceof Map<?, ?> rawEntry)) continue;
            try {
                Map<String, Object> entry   = (Map<String, Object>) rawEntry;
                Object openfdaRaw           = entry.get("openfda");
                Map<String, Object> openfda = (openfdaRaw instanceof Map<?, ?>)
                    ? (Map<String, Object>) openfdaRaw
                    : Collections.emptyMap();

                String name    = getFirst(openfda, "brand_name",   "");
                String generic = getFirst(openfda, "generic_name", "");
                if (name.isEmpty() && generic.isEmpty()) continue;

                Map<String, String> s = new LinkedHashMap<>();
                s.put("id",          getFirst(openfda, "application_number", UUID.randomUUID().toString()));
                s.put("name",        name.isEmpty() ? generic : name);
                s.put("genericName", generic);
                s.put("source",      "openFDA");
                suggestions.add(s);
            } catch (ClassCastException e) {
                log.debug("Skipping malformed FDA suggestion entry: {}", e.getMessage());
            }
        }
        return suggestions;
    }

    /**
     * Safely extracts the first element of a List-valued field from an OpenFDA map.
     * Returns {@code fallback} if the key is absent, null, or not a list.
     */
    private String getFirst(Map<String, Object> map, String key, String fallback) {
        Object val = map.get(key);
        if (val instanceof List<?> list && !list.isEmpty()) {
            return String.valueOf(list.get(0));
        }
        if (val instanceof String s) return s;
        return fallback;
    }

    /**
     * Extracts and truncates the first element of a list field from an FDA entry.
     * Returns an empty string if the field is absent or not a list.
     */
    private String getFirstFromList(Map<String, Object> entry, String key) {
        Object val = entry.get(key);
        if (val instanceof List<?> list && !list.isEmpty()) {
            String raw = String.valueOf(list.get(0));
            return raw.length() > 500 ? raw.substring(0, 500) + "..." : raw;
        }
        return "";
    }
}
