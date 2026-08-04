package com.pharmalink.pharmacy_service.config;

import com.pharmalink.pharmacy_service.model.Pharmacy;
import com.pharmalink.pharmacy_service.repository.PharmacyRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * Moved as-is from the monolith's config/DataInitializer.java (the
 * seedPharmacies() block only) — same real Ghanaian pharmacy data, same
 * idempotent skip-if-already-seeded behavior. The monolith's DataInitializer
 * no longer seeds pharmacies; it lost its PharmacyRepository entirely once
 * Pharmacy moved here.
 */
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(PharmacyRepository pharmacyRepository) {
        return args -> {
            seedPharmacies(pharmacyRepository);
            System.out.println("✅ Pharmacy-service data ready.");
        };
    }

    private void seedPharmacies(PharmacyRepository repo) {
        if (repo.count() > 0) return;

        List<Pharmacy> pharmacies = new ArrayList<>();

        // ── GREATER ACCRA ──────────────────────────────────────────────────────
        pharmacies.add(ph("Ernest Chemists – Osu Oxford Street",
            "No. 6 Oxford Street, Osu, Accra", "Accra", "Greater Accra",
            5.5571, -0.1768, "+233 30 278 5001", "Mon–Sat 7 AM – 10 PM, Sun 8 AM – 8 PM",
            4.6, 312, services("Prescription", "OTC Medications", "Blood Pressure Check", "Vaccination"),
            "One of Accra's most trusted pharmacies on the busy Osu Oxford Street.", true, true));

        pharmacies.add(ph("Pharmacy Plus – East Legon",
            "A&C Mall, East Legon, Accra", "Accra", "Greater Accra",
            5.6337, -0.1570, "+233 30 393 1111", "Mon–Sun 8 AM – 10 PM",
            4.5, 198, services("Prescription", "OTC Medications", "Cosmetics", "Baby Care"),
            "Modern pharmacy inside A&C Mall with a wide product range.", true, true));

        pharmacies.add(ph("Melcom Pharmacy – Achimota",
            "Achimota Retail Centre, Accra", "Accra", "Greater Accra",
            5.6122, -0.2284, "+233 30 240 2030", "Mon–Sun 9 AM – 9 PM",
            4.2, 145, services("Prescription", "OTC Medications", "Medical Devices"),
            "Convenient pharmacy within Melcom retail complex.", true, true));

        pharmacies.add(ph("Trust Pharmacy – Lapaz",
            "Lapaz Main Road, Accra", "Accra", "Greater Accra",
            5.6100, -0.2517, "+233 24 456 7890", "Mon–Sat 7 AM – 9 PM, Sun 9 AM – 5 PM",
            4.1, 87, services("Prescription", "OTC Medications", "Health Consultation"),
            "Community pharmacy serving the Lapaz and Abeka areas.", true, false));

        pharmacies.add(ph("Quality First Pharmacy – Tema",
            "Community 1, Tema", "Tema", "Greater Accra",
            5.6698, -0.0166, "+233 30 320 4567", "Mon–Sun 7 AM – 9 PM",
            4.3, 167, services("Prescription", "OTC Medications", "Health Screening", "Vaccination"),
            "Well-stocked pharmacy in the heart of Tema.", true, true));

        pharmacies.add(ph("Korle-Bu Teaching Hospital Pharmacy",
            "Korle-Bu, Accra", "Accra", "Greater Accra",
            5.5474, -0.2294, "+233 30 266 3222", "Mon–Fri 8 AM – 5 PM",
            4.4, 421, services("Prescription", "Specialist Medications", "Oncology Drugs", "Health Consultation"),
            "Hospital pharmacy at Ghana's premier teaching hospital.", true, false));

        pharmacies.add(ph("Healthway Pharmacy – Adenta",
            "Adenta Municipal Market, Accra", "Accra", "Greater Accra",
            5.7099, -0.1561, "+233 26 543 2100", "Mon–Fri 8 AM – 8 PM, Sat 8 AM – 6 PM",
            4.2, 93, services("Prescription", "OTC Medications", "Baby Care", "Vitamins"),
            "Friendly community pharmacy in Adenta.", true, true));

        pharmacies.add(ph("Nthc Pharmacy – Madina",
            "Madina Market Road, Accra", "Accra", "Greater Accra",
            5.6776, -0.1681, "+233 24 678 1234", "Mon–Sat 7 AM – 9 PM, Sun 9 AM – 5 PM",
            4.0, 109, services("Prescription", "OTC Medications", "Blood Pressure Check"),
            "Popular pharmacy at Madina market junction.", false, true));

        // ── ASHANTI ────────────────────────────────────────────────────────────
        pharmacies.add(ph("Adum Pharmacy – Kumasi Central",
            "Adum Commercial Area, Kumasi", "Kumasi", "Ashanti",
            6.6885, -1.6244, "+233 32 202 3456", "Mon–Sat 7:30 AM – 8:30 PM, Sun 9 AM – 3 PM",
            4.4, 254, services("Prescription", "OTC Medications", "Traditional Medicine", "Health Consultation"),
            "Well-established pharmacy in the commercial heart of Kumasi.", true, true));

        pharmacies.add(ph("Komfo Anokye Teaching Hospital Pharmacy",
            "Hospital Road, Kumasi", "Kumasi", "Ashanti",
            6.6948, -1.6252, "+233 32 202 2301", "Mon–Fri 8 AM – 5 PM",
            4.5, 386, services("Prescription", "Specialist Medications", "Inpatient Supply"),
            "Official pharmacy of Komfo Anokye Teaching Hospital.", true, false));

        pharmacies.add(ph("Nhyira Pharmacy – Manhyia",
            "Manhyia Road, Kumasi", "Kumasi", "Ashanti",
            6.7082, -1.6182, "+233 32 208 7654", "Mon–Sat 8 AM – 8 PM",
            4.0, 118, services("Prescription", "OTC Medications", "Cosmetics"),
            "Busy neighbourhood pharmacy near Manhyia Palace.", false, true));

        // ── WESTERN ────────────────────────────────────────────────────────────
        pharmacies.add(ph("Sekondi-Takoradi Pharmacy",
            "Harbour Road, Takoradi", "Takoradi", "Western",
            4.8993, -1.7571, "+233 31 202 1234", "Mon–Sat 8 AM – 7 PM",
            4.1, 88, services("Prescription", "OTC Medications", "Vitamins"),
            "Serving Ghana's oil city and port area.", true, true));

        pharmacies.add(ph("Western Medilab Pharmacy – Takoradi",
            "Market Circle, Takoradi", "Takoradi", "Western",
            4.8945, -1.7537, "+233 31 202 6780", "Mon–Sat 7 AM – 8 PM, Sun 9 AM – 4 PM",
            4.0, 61, services("Prescription", "OTC Medications", "Lab Services"),
            "Combined pharmacy and diagnostics lab in Market Circle.", false, true));

        // ── CENTRAL ────────────────────────────────────────────────────────────
        pharmacies.add(ph("Cape Coast Teaching Hospital Pharmacy",
            "University Post Office Road, Cape Coast", "Cape Coast", "Central",
            5.1053, -1.2466, "+233 33 213 4567", "Mon–Fri 8 AM – 5 PM",
            4.3, 132, services("Prescription", "OTC Medications", "Student Health", "Health Screening"),
            "Main pharmacy serving Cape Coast Teaching Hospital and university community.", true, false));

        // ── NORTHERN ───────────────────────────────────────────────────────────
        pharmacies.add(ph("Tamale Teaching Hospital Pharmacy",
            "Hospital Road, Tamale", "Tamale", "Northern",
            9.4034, -0.8424, "+233 37 202 8901", "Mon–Fri 8 AM – 5 PM",
            4.2, 178, services("Prescription", "Specialist Medications", "Vaccination", "Health Consultation"),
            "The main referral hospital pharmacy for Northern Ghana.", true, false));

        pharmacies.add(ph("Northern Health Pharmacy – Tamale",
            "Central Market Area, Tamale", "Tamale", "Northern",
            9.4007, -0.8385, "+233 37 201 3400", "Mon–Sat 8 AM – 7 PM, Sun 9 AM – 3 PM",
            3.8, 65, services("Prescription", "OTC Medications", "Health Consultation"),
            "Community pharmacy serving the Tamale central market area.", false, true));

        // ── UPPER EAST ─────────────────────────────────────────────────────────
        pharmacies.add(ph("Bolgatanga Regional Hospital Pharmacy",
            "Hospital Road, Bolgatanga", "Bolgatanga", "Upper East",
            10.7856, -0.8514, "+233 38 202 2200", "Mon–Fri 8 AM – 5 PM",
            4.0, 92, services("Prescription", "OTC Medications", "Vaccination"),
            "Regional hospital pharmacy serving the Upper East Region.", true, false));

        // ── VOLTA ──────────────────────────────────────────────────────────────
        pharmacies.add(ph("Ho Teaching Hospital Pharmacy",
            "Sokode Road, Ho", "Ho", "Volta",
            6.6019, 0.4714, "+233 36 202 7100", "Mon–Fri 8 AM – 5 PM",
            4.1, 103, services("Prescription", "Specialist Medications", "Health Consultation"),
            "Teaching hospital pharmacy serving the Volta Region.", true, false));

        // ── EASTERN ────────────────────────────────────────────────────────────
        pharmacies.add(ph("Koforidua Regional Hospital Pharmacy",
            "Koforidua-Effiduase Road, Koforidua", "Koforidua", "Eastern",
            6.0953, -0.2578, "+233 34 202 2400", "Mon–Fri 8 AM – 5 PM",
            4.2, 144, services("Prescription", "OTC Medications", "Vaccination", "Health Consultation"),
            "Regional hospital pharmacy for the Eastern Region.", true, false));

        // ── BONO ───────────────────────────────────────────────────────────────
        pharmacies.add(ph("Sunyani Regional Hospital Pharmacy",
            "Dormaa Road, Sunyani", "Sunyani", "Bono",
            7.3349, -2.3274, "+233 35 202 7700", "Mon–Fri 8 AM – 5 PM",
            4.0, 89, services("Prescription", "OTC Medications", "Vaccination"),
            "Hospital pharmacy serving the Bono Region.", true, false));

        List<Pharmacy> saved = repo.saveAll(pharmacies);
        System.out.println("✅ Seeded " + saved.size() + " pharmacies.");
    }

    private Pharmacy ph(String name, String address, String city, String region,
                        double lat, double lng, String phone, String openHours,
                        double rating, int reviewCount, List<String> svc,
                        String description, boolean verified, boolean isOpen) {
        Pharmacy p = new Pharmacy();
        p.setName(name);
        p.setAddress(address);
        p.setCity(city);
        p.setRegion(region);
        p.setLatitude(lat);
        p.setLongitude(lng);
        p.setPhone(phone);
        p.setOpenHours(openHours);
        p.setRating(rating);
        p.setReviewCount(reviewCount);
        p.setServices(svc);
        p.setDescription(description);
        p.setVerified(verified);
        p.setOpen(isOpen);
        return p;
    }

    private List<String> services(String... values) {
        return new ArrayList<>(List.of(values));
    }
}
