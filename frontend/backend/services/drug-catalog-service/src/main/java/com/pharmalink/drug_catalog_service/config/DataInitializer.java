package com.pharmalink.drug_catalog_service.config;

import com.pharmalink.drug_catalog_service.model.DrugCatalog;
import com.pharmalink.drug_catalog_service.repository.DrugCatalogRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Moved as-is from the monolith's config/DataInitializer.java (the
 * seedDrugCatalog() block only) — same Ghana Essential Medicines List data,
 * same idempotent skip-if-already-seeded behavior.
 */
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedData(DrugCatalogRepository drugCatalogRepository) {
        return args -> {
            seedDrugCatalog(drugCatalogRepository);
            System.out.println("✅ Drug-catalog-service data ready.");
        };
    }

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
}
