package com.PHARMALINK1.server.config;

import com.PHARMALINK1.server.model.*;
import com.PHARMALINK1.server.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(
            PharmacyRepository pharmacyRepository,
            HealthTipRepository healthTipRepository,
            DrugCatalogRepository drugCatalogRepository,
            CommunityRepository communityRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        return args -> {

            // ── Health Tips ─────────────────────────────────────────────────
            if (healthTipRepository.count() == 0) {
                healthTipRepository.save(new HealthTip(
                    "Drink at least 8 glasses of water daily to help your medications work effectively and reduce side effects.",
                    "Hydration"));
                healthTipRepository.save(new HealthTip(
                    "Take medications at the same time each day to build a healthy routine and improve adherence.",
                    "Adherence"));
                healthTipRepository.save(new HealthTip(
                    "Store medicines in a cool, dry place away from direct sunlight and out of reach of children.",
                    "Storage"));
                healthTipRepository.save(new HealthTip(
                    "Never share prescription medications with others, even if symptoms seem similar.",
                    "Safety"));
                healthTipRepository.save(new HealthTip(
                    "Consult your pharmacist before taking new supplements alongside prescribed medicines.",
                    "Interactions"));
                healthTipRepository.save(new HealthTip(
                    "Keep an updated list of all medications you take and share it with every healthcare provider.",
                    "Records"));
            }

            // ── Pharmacies + Demo Pharmacist Accounts ───────────────────────
            if (pharmacyRepository.count() == 0) {
                Pharmacy p1 = new Pharmacy();
                p1.setName("MedPlus Pharmacy Accra");
                p1.setAddress("14 Independence Ave, Accra");
                p1.setLatitude(5.6037);
                p1.setLongitude(-0.1870);
                p1.setPhone("+233 30 123 4567");
                p1.setOpenHours("8AM - 10PM");
                p1.setRating(4.8);
                pharmacyRepository.save(p1);

                Pharmacy p2 = new Pharmacy();
                p2.setName("HealthFirst Kumasi");
                p2.setAddress("22 Harper Road, Kumasi");
                p2.setLatitude(6.6885);
                p2.setLongitude(-1.6244);
                p2.setPhone("+233 32 987 6543");
                p2.setOpenHours("7AM - 9PM");
                p2.setRating(4.6);
                pharmacyRepository.save(p2);

                Pharmacy p3 = new Pharmacy();
                p3.setName("CareRx Tema");
                p3.setAddress("5 Community 1, Tema");
                p3.setLatitude(5.6698);
                p3.setLongitude(-0.0166);
                p3.setPhone("+233 30 555 1212");
                p3.setOpenHours("24 Hours");
                p3.setRating(4.9);
                pharmacyRepository.save(p3);

                Pharmacy p4 = new Pharmacy();
                p4.setName("PharmaLink East Legon");
                p4.setAddress("American House, East Legon");
                p4.setLatitude(5.6350);
                p4.setLongitude(-0.1560);
                p4.setPhone("+233 55 444 3322");
                p4.setOpenHours("8AM - 11PM");
                p4.setRating(4.7);
                Pharmacy savedP4 = pharmacyRepository.save(p4);

                // Demo Pharmacist 1 — Kwame
                if (userRepository.findByEmail("pharm.kwame@pharmalink.com").isEmpty()) {
                    User pharm1 = new User();
                    pharm1.setFullName("Pharm. Kwame Mensah");
                    pharm1.setEmail("pharm.kwame@pharmalink.com");
                    pharm1.setPassword(passwordEncoder.encode("password123"));
                    pharm1.setPhoneNumber("+233 24 111 2222");
                    pharm1.setRole(User.Role.PHARMACIST);
                    pharm1.setPharmacyId(savedP4.getId());
                    pharm1.setPharmacyName(savedP4.getName());
                    pharm1.setEnabled(true);
                    userRepository.save(pharm1);
                }

                // Demo Pharmacist 2 — Abena
                if (userRepository.findByEmail("pharm.abena@pharmalink.com").isEmpty()) {
                    User pharm2 = new User();
                    pharm2.setFullName("Pharm. Abena Osei");
                    pharm2.setEmail("pharm.abena@pharmalink.com");
                    pharm2.setPassword(passwordEncoder.encode("password123"));
                    pharm2.setPhoneNumber("+233 24 333 4444");
                    pharm2.setRole(User.Role.PHARMACIST);
                    pharm2.setPharmacyId(savedP4.getId());
                    pharm2.setPharmacyName(savedP4.getName());
                    pharm2.setEnabled(true);
                    userRepository.save(pharm2);
                }
            }

            // ── Demo Patient Account ─────────────────────────────────────────
            // Always ensure the demo patient exists regardless of pharmacy seeding
            if (userRepository.findByEmail("demo.patient@pharmalink.com").isEmpty()) {
                User demoPatient = new User();
                demoPatient.setFullName("Alex Demo");
                demoPatient.setEmail("demo.patient@pharmalink.com");
                demoPatient.setPassword(passwordEncoder.encode("Demo1234!"));
                demoPatient.setPhoneNumber("+233 20 000 0001");
                demoPatient.setRole(User.Role.PATIENT);
                demoPatient.setEnabled(true);
                userRepository.save(demoPatient);
                System.out.println("✅ Demo patient created: demo.patient@pharmalink.com / Demo1234!");
            }

            // ── Drug Catalog ─────────────────────────────────────────────────
            if (drugCatalogRepository.count() == 0) {
                drugCatalogRepository.save(new DrugCatalog("Paracetamol 500mg", "Pain relief & fever reducer", 5.50));
                drugCatalogRepository.save(new DrugCatalog("Amoxicillin 250mg", "Antibiotic capsules", 18.00));
                drugCatalogRepository.save(new DrugCatalog("Metformin 500mg", "Diabetes management", 12.50));
                drugCatalogRepository.save(new DrugCatalog("Vitamin C 1000mg", "Immune support tablets", 8.00));
                drugCatalogRepository.save(new DrugCatalog("Omeprazole 20mg", "Acid reflux treatment", 15.00));
                drugCatalogRepository.save(new DrugCatalog("Cetirizine 10mg", "Allergy relief", 7.50));
            }

            // ── Communities ──────────────────────────────────────────────────
            if (communityRepository.count() == 0) {
                communityRepository.save(new Community("Diabetes Support", "Share tips and support for diabetes management", "heart", "#2563EB", 1240));
                communityRepository.save(new Community("Mental Health", "A safe space for mental wellness conversations", "happy-outline", "#8B5CF6", 3891));
                communityRepository.save(new Community("Hypertension Care", "Blood pressure management community", "fitness", "#14B8A6", 2105));
                communityRepository.save(new Community("Cancer Survivors", "Support and stories from survivors", "ribbon", "#F59E0B", 987));
                communityRepository.save(new Community("Sickle Cell Warriors", "Community for sickle cell awareness", "water", "#DC2626", 1456));
            }

            System.out.println("===========================================");
            System.out.println("  PharmaLink Demo Credentials");
            System.out.println("  Patient:    demo.patient@pharmalink.com  / Demo1234!");
            System.out.println("  Pharmacist: pharm.kwame@pharmalink.com   / password123");
            System.out.println("===========================================");
        };
    }
}
