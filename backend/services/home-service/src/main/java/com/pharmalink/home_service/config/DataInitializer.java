package com.pharmalink.home_service.config;

import com.pharmalink.home_service.model.HealthTip;
import com.pharmalink.home_service.repository.HealthTipRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Seeds the 25 WHO / Ghana Health Service health tips — moved verbatim from
 * the old monolith's DataInitializer (which, by this point, only had this
 * one seed block left; Pharmacy/DrugCatalog/Community were extracted to
 * their own services' initializers in earlier steps). Idempotent: skips if
 * data already exists.
 */
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner seedHealthTips(HealthTipRepository repo) {
        return args -> {
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
        };
    }
}
