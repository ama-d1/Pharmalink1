package com.PHARMALINK1.server.config;

import com.PHARMALINK1.server.model.*;
import com.PHARMALINK1.server.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

/**
 * DataInitializer — single seed runner.
 * Runs once at startup; all blocks are idempotent (skip if data already exists).
 */
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(
            PharmacyRepository pharmacyRepository,
            HealthTipRepository healthTipRepository,
            DrugCatalogRepository drugCatalogRepository,
            CommunityRepository communityRepository) {
        return args -> {
            seedHealthTips(healthTipRepository);
            seedPharmacies(pharmacyRepository);
            seedDrugCatalog(drugCatalogRepository);
            seedCommunities(communityRepository);
            System.out.println("✅ PharmaLink data ready.");
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  1. HEALTH TIPS — WHO & Ghana Health Service guidelines
    // ═══════════════════════════════════════════════════════════════════════════

    private void seedHealthTips(HealthTipRepository repo) {
        if (repo.count() > 0) return;

        List<HealthTip> tips = List.of(
            new HealthTip("Drink at least 8 glasses (about 2 litres) of water daily. Staying hydrated helps your kidneys flush out toxins and keeps medications working effectively.", "Hydration"),
            new HealthTip("Always complete your full antibiotic course even if you feel better. Stopping early can cause antibiotic resistance, making future infections harder to treat.", "Medication Safety"),
            new HealthTip("Store medications in a cool, dry place away from direct sunlight. Heat and humidity — especially common in Ghana — can degrade medicines faster than their expiry date.", "Medication Storage"),
            new HealthTip("Malaria is preventable. Sleep under an insecticide-treated net every night and seek treatment within 24 hours of fever onset.", "Malaria Prevention"),
            new HealthTip("Wash your hands with soap and running water for at least 20 seconds before eating and after using the toilet. Handwashing prevents up to 80% of common infections.", "Hygiene"),
            new HealthTip("Never share prescription medications with family or friends. Medicines are prescribed for your specific weight, condition, and organ function.", "Medication Safety"),
            new HealthTip("High blood pressure often has no symptoms. Adults should check their blood pressure at least once a year. Many pharmacies in Ghana offer free BP checks.", "Heart Health"),
            new HealthTip("Eat more locally-grown fruits and vegetables — plantain, garden eggs, kontomire, and tomatoes are rich in vitamins and antioxidants that support immune function.", "Nutrition"),
            new HealthTip("Exclusive breastfeeding for the first 6 months gives your baby the best protection against infections and supports healthy brain development.", "Child Health"),
            new HealthTip("Type 2 diabetes is rising in Ghana. Reduce intake of sugary drinks and white rice, exercise for 30 minutes most days, and get your blood sugar tested annually.", "Diabetes Prevention"),
            new HealthTip("Do not crush or split tablets unless advised by your pharmacist. Some formulations are designed for slow release and crushing them can cause dangerous overdoses.", "Medication Safety"),
            new HealthTip("HIV can be treated. People living with HIV who take antiretroviral therapy (ART) as prescribed can live long, healthy lives and prevent transmission to partners.", "HIV & AIDS"),
            new HealthTip("Childhood vaccinations are free at all government health facilities in Ghana. Vaccines protect against measles, polio, diphtheria, tetanus, and other serious diseases.", "Vaccination"),
            new HealthTip("Symptoms of malaria — fever, chills, headache, and vomiting — can appear 7 to 30 days after a mosquito bite. Do not self-medicate; get a rapid diagnostic test.", "Malaria"),
            new HealthTip("Regular physical activity — even brisk walking for 30 minutes five days a week — reduces the risk of heart disease, diabetes, and depression.", "Exercise"),
            new HealthTip("If you are pregnant, take your iron and folic acid supplements daily as prescribed. These prevent anaemia and neural tube defects in your baby.", "Maternal Health"),
            new HealthTip("Oral rehydration solution (ORS) is life-saving for diarrhoea. Mix one ORS sachet with 1 litre of clean water. It is available free at CHPS compounds.", "Diarrhoea"),
            new HealthTip("Check your medication label for the expiry date before taking it. Expired medicines may have lost their potency or developed harmful breakdown products.", "Medication Safety"),
            new HealthTip("Over-the-counter painkillers like ibuprofen should be taken with food to protect your stomach lining. Do not exceed the recommended dose.", "Pain Management"),
            new HealthTip("Mental health matters. Stress, anxiety, and depression are real medical conditions. Speak to a healthcare worker — treatment is available and effective.", "Mental Health"),
            new HealthTip("Sickle cell disease affects 2% of Ghana's population. Couples planning a family should consider sickle cell genetic counselling.", "Genetic Health"),
            new HealthTip("Keep a list of all your current medications, including herbal remedies, on your phone. Show this list to every healthcare provider you visit.", "Medication Management"),
            new HealthTip("Children under 5 and pregnant women should use long-lasting insecticidal nets (LLINs) consistently. Free nets are distributed through ante-natal clinics.", "Malaria Prevention"),
            new HealthTip("Tuberculosis (TB) is curable with 6 months of free treatment available at all government hospitals. If you have a persistent cough for more than 2 weeks, get tested.", "Tuberculosis"),
            new HealthTip("Do not dispose of unused medicines in gutters or drains. Return them to a pharmacy for safe disposal to prevent water contamination.", "Environmental Health")
        );
        repo.saveAll(tips);
        System.out.println("✅ Seeded " + tips.size() + " health tips.");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  2. PHARMACIES — Real Ghanaian pharmacies with GPS coordinates
    // ═══════════════════════════════════════════════════════════════════════════

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

        // Save all pharmacies
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
        p.setServices(svc);          // already mutable ArrayList
        p.setDescription(description);
        p.setVerified(verified);
        p.setOpen(isOpen);
        return p;
    }

    /** Returns a mutable ArrayList (required for JPA @ElementCollection). */
    private List<String> services(String... values) {
        return new ArrayList<>(List.of(values));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  3. DRUG CATALOG — Ghana Essential Medicines List
    // ═══════════════════════════════════════════════════════════════════════════

    private void seedDrugCatalog(DrugCatalogRepository repo) {
        if (repo.count() > 0) return;

        List<DrugCatalog> drugs = List.of(
            new DrugCatalog("Artemether-Lumefantrine (Coartem) 20/120mg",
                "First-line treatment for uncomplicated Plasmodium falciparum malaria. 6-dose course over 3 days.", 18.50),
            new DrugCatalog("Artesunate + Amodiaquine (ASAQ) 100/270mg",
                "Fixed-dose combination for malaria treatment, widely used in Ghana.", 14.00),
            new DrugCatalog("Paracetamol 500mg Tablets",
                "Analgesic and antipyretic for mild-to-moderate pain and fever. Non-prescription.", 2.50),
            new DrugCatalog("Amoxicillin 500mg Capsules",
                "Broad-spectrum penicillin antibiotic for respiratory, ear, and urinary tract infections.", 12.00),
            new DrugCatalog("Metronidazole 400mg Tablets",
                "Antibiotic and antiprotozoal for bacterial vaginosis, giardia, and amoebic infections.", 8.00),
            new DrugCatalog("Ciprofloxacin 500mg Tablets",
                "Fluoroquinolone antibiotic for urinary, respiratory, and gastrointestinal infections.", 22.00),
            new DrugCatalog("Cotrimoxazole (Bactrim) 480mg Tablets",
                "Sulfonamide combination antibiotic; also used for HIV-related opportunistic infection prophylaxis.", 6.00),
            new DrugCatalog("Oral Rehydration Salts (ORS) Sachet",
                "WHO-formulated electrolyte replacement for diarrhoea dehydration. Mix with 1 litre of clean water.", 1.50),
            new DrugCatalog("Zinc Sulphate 20mg Dispersible Tablets",
                "Adjunct treatment for childhood diarrhoea; reduces severity and duration.", 3.00),
            new DrugCatalog("Ferrous Sulphate + Folic Acid 200/0.4mg",
                "Iron and folic acid supplement for pregnancy and iron-deficiency anaemia.", 5.00),
            new DrugCatalog("Mebendazole 500mg Tablets",
                "Broad-spectrum anthelmintic for intestinal worm infections (ascariasis, hookworm).", 4.50),
            new DrugCatalog("Amlodipine 5mg Tablets",
                "Calcium channel blocker for hypertension and angina. Once daily.", 9.00),
            new DrugCatalog("Lisinopril 10mg Tablets",
                "ACE inhibitor for hypertension, heart failure, and diabetic nephropathy.", 11.00),
            new DrugCatalog("Hydrochlorothiazide 25mg Tablets",
                "Thiazide diuretic for hypertension and oedema.", 7.00),
            new DrugCatalog("Atenolol 50mg Tablets",
                "Beta-blocker for hypertension, angina, and cardiac arrhythmias.", 8.50),
            new DrugCatalog("Metformin 500mg Tablets",
                "First-line oral hypoglycaemic for type 2 diabetes. Reduces hepatic glucose production.", 10.00),
            new DrugCatalog("Glibenclamide 5mg Tablets",
                "Sulphonylurea oral hypoglycaemic for type 2 diabetes when metformin is insufficient.", 8.00),
            new DrugCatalog("Atorvastatin 20mg Tablets",
                "Statin for dyslipidaemia and cardiovascular risk reduction.", 25.00),
            new DrugCatalog("Omeprazole 20mg Capsules",
                "Proton pump inhibitor for gastric ulcers, GERD, and H. pylori eradication.", 15.00),
            new DrugCatalog("Ibuprofen 400mg Tablets",
                "NSAID for pain, fever, and inflammation. Take with food.", 6.00),
            new DrugCatalog("Salbutamol (Ventolin) 100mcg Inhaler",
                "Short-acting beta-2 agonist bronchodilator for acute asthma attacks.", 35.00),
            new DrugCatalog("Beclomethasone 100mcg Inhaler",
                "Inhaled corticosteroid for maintenance treatment of persistent asthma.", 45.00),
            new DrugCatalog("Fluconazole 150mg Capsules",
                "Antifungal for vaginal candidiasis and other fungal infections. Single dose.", 12.00),
            new DrugCatalog("Doxycycline 100mg Capsules",
                "Tetracycline antibiotic for malaria prophylaxis, chlamydia, and rickettsia.", 18.00),
            new DrugCatalog("Chloroquine Phosphate 250mg Tablets",
                "Antimalarial for prophylaxis in regions with sensitive P. vivax malaria.", 6.50),
            new DrugCatalog("Vitamin C 500mg Tablets",
                "Ascorbic acid supplement for immune support and iron absorption enhancement.", 4.00),
            new DrugCatalog("Vitamin D3 1000 IU Capsules",
                "Cholecalciferol supplement for bone health and immune function.", 12.00),
            new DrugCatalog("Multivitamin Tablets (Adult)",
                "Daily multivitamin supplement containing essential vitamins and minerals.", 8.00),
            new DrugCatalog("Diazepam 5mg Tablets",
                "Benzodiazepine for short-term anxiety and acute muscle spasm. Schedule IV.", 14.00),
            new DrugCatalog("Hydroxyurea 500mg Capsules",
                "Used in sickle cell disease to reduce painful crises and need for transfusions.", 55.00)
        );
        repo.saveAll(drugs);
        System.out.println("✅ Seeded " + drugs.size() + " drug catalog entries.");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  4. COMMUNITIES
    // ═══════════════════════════════════════════════════════════════════════════

    private void seedCommunities(CommunityRepository repo) {
        if (repo.count() > 0) return;
        repo.save(new Community("Diabetes Support",    "Share tips and support for diabetes management",         "heart",        "#2563EB", 1240));
        repo.save(new Community("Mental Health",       "A safe space for mental wellness conversations",          "happy-outline","#8B5CF6", 3891));
        repo.save(new Community("Hypertension Care",   "Blood pressure management community",                    "fitness",      "#14B8A6", 2105));
        repo.save(new Community("Cancer Survivors",    "Support and stories from survivors",                     "ribbon",       "#F59E0B", 987));
        repo.save(new Community("Sickle Cell Warriors","Community for sickle cell awareness",                    "water",        "#DC2626", 1456));
        System.out.println("✅ Seeded 5 communities.");
    }

}
