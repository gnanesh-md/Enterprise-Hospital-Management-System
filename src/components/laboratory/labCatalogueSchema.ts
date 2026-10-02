/**
 * Laboratory Test Catalogue Schema
 * 
 * Directly derived from: "Laboratory_Portal_Module_Wise_Result_Reports.pdf"
 * Hierarchy: Module -> Sub-module -> Test -> Parameters -> Input Type / Unit
 * 
 * Modules:
 * 1. HEMATOLOGY
 * 2. PATHOLOGY
 * 3. MICROBIOLOGY
 * 4. BIOCHEMISTRY
 * 5. IMMUNOLOGY / SEROLOGY
 * 6. THYROID FUNCTION
 * 7. OTHER SPECIAL TESTS
 */

export type ParameterInputType =
  | "numeric"
  | "text"
  | "select"
  | "positive_negative"
  | "reactive_nonreactive"
  | "detected_not_detected"
  | "present_absent"
  | "time"
  | "table"
  | "grade"

export interface LabParameterDefinition {
  id: string
  name: string
  inputType: ParameterInputType
  unit?: string
  options?: string[]
  referenceRange?: {
    low?: number
    high?: number
    text?: string
    criticalLow?: number
    criticalHigh?: number
  }
  defaultValue?: string
  placeholder?: string
}

export interface LabTestDefinition {
  id: string
  name: string
  code: string
  category: string // Module Name
  subModule: string // Sub-module Name
  sampleType?: string
  price: number
  parameters: LabParameterDefinition[]
  turnaroundTime?: string
  description?: string
}

export interface LabSubModule {
  id: string
  name: string
  tests: LabTestDefinition[]
}

export interface LabModule {
  id: string
  name: string
  subModules: LabSubModule[]
}

export const LAB_CATALOGUE: LabModule[] = [
  // =========================================================================
  // 1. HEMATOLOGY
  // =========================================================================
  {
    id: "hematology",
    name: "HEMATOLOGY",
    subModules: [
      {
        id: "cbc_hemogram",
        name: "Complete Blood Count / Hemogram",
        tests: [
          {
            id: "test_cbc",
            name: "CBC / Complete Hemogram",
            code: "CBC",
            category: "HEMATOLOGY",
            subModule: "Complete Blood Count / Hemogram",
            sampleType: "Whole Blood (Lavender Top EDTA)",
            price: 350,
            turnaroundTime: "2 Hours",
            parameters: [
              {
                id: "hb",
                name: "Hemoglobin (Hb)",
                inputType: "numeric",
                unit: "g/dL",
                referenceRange: { low: 13.0, high: 17.5, criticalLow: 7.0, criticalHigh: 20.0, text: "13.0–17.5 g/dL" },
                defaultValue: "14.2",
              },
              {
                id: "wbc",
                name: "Total WBC / Total Count (TC)",
                inputType: "numeric",
                unit: "cells/µL",
                referenceRange: { low: 4000, high: 11000, criticalLow: 2000, criticalHigh: 30000, text: "4,000–11,000 cells/µL" },
                defaultValue: "7500",
              },
              {
                id: "rbc",
                name: "RBC Count",
                inputType: "numeric",
                unit: "million/µL",
                referenceRange: { low: 4.5, high: 5.9, text: "4.5–5.9 million/µL" },
                defaultValue: "4.8",
              },
              {
                id: "pcv",
                name: "Packed Cell Volume (PCV/HCT)",
                inputType: "numeric",
                unit: "%",
                referenceRange: { low: 40.0, high: 52.0, text: "40.0–52.0 %" },
                defaultValue: "42.5",
              },
              {
                id: "mcv",
                name: "MCV",
                inputType: "numeric",
                unit: "fL",
                referenceRange: { low: 80.0, high: 100.0, text: "80.0–100.0 fL" },
                defaultValue: "88.0",
              },
              {
                id: "mch",
                name: "MCH",
                inputType: "numeric",
                unit: "pg",
                referenceRange: { low: 27.0, high: 33.0, text: "27.0–33.0 pg" },
                defaultValue: "29.5",
              },
              {
                id: "mchc",
                name: "MCHC",
                inputType: "numeric",
                unit: "g/dL",
                referenceRange: { low: 32.0, high: 36.0, text: "32.0–36.0 g/dL" },
                defaultValue: "33.5",
              },
              {
                id: "plt",
                name: "Platelet Count (PLT)",
                inputType: "numeric",
                unit: "cells/µL",
                referenceRange: { low: 150000, high: 450000, criticalLow: 50000, criticalHigh: 1000000, text: "150,000–450,000 cells/µL" },
                defaultValue: "240000",
              },
            ],
          },
          {
            id: "test_dc",
            name: "Differential Count (DC)",
            code: "DC",
            category: "HEMATOLOGY",
            subModule: "Complete Blood Count / Hemogram",
            sampleType: "Whole Blood (Lavender Top EDTA)",
            price: 200,
            turnaroundTime: "2 Hours",
            parameters: [
              {
                id: "neutrophils",
                name: "Neutrophils",
                inputType: "numeric",
                unit: "%",
                referenceRange: { low: 40, high: 75, text: "40–75 %" },
                defaultValue: "62",
              },
              {
                id: "lymphocytes",
                name: "Lymphocytes",
                inputType: "numeric",
                unit: "%",
                referenceRange: { low: 20, high: 45, text: "20–45 %" },
                defaultValue: "30",
              },
              {
                id: "eosinophils",
                name: "Eosinophils",
                inputType: "numeric",
                unit: "%",
                referenceRange: { low: 1, high: 6, text: "1–6 %" },
                defaultValue: "4",
              },
              {
                id: "monocytes",
                name: "Monocytes",
                inputType: "numeric",
                unit: "%",
                referenceRange: { low: 2, high: 10, text: "2–10 %" },
                defaultValue: "4",
              },
            ],
          },
        ],
      },
      {
        id: "additional_hematology",
        name: "Additional Hematology Parameters",
        tests: [
          {
            id: "test_aec",
            name: "Absolute Eosinophil Count (AEC)",
            code: "AEC",
            category: "HEMATOLOGY",
            subModule: "Additional Hematology Parameters",
            sampleType: "Whole Blood (EDTA)",
            price: 250,
            parameters: [
              {
                id: "aec",
                name: "Absolute Eosinophil Count (AEC)",
                inputType: "numeric",
                unit: "cells/µL",
                referenceRange: { low: 40, high: 440, text: "40–440 cells/µL" },
                defaultValue: "210",
              },
            ],
          },
          {
            id: "test_esr",
            name: "ESR",
            code: "ESR",
            category: "HEMATOLOGY",
            subModule: "Additional Hematology Parameters",
            sampleType: "Sodium Citrate / EDTA",
            price: 150,
            parameters: [
              {
                id: "esr",
                name: "ESR",
                inputType: "numeric",
                unit: "mm/hr",
                referenceRange: { low: 0, high: 20, text: "0–20 mm/hr" },
                defaultValue: "12",
              },
            ],
          },
        ],
      },
      {
        id: "blood_group_coagulation",
        name: "Blood Group & Coagulation",
        tests: [
          {
            id: "test_blood_group",
            name: "Blood Group",
            code: "BG",
            category: "HEMATOLOGY",
            subModule: "Blood Group & Coagulation",
            sampleType: "Whole Blood (EDTA)",
            price: 200,
            parameters: [
              {
                id: "abo_group",
                name: "ABO Group",
                inputType: "select",
                options: ["A", "B", "AB", "O"],
                defaultValue: "O",
              },
              {
                id: "rh_d",
                name: "Rh(D)",
                inputType: "positive_negative",
                options: ["Positive", "Negative"],
                defaultValue: "Positive",
              },
            ],
          },
          {
            id: "test_bleeding_time",
            name: "Bleeding Time",
            code: "BT",
            category: "HEMATOLOGY",
            subModule: "Blood Group & Coagulation",
            sampleType: "In Vivo (Duke / Ivy Method)",
            price: 150,
            parameters: [
              {
                id: "bleeding_time",
                name: "Bleeding Time",
                inputType: "time",
                unit: "min/sec",
                referenceRange: { text: "2.00–7.00 min/sec" },
                defaultValue: "3 min 15 sec",
              },
            ],
          },
          {
            id: "test_clotting_time",
            name: "Clotting Time",
            code: "CT",
            category: "HEMATOLOGY",
            subModule: "Blood Group & Coagulation",
            sampleType: "Capillary / Tube Method",
            price: 150,
            parameters: [
              {
                id: "clotting_time",
                name: "Clotting Time",
                inputType: "time",
                unit: "min/sec",
                referenceRange: { text: "3.00–10.00 min/sec" },
                defaultValue: "5 min 40 sec",
              },
            ],
          },
          {
            id: "test_pt_inr",
            name: "PT / INR",
            code: "PT-INR",
            category: "HEMATOLOGY",
            subModule: "Blood Group & Coagulation",
            sampleType: "Citrated Plasma (Light Blue Top)",
            price: 450,
            parameters: [
              {
                id: "pt",
                name: "Prothrombin Time (PT)",
                inputType: "numeric",
                unit: "sec",
                referenceRange: { low: 11.0, high: 13.5, text: "11.0–13.5 sec" },
                defaultValue: "12.2",
              },
              {
                id: "inr",
                name: "INR",
                inputType: "numeric",
                referenceRange: { low: 0.8, high: 1.2, text: "0.8–1.2 (Therapeutic: 2.0–3.0)" },
                defaultValue: "1.02",
              },
              {
                id: "control_pt",
                name: "Control PT (if used)",
                inputType: "numeric",
                unit: "sec",
                referenceRange: { text: "12.0 sec" },
                defaultValue: "12.0",
              },
            ],
          },
          {
            id: "test_ptt_aptt",
            name: "PTT / APTT",
            code: "APTT",
            category: "HEMATOLOGY",
            subModule: "Blood Group & Coagulation",
            sampleType: "Citrated Plasma (Light Blue Top)",
            price: 450,
            parameters: [
              {
                id: "aptt",
                name: "APTT",
                inputType: "numeric",
                unit: "sec",
                referenceRange: { low: 25.0, high: 35.0, text: "25.0–35.0 sec" },
                defaultValue: "29.4",
              },
              {
                id: "control_aptt",
                name: "Control APTT (if used)",
                inputType: "numeric",
                unit: "sec",
                referenceRange: { text: "30.0 sec" },
                defaultValue: "30.0",
              },
            ],
          },
        ],
      },
      {
        id: "peripheral_smear_screening",
        name: "Peripheral Smear / Screening",
        tests: [
          {
            id: "test_peripheral_blood_smear",
            name: "Peripheral Blood Smear",
            code: "PBS",
            category: "HEMATOLOGY",
            subModule: "Peripheral Smear / Screening",
            sampleType: "Whole Blood (EDTA)",
            price: 300,
            parameters: [
              {
                id: "rbc_morphology",
                name: "RBC Morphology",
                inputType: "text",
                defaultValue: "Normocytic, normochromic RBCs. No significant anisopoikilocytosis.",
              },
              {
                id: "wbc_morphology",
                name: "WBC Morphology",
                inputType: "text",
                defaultValue: "Normal distribution. Neutrophils appear mature. No abnormal or immature cells seen.",
              },
              {
                id: "platelet_adequacy",
                name: "Platelet Adequacy",
                inputType: "text",
                defaultValue: "Adequate on smear. No giant platelets observed.",
              },
              {
                id: "parasites_other",
                name: "Parasites / Other Findings",
                inputType: "text",
                defaultValue: "No hemoparasites (Malarial parasite / Microfilaria) detected.",
              },
              {
                id: "overall_impression",
                name: "Overall Smear Impression",
                inputType: "text",
                defaultValue: "Normocytic normochromic blood picture. Within normal limits.",
              },
            ],
          },
          {
            id: "test_qbc",
            name: "QBC",
            code: "QBC",
            category: "HEMATOLOGY",
            subModule: "Peripheral Smear / Screening",
            sampleType: "Capillary / Venous Blood (QBC tube)",
            price: 400,
            parameters: [
              {
                id: "qbc_result",
                name: "QBC Result",
                inputType: "text",
                defaultValue: "Negative for Malarial Parasite",
              },
              {
                id: "parasite_other",
                name: "Parasite / Other Finding",
                inputType: "text",
                defaultValue: "No Plasmodium vivax or Plasmodium falciparum gametocytes/trophozoites seen.",
              },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 2. PATHOLOGY
  // =========================================================================
  {
    id: "pathology",
    name: "PATHOLOGY",
    subModules: [
      {
        id: "urine_examination",
        name: "Urine Examination",
        tests: [
          {
            id: "test_cue",
            name: "CUE / Complete Urine Examination",
            code: "CUE",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Clean Catch Midstream Urine",
            price: 250,
            parameters: [
              {
                id: "colour",
                name: "Colour",
                inputType: "select",
                options: ["Pale Yellow", "Yellow", "Amber", "Straw", "Reddish", "Cloudy", "Colorless"],
                defaultValue: "Pale Yellow",
              },
              {
                id: "appearance",
                name: "Appearance",
                inputType: "select",
                options: ["Clear", "Slightly Turbid", "Turbid", "Hazy"],
                defaultValue: "Clear",
              },
              {
                id: "ph",
                name: "pH",
                inputType: "numeric",
                referenceRange: { low: 4.5, high: 8.0, text: "4.5–8.0" },
                defaultValue: "6.0",
              },
              {
                id: "specific_gravity",
                name: "Specific Gravity",
                inputType: "numeric",
                referenceRange: { low: 1.005, high: 1.030, text: "1.005–1.030" },
                defaultValue: "1.015",
              },
              {
                id: "protein_albumin",
                name: "Protein / Albumin",
                inputType: "select",
                options: ["Nil", "Trace", "1+", "2+", "3+", "4+"],
                defaultValue: "Nil",
              },
              {
                id: "glucose_sugar",
                name: "Glucose / Sugar",
                inputType: "select",
                options: ["Nil", "Trace", "1+", "2+", "3+", "4+"],
                defaultValue: "Nil",
              },
              {
                id: "ketone_bodies",
                name: "Ketone Bodies",
                inputType: "select",
                options: ["Negative", "Trace", "1+", "2+", "3+"],
                defaultValue: "Negative",
              },
              {
                id: "bilirubin",
                name: "Bilirubin",
                inputType: "select",
                options: ["Negative", "Positive (+)", "Strongly Positive (++)"],
                defaultValue: "Negative",
              },
              {
                id: "urobilinogen",
                name: "Urobilinogen",
                inputType: "text",
                referenceRange: { text: "Normal (0.2–1.0 mg/dL)" },
                defaultValue: "Normal",
              },
              {
                id: "blood_rbc",
                name: "Blood / RBC",
                inputType: "select",
                options: ["Nil", "Trace", "1+", "2+", "3+"],
                defaultValue: "Nil",
              },
              {
                id: "pus_cells_wbc",
                name: "Pus Cells / WBC",
                inputType: "text",
                unit: "/HPF",
                referenceRange: { text: "0–5 /HPF" },
                defaultValue: "1–2 /HPF",
              },
              {
                id: "epithelial_cells",
                name: "Epithelial Cells",
                inputType: "text",
                unit: "/HPF",
                referenceRange: { text: "1–5 /HPF" },
                defaultValue: "2–3 /HPF",
              },
              {
                id: "casts",
                name: "Casts",
                inputType: "text",
                defaultValue: "Nil seen",
              },
              {
                id: "crystals",
                name: "Crystals",
                inputType: "text",
                defaultValue: "Nil seen",
              },
              {
                id: "bacteria_other",
                name: "Bacteria / Other Findings",
                inputType: "text",
                defaultValue: "Absent",
              },
            ],
          },
          {
            id: "test_routine_urine",
            name: "Routine Urine Examination",
            code: "URINE-ROUTINE",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Urine",
            price: 200,
            parameters: [
              {
                id: "physical_exam",
                name: "Physical Examination",
                inputType: "text",
                defaultValue: "Pale yellow, clear, specific gravity 1.015",
              },
              {
                id: "chemical_exam",
                name: "Chemical Examination",
                inputType: "text",
                defaultValue: "Protein: Nil, Sugar: Nil, Ketones: Negative, Bile Salts: Neg",
              },
              {
                id: "microscopic_exam",
                name: "Microscopic Examination",
                inputType: "text",
                defaultValue: "Pus cells: 1-2/HPF, RBCs: Nil, Epithelial cells: 2-3/HPF",
              },
              {
                id: "impression",
                name: "Impression",
                inputType: "text",
                defaultValue: "Normal routine urine examination",
              },
            ],
          },
          {
            id: "test_urine_gram_stain",
            name: "Urine Gram Stain",
            code: "URINE-GRAM",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Unspun Midstream Urine",
            price: 250,
            parameters: [
              {
                id: "organisms_seen",
                name: "Organisms Seen",
                inputType: "text",
                defaultValue: "No bacteria seen under oil immersion (100x)",
              },
              {
                id: "gram_reaction",
                name: "Gram Reaction",
                inputType: "text",
                defaultValue: "None",
              },
              {
                id: "quantity_description",
                name: "Quantity / Description",
                inputType: "text",
                defaultValue: "0 bacteria per oil immersion field (< 10^5 CFU/mL equivalent)",
              },
            ],
          },
          {
            id: "test_bile_salts_pigments",
            name: "Bile Salts / Bile Pigments",
            code: "BILE-SALTS-PIGMENTS",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Fresh Urine",
            price: 200,
            parameters: [
              {
                id: "bile_salts",
                name: "Bile Salts",
                inputType: "positive_negative",
                options: ["Negative", "Positive"],
                defaultValue: "Negative",
              },
              {
                id: "bile_pigments",
                name: "Bile Pigments",
                inputType: "positive_negative",
                options: ["Negative", "Positive"],
                defaultValue: "Negative",
              },
            ],
          },
          {
            id: "test_urine_ph",
            name: "Urine pH",
            code: "URINE-PH",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Fresh Urine",
            price: 100,
            parameters: [
              {
                id: "urine_ph",
                name: "Urine pH",
                inputType: "numeric",
                referenceRange: { low: 4.5, high: 8.0, text: "4.5–8.0" },
                defaultValue: "6.0",
              },
            ],
          },
          {
            id: "test_urine_sp_gravity",
            name: "Urine Specific Gravity",
            code: "URINE-SG",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Fresh Urine",
            price: 100,
            parameters: [
              {
                id: "specific_gravity",
                name: "Specific Gravity",
                inputType: "numeric",
                referenceRange: { low: 1.005, high: 1.030, text: "1.005–1.030" },
                defaultValue: "1.018",
              },
            ],
          },
          {
            id: "test_urine_sugar",
            name: "Urine Sugar",
            code: "URINE-SUGAR",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Fresh Urine",
            price: 100,
            parameters: [
              {
                id: "urine_sugar",
                name: "Urine Sugar",
                inputType: "select",
                options: ["Nil", "Trace", "1+", "2+", "3+", "4+"],
                defaultValue: "Nil",
              },
            ],
          },
          {
            id: "test_urine_albumin",
            name: "Urine Albumin",
            code: "URINE-ALB",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Fresh Urine",
            price: 100,
            parameters: [
              {
                id: "urine_albumin",
                name: "Urine Albumin",
                inputType: "select",
                options: ["Nil", "Trace", "1+", "2+", "3+", "4+"],
                defaultValue: "Nil",
              },
            ],
          },
          {
            id: "test_ketone_bodies",
            name: "Ketone Bodies",
            code: "KETONE-BODIES",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Fresh Urine",
            price: 100,
            parameters: [
              {
                id: "ketone_bodies",
                name: "Ketone Bodies",
                inputType: "select",
                options: ["Negative", "Trace", "1+", "2+", "3+"],
                defaultValue: "Negative",
              },
            ],
          },
          {
            id: "test_urine_microalbumin",
            name: "Urine Microalbumin",
            code: "URINE-MICROALB",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Spot / 24h Urine",
            price: 450,
            parameters: [
              {
                id: "microalbumin",
                name: "Microalbumin",
                inputType: "numeric",
                unit: "mg/L",
                referenceRange: { low: 0, high: 20, text: "< 20 mg/L" },
                defaultValue: "8.5",
              },
              {
                id: "creatinine_urine",
                name: "Creatinine (if applicable)",
                inputType: "numeric",
                unit: "mg/dL",
                referenceRange: { text: "20–320 mg/dL" },
                defaultValue: "110",
              },
              {
                id: "acr",
                name: "Albumin/Creatinine Ratio (if applicable)",
                inputType: "numeric",
                unit: "mg/g",
                referenceRange: { low: 0, high: 30, text: "< 30 mg/g (Normal)" },
                defaultValue: "7.7",
              },
            ],
          },
          {
            id: "test_urine_cotinine",
            name: "Urine Cotinine",
            code: "URINE-COTININE",
            category: "PATHOLOGY",
            subModule: "Urine Examination",
            sampleType: "Random Urine",
            price: 600,
            parameters: [
              {
                id: "cotinine_result",
                name: "Cotinine Result",
                inputType: "text",
                defaultValue: "Negative (< 200 ng/mL)",
              },
              {
                id: "interpretation",
                name: "Interpretation",
                inputType: "text",
                defaultValue: "Consistent with non-tobacco / non-nicotine user.",
              },
            ],
          },
        ],
      },
      {
        id: "viral_serology_screening",
        name: "Viral / Serology Screening",
        tests: [
          {
            id: "test_hiv",
            name: "HIV",
            code: "HIV",
            category: "PATHOLOGY",
            subModule: "Viral / Serology Screening",
            sampleType: "Serum (Red / SST)",
            price: 450,
            parameters: [
              {
                id: "test_result",
                name: "Test Result",
                inputType: "reactive_nonreactive",
                options: ["Non-reactive", "Reactive"],
                defaultValue: "Non-reactive",
              },
              {
                id: "method_kit",
                name: "Method / Kit (optional)",
                inputType: "text",
                defaultValue: "4th Generation Chemiluminescence (Ag+Ab)",
              },
              {
                id: "remarks",
                name: "Remarks",
                inputType: "text",
                defaultValue: "Negative for HIV-1/2 antibodies and p24 antigen.",
              },
            ],
          },
          {
            id: "test_hcv",
            name: "HCV",
            code: "HCV",
            category: "PATHOLOGY",
            subModule: "Viral / Serology Screening",
            sampleType: "Serum (Red / SST)",
            price: 450,
            parameters: [
              {
                id: "test_result",
                name: "Test Result",
                inputType: "reactive_nonreactive",
                options: ["Non-reactive", "Reactive"],
                defaultValue: "Non-reactive",
              },
              {
                id: "method_kit",
                name: "Method / Kit (optional)",
                inputType: "text",
                defaultValue: "Enhanced Chemiluminescence Immunoassay",
              },
              {
                id: "remarks",
                name: "Remarks",
                inputType: "text",
                defaultValue: "Anti-HCV antibodies not detected.",
              },
            ],
          },
          {
            id: "test_hbsag",
            name: "HBsAg",
            code: "HBSAG",
            category: "PATHOLOGY",
            subModule: "Viral / Serology Screening",
            sampleType: "Serum (Red / SST)",
            price: 450,
            parameters: [
              {
                id: "test_result",
                name: "Test Result",
                inputType: "reactive_nonreactive",
                options: ["Non-reactive", "Reactive"],
                defaultValue: "Non-reactive",
              },
              {
                id: "method_kit",
                name: "Method / Kit (optional)",
                inputType: "text",
                defaultValue: "Chemiluminescent Microparticle Immunoassay (CMIA)",
              },
              {
                id: "remarks",
                name: "Remarks",
                inputType: "text",
                defaultValue: "Hepatitis B Surface Antigen not detected.",
              },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 3. MICROBIOLOGY
  // =========================================================================
  {
    id: "microbiology",
    name: "MICROBIOLOGY",
    subModules: [
      {
        id: "culture_sensitivity",
        name: "Culture & Sensitivity",
        tests: [
          {
            id: "test_urine_cs",
            name: "Urine C/S",
            code: "URINE-CS",
            category: "MICROBIOLOGY",
            subModule: "Culture & Sensitivity",
            sampleType: "Midstream Urine (Sterile Container)",
            price: 750,
            parameters: [
              { id: "specimen", name: "Specimen", inputType: "text", defaultValue: "Midstream Urine" },
              { id: "culture_growth", name: "Culture Growth", inputType: "text", defaultValue: "No significant growth after 48 hours of incubation at 37°C" },
              { id: "organism_identified", name: "Organism Identified", inputType: "text", defaultValue: "Sterile / No Pathogen Isolated" },
              { id: "colony_count", name: "Colony Count (if reported)", inputType: "text", defaultValue: "< 10^3 CFU/mL" },
              { id: "antibiotic_susceptibility", name: "Antibiotic Susceptibility", inputType: "table", defaultValue: "Not applicable - sterile" },
              { id: "final_impression", name: "Final Impression", inputType: "text", defaultValue: "No urinary tract infection demonstrated on culture." },
            ],
          },
          {
            id: "test_blood_cs",
            name: "Blood C/S",
            code: "BLOOD-CS",
            category: "MICROBIOLOGY",
            subModule: "Culture & Sensitivity",
            sampleType: "Venous Blood (BD BACTEC Bottle)",
            price: 1200,
            parameters: [
              { id: "specimen", name: "Specimen", inputType: "text", defaultValue: "Venous Blood (Paired aerobic/anaerobic bottles)" },
              { id: "culture_result", name: "Culture Result", inputType: "text", defaultValue: "No bacterial or fungal growth observed after 5 days of incubation" },
              { id: "organism_identified", name: "Organism Identified", inputType: "text", defaultValue: "None" },
              { id: "antibiotic_susceptibility", name: "Antibiotic Susceptibility", inputType: "table", defaultValue: "Not applicable" },
              { id: "final_impression", name: "Final Impression", inputType: "text", defaultValue: "Sterile blood culture at 5 days." },
            ],
          },
          {
            id: "test_pus_cs",
            name: "Pus C/S",
            code: "PUS-CS",
            category: "MICROBIOLOGY",
            subModule: "Culture & Sensitivity",
            sampleType: "Pus Aspirate / Swab",
            price: 750,
            parameters: [
              { id: "specimen", name: "Specimen", inputType: "text", defaultValue: "Wound Aspirate / Pus Swab" },
              { id: "culture_growth", name: "Culture Growth", inputType: "text", defaultValue: "Moderate growth of Staphylococcus aureus" },
              { id: "organism_identified", name: "Organism Identified", inputType: "text", defaultValue: "Staphylococcus aureus (MSSA)" },
              { id: "antibiotic_susceptibility", name: "Antibiotic Susceptibility", inputType: "table", defaultValue: "Amoxicillin/Clavulanate: Sensitive, Ciprofloxacin: Sensitive, Linezolid: Sensitive, Vancomycin: Sensitive" },
              { id: "final_impression", name: "Final Impression", inputType: "text", defaultValue: "Isolated MSSA susceptible to first-line agents." },
            ],
          },
          {
            id: "test_fluid_cs",
            name: "Fluid C/S",
            code: "FLUID-CS",
            category: "MICROBIOLOGY",
            subModule: "Culture & Sensitivity",
            sampleType: "Aspirated Body Fluid",
            price: 850,
            parameters: [
              { id: "fluid_type", name: "Fluid Type", inputType: "select", options: ["Pleural Fluid", "Ascitic Fluid", "Synovial Fluid", "Peritoneal Fluid", "Pericardial Fluid"], defaultValue: "Pleural Fluid" },
              { id: "culture_growth", name: "Culture Growth", inputType: "text", defaultValue: "No growth after 48h incubation" },
              { id: "organism_identified", name: "Organism Identified", inputType: "text", defaultValue: "None" },
              { id: "antibiotic_susceptibility", name: "Antibiotic Susceptibility", inputType: "table", defaultValue: "Not applicable" },
              { id: "final_impression", name: "Final Impression", inputType: "text", defaultValue: "Sterile fluid culture." },
            ],
          },
          {
            id: "test_sputum_cs",
            name: "Sputum C/S",
            code: "SPUTUM-CS",
            category: "MICROBIOLOGY",
            subModule: "Culture & Sensitivity",
            sampleType: "Early Morning Sputum",
            price: 750,
            parameters: [
              { id: "specimen_quality", name: "Specimen Quality", inputType: "text", defaultValue: "Acceptable (> 25 WBCs, < 10 Epithelial cells/LPF)" },
              { id: "culture_growth", name: "Culture Growth", inputType: "text", defaultValue: "Normal upper respiratory tract flora only" },
              { id: "organism_identified", name: "Organism Identified", inputType: "text", defaultValue: "No definitive respiratory pathogen isolated" },
              { id: "antibiotic_susceptibility", name: "Antibiotic Susceptibility", inputType: "table", defaultValue: "Not applicable" },
              { id: "final_impression", name: "Final Impression", inputType: "text", defaultValue: "Commensal flora. No pathogen identified." },
            ],
          },
          {
            id: "test_bal_fluid_cs",
            name: "BAL Fluid C/S",
            code: "BAL-CS",
            category: "MICROBIOLOGY",
            subModule: "Culture & Sensitivity",
            sampleType: "Bronchoalveolar Lavage (Sterile Container)",
            price: 950,
            parameters: [
              { id: "specimen", name: "Specimen", inputType: "text", defaultValue: "Bronchoalveolar Lavage" },
              { id: "culture_growth", name: "Culture Growth", inputType: "text", defaultValue: "No significant organism isolated" },
              { id: "organism_identified", name: "Organism Identified", inputType: "text", defaultValue: "Sterile" },
              { id: "antibiotic_susceptibility", name: "Antibiotic Susceptibility", inputType: "table", defaultValue: "Not applicable" },
              { id: "final_impression", name: "Final Impression", inputType: "text", defaultValue: "No growth on standard media." },
            ],
          },
        ],
      },
      {
        id: "stains_direct_microscopy",
        name: "Stains / Direct Microscopy",
        tests: [
          {
            id: "test_sputum_afb",
            name: "Sputum AFB",
            code: "SPUTUM-AFB",
            category: "MICROBIOLOGY",
            subModule: "Stains / Direct Microscopy",
            sampleType: "Early Morning Sputum",
            price: 250,
            parameters: [
              { id: "afb_smear_result", name: "AFB Smear Result", inputType: "grade", defaultValue: "Negative for Acid Fast Bacilli" },
              { id: "remarks", name: "Remarks", inputType: "text", defaultValue: "No acid-fast bacilli seen after examining 100 oil immersion fields (RNTCP guidelines)." },
            ],
          },
          {
            id: "test_sputum_gram_stain",
            name: "Sputum Gram Stain",
            code: "SPUTUM-GRAM",
            category: "MICROBIOLOGY",
            subModule: "Stains / Direct Microscopy",
            sampleType: "Purulent portion of Sputum",
            price: 200,
            parameters: [
              { id: "gram_reaction", name: "Gram Reaction", inputType: "text", defaultValue: "Gram-positive cocci in pairs and short chains" },
              { id: "organisms", name: "Organisms", inputType: "text", defaultValue: "Suggestive of Streptococcus species" },
              { id: "pus_epithelial_cells", name: "Pus Cells / Epithelial Cells", inputType: "text", defaultValue: "Pus cells: 15–20/LPF, Epithelial cells: < 5/LPF" },
              { id: "remarks", name: "Remarks", inputType: "text", defaultValue: "Good quality purulent sputum sample." },
            ],
          },
          {
            id: "test_sputum_zn_stain",
            name: "Sputum ZN Stain",
            code: "SPUTUM-ZN",
            category: "MICROBIOLOGY",
            subModule: "Stains / Direct Microscopy",
            sampleType: "Sputum",
            price: 250,
            parameters: [
              { id: "zn_afb_result", name: "ZN / AFB Result", inputType: "grade", defaultValue: "Negative for AFB" },
              { id: "remarks", name: "Remarks", inputType: "text", defaultValue: "Examined > 100 microscopic fields. No mycobacteria seen." },
            ],
          },
          {
            id: "test_bal_afb",
            name: "BAL AFB",
            code: "BAL-AFB",
            category: "MICROBIOLOGY",
            subModule: "Stains / Direct Microscopy",
            sampleType: "BAL Centrifuged Deposit",
            price: 300,
            parameters: [
              { id: "afb_result", name: "AFB Result", inputType: "grade", defaultValue: "Negative" },
              { id: "remarks", name: "Remarks", inputType: "text", defaultValue: "No AFB detected in concentrated cytospin smear." },
            ],
          },
          {
            id: "test_bal_gram_stain",
            name: "BAL Gram Stain",
            code: "BAL-GRAM",
            category: "MICROBIOLOGY",
            subModule: "Stains / Direct Microscopy",
            sampleType: "BAL Fluid",
            price: 250,
            parameters: [
              { id: "gram_reaction", name: "Gram Reaction", inputType: "text", defaultValue: "No predominant bacterial morphotype" },
              { id: "organisms", name: "Organisms", inputType: "text", defaultValue: "None seen" },
              { id: "cells_other_findings", name: "Cells / Other Findings", inputType: "text", defaultValue: "Occasional alveolar macrophages, few neutrophils" },
            ],
          },
          {
            id: "test_bal_zn_stain",
            name: "BAL ZN Stain",
            code: "BAL-ZN",
            category: "MICROBIOLOGY",
            subModule: "Stains / Direct Microscopy",
            sampleType: "BAL Fluid",
            price: 300,
            parameters: [
              { id: "zn_afb_result", name: "ZN / AFB Result", inputType: "grade", defaultValue: "Negative for AFB" },
              { id: "remarks", name: "Remarks", inputType: "text", defaultValue: "Negative on Ziehl-Neelsen staining." },
            ],
          },
          {
            id: "test_bal_fungal_stain_koh",
            name: "BAL Fungal Stain / KOH",
            code: "BAL-KOH",
            category: "MICROBIOLOGY",
            subModule: "Stains / Direct Microscopy",
            sampleType: "BAL Fluid",
            price: 350,
            parameters: [
              { id: "fungal_elements", name: "Fungal Elements", inputType: "present_absent", options: ["Absent", "Present"], defaultValue: "Absent" },
              { id: "organism_morphology", name: "Organism / Morphology", inputType: "text", defaultValue: "No hyphae, yeast cells, or pseudohyphae seen" },
              { id: "remarks", name: "Remarks", inputType: "text", defaultValue: "10% KOH wet mount and calcofluor white negative." },
            ],
          },
        ],
      },
      {
        id: "fluid_analysis",
        name: "Fluid Analysis",
        tests: [
          {
            id: "test_pleural_fluid_analysis",
            name: "Pleural Fluid Analysis",
            code: "PLEURAL-ANALYSIS",
            category: "MICROBIOLOGY",
            subModule: "Fluid Analysis",
            sampleType: "Thoracentesis Fluid (EDTA + Plain)",
            price: 850,
            parameters: [
              { id: "appearance_colour", name: "Appearance / Colour", inputType: "text", defaultValue: "Straw coloured, clear" },
              { id: "total_cell_count", name: "Total Cell Count", inputType: "numeric", unit: "cells/µL", referenceRange: { low: 0, high: 1000, text: "< 1,000 cells/µL" }, defaultValue: "450" },
              { id: "differential_count", name: "Differential Count", inputType: "text", defaultValue: "Lymphocytes: 85%, Neutrophils: 15%" },
              { id: "rbc_count", name: "RBC Count", inputType: "numeric", unit: "cells/µL", referenceRange: { text: "< 10,000 cells/µL" }, defaultValue: "1200" },
              { id: "protein", name: "Protein", inputType: "numeric", unit: "g/dL", referenceRange: { text: "< 3.0 g/dL (Transudate) / > 3.0 (Exudate)" }, defaultValue: "2.8" },
              { id: "glucose", name: "Glucose", inputType: "numeric", unit: "mg/dL", referenceRange: { text: "60–100 mg/dL" }, defaultValue: "88" },
              { id: "ldh", name: "LDH", inputType: "numeric", unit: "U/L", referenceRange: { text: "< 200 U/L" }, defaultValue: "140" },
              { id: "gram_stain_culture", name: "Gram Stain / Culture", inputType: "text", defaultValue: "No organisms seen; culture sterile" },
              { id: "other_findings", name: "Other Findings", inputType: "text", defaultValue: "No malignant cells seen" },
              { id: "impression", name: "Impression", inputType: "text", defaultValue: "Features consistent with transudative pleural effusion." },
            ],
          },
          {
            id: "test_ascitic_fluid_analysis",
            name: "Ascitic Fluid Analysis",
            code: "ASCITIC-ANALYSIS",
            category: "MICROBIOLOGY",
            subModule: "Fluid Analysis",
            sampleType: "Paracentesis Fluid",
            price: 850,
            parameters: [
              { id: "appearance_colour", name: "Appearance / Colour", inputType: "text", defaultValue: "Pale yellow, slightly hazy" },
              { id: "total_cell_count", name: "Total Cell Count", inputType: "numeric", unit: "cells/µL", referenceRange: { low: 0, high: 500, text: "< 500 cells/µL" }, defaultValue: "280" },
              { id: "differential_count", name: "Differential Count", inputType: "text", defaultValue: "Polymorphs: 18%, Mononuclear: 82%" },
              { id: "rbc_count", name: "RBC Count", inputType: "numeric", unit: "cells/µL", defaultValue: "800" },
              { id: "albumin", name: "Albumin", inputType: "numeric", unit: "g/dL", defaultValue: "1.2" },
              { id: "protein", name: "Protein", inputType: "numeric", unit: "g/dL", defaultValue: "2.1" },
              { id: "glucose", name: "Glucose", inputType: "numeric", unit: "mg/dL", defaultValue: "95" },
              { id: "gram_stain_culture", name: "Gram Stain / Culture", inputType: "text", defaultValue: "Negative" },
              { id: "other_findings", name: "Other Findings", inputType: "text", defaultValue: "SAAG > 1.1 g/dL (Portal hypertension likely)" },
              { id: "impression", name: "Impression", inputType: "text", defaultValue: "High SAAG transudative ascites. Non-SBP." },
            ],
          },
          {
            id: "test_synovial_fluid_analysis",
            name: "Synovial Fluid Analysis",
            code: "SYNOVIAL-ANALYSIS",
            category: "MICROBIOLOGY",
            subModule: "Fluid Analysis",
            sampleType: "Arthrocentesis Fluid",
            price: 900,
            parameters: [
              { id: "appearance_colour", name: "Appearance / Colour", inputType: "text", defaultValue: "Clear, pale straw" },
              { id: "viscosity", name: "Viscosity", inputType: "text", defaultValue: "High (String test > 3 cm)" },
              { id: "total_cell_count", name: "Total Cell Count", inputType: "numeric", unit: "cells/µL", referenceRange: { low: 0, high: 200, text: "< 200 cells/µL" }, defaultValue: "150" },
              { id: "differential_count", name: "Differential Count", inputType: "text", defaultValue: "Mononuclear: 80%, Polymorphs: 20%" },
              { id: "rbc_count", name: "RBC Count", inputType: "numeric", unit: "cells/µL", defaultValue: "100" },
              { id: "glucose", name: "Glucose", inputType: "numeric", unit: "mg/dL", defaultValue: "92" },
              { id: "protein", name: "Protein", inputType: "numeric", unit: "g/dL", defaultValue: "2.2" },
              { id: "crystal_examination", name: "Crystal Examination", inputType: "text", defaultValue: "No MSU or CPPD crystals identified under polarized light" },
              { id: "gram_stain_culture", name: "Gram Stain / Culture", inputType: "text", defaultValue: "Sterile" },
              { id: "impression", name: "Impression", inputType: "text", defaultValue: "Non-inflammatory synovial fluid." },
            ],
          },
          {
            id: "test_peritoneal_fluid_analysis",
            name: "Peritoneal Fluid Analysis",
            code: "PERITONEAL-ANALYSIS",
            category: "MICROBIOLOGY",
            subModule: "Fluid Analysis",
            sampleType: "Peritoneal Aspirate",
            price: 850,
            parameters: [
              { id: "appearance_colour", name: "Appearance / Colour", inputType: "text", defaultValue: "Straw coloured, clear" },
              { id: "total_cell_count", name: "Total Cell Count", inputType: "numeric", unit: "cells/µL", referenceRange: { low: 0, high: 300, text: "< 300 cells/µL" }, defaultValue: "120" },
              { id: "differential_count", name: "Differential Count", inputType: "text", defaultValue: "Lymphocytes: 75%, Mesothelial cells: 25%" },
              { id: "rbc_count", name: "RBC Count", inputType: "numeric", unit: "cells/µL", defaultValue: "500" },
              { id: "protein", name: "Protein", inputType: "numeric", unit: "g/dL", defaultValue: "2.4" },
              { id: "albumin", name: "Albumin", inputType: "numeric", unit: "g/dL", defaultValue: "1.4" },
              { id: "culture_stain", name: "Culture / Stain", inputType: "text", defaultValue: "No growth" },
              { id: "other_findings", name: "Other Findings", inputType: "text", defaultValue: "No atypical cells" },
              { id: "impression", name: "Impression", inputType: "text", defaultValue: "Normal peritoneal fluid findings." },
            ],
          },
        ],
      },
      {
        id: "csf_investigations",
        name: "CSF Investigations",
        tests: [
          {
            id: "test_csf_analysis",
            name: "CSF Analysis",
            code: "CSF-ANALYSIS",
            category: "MICROBIOLOGY",
            subModule: "CSF Investigations",
            sampleType: "Lumbar Puncture CSF (Sterile Plain Tubes)",
            price: 1100,
            parameters: [
              { id: "appearance_colour", name: "Appearance / Colour", inputType: "text", defaultValue: "Clear, colorless (Crystal clear)" },
              { id: "opening_pressure", name: "Opening Pressure (if measured)", inputType: "numeric", unit: "cm H2O", referenceRange: { low: 10, high: 20, text: "10–20 cm H2O" }, defaultValue: "14" },
              { id: "total_cell_count", name: "Total Cell Count", inputType: "numeric", unit: "cells/µL", referenceRange: { low: 0, high: 5, text: "0–5 cells/µL" }, defaultValue: "2" },
              { id: "differential_count", name: "Differential Count", inputType: "text", defaultValue: "100% Mononuclear (Lymphocytes)" },
              { id: "rbc_count", name: "RBC Count", inputType: "numeric", unit: "cells/µL", referenceRange: { low: 0, high: 0, text: "0 cells/µL" }, defaultValue: "0" },
              { id: "protein", name: "Protein", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 15, high: 45, text: "15–45 mg/dL" }, defaultValue: "28" },
              { id: "glucose", name: "Glucose", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 45, high: 80, text: "45–80 mg/dL (approx 60% of blood sugar)" }, defaultValue: "64" },
              { id: "other_findings", name: "Other Findings", inputType: "text", defaultValue: "Centrifuged supernatant is clear and colourless." },
              { id: "impression", name: "Impression", inputType: "text", defaultValue: "Normal CSF profile. No pleocytosis." },
            ],
          },
          {
            id: "test_csf_afb",
            name: "CSF AFB",
            code: "CSF-AFB",
            category: "MICROBIOLOGY",
            subModule: "CSF Investigations",
            sampleType: "CSF Deposit",
            price: 350,
            parameters: [
              { id: "afb_result", name: "AFB Result", inputType: "grade", defaultValue: "Negative for Acid Fast Bacilli" },
              { id: "remarks", name: "Remarks", inputType: "text", defaultValue: "Centrifuged cytospin deposit examined for 100 fields." },
            ],
          },
          {
            id: "test_csf_gram_stain",
            name: "CSF Gram Stain",
            code: "CSF-GRAM",
            category: "MICROBIOLOGY",
            subModule: "CSF Investigations",
            sampleType: "CSF Deposit",
            price: 300,
            parameters: [
              { id: "gram_reaction", name: "Gram Reaction", inputType: "text", defaultValue: "No organisms seen" },
              { id: "organisms", name: "Organisms", inputType: "text", defaultValue: "None" },
              { id: "cells_other_findings", name: "Cells / Other Findings", inputType: "text", defaultValue: "Rare lymphocytes, no polymorphs" },
            ],
          },
          {
            id: "test_csf_meningitis_panel",
            name: "CSF Meningitis Panel",
            code: "CSF-MENINGITIS-PANEL",
            category: "MICROBIOLOGY",
            subModule: "CSF Investigations",
            sampleType: "CSF (Fresh Sterile)",
            price: 3500,
            parameters: [
              { id: "panel_result", name: "Panel Result", inputType: "detected_not_detected", options: ["Not Detected", "Detected"], defaultValue: "Not Detected" },
              { id: "organism_target", name: "Organism / Target", inputType: "text", defaultValue: "Multiplex PCR panel covering common bacterial & viral pathogens negative" },
              { id: "remarks", name: "Remarks", inputType: "text", defaultValue: "Targets included: S. pneumoniae, N. meningitidis, H. influenzae, HSV-1/2, VZV, Enterovirus." },
            ],
          },
          {
            id: "test_csf_biofire",
            name: "CSF BioFire",
            code: "CSF-BIOFIRE",
            category: "MICROBIOLOGY",
            subModule: "CSF Investigations",
            sampleType: "CSF (Fresh Sterile)",
            price: 6500,
            parameters: [
              { id: "panel_result", name: "Panel Result", inputType: "detected_not_detected", options: ["Not Detected", "Detected"], defaultValue: "Not Detected" },
              { id: "detected_target", name: "Detected Target", inputType: "text", defaultValue: "None" },
              { id: "remarks", name: "Remarks", inputType: "text", defaultValue: "BioFire FilmArray ME Panel: 14 pathogens tested, all negative." },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 4. BIOCHEMISTRY
  // =========================================================================
  {
    id: "biochemistry",
    name: "BIOCHEMISTRY",
    subModules: [
      {
        id: "liver_function_related",
        name: "Liver Function / Related Tests",
        tests: [
          {
            id: "test_lft",
            name: "LFT / Liver Function Test",
            code: "LFT",
            category: "BIOCHEMISTRY",
            subModule: "Liver Function / Related Tests",
            sampleType: "Serum (Gold Top SST)",
            price: 750,
            parameters: [
              { id: "total_bilirubin", name: "Total Bilirubin", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 0.2, high: 1.2, text: "0.2–1.2 mg/dL" }, defaultValue: "0.8" },
              { id: "direct_bilirubin", name: "Direct Bilirubin", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 0.0, high: 0.3, text: "0.0–0.3 mg/dL" }, defaultValue: "0.2" },
              { id: "indirect_bilirubin", name: "Indirect Bilirubin", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 0.1, high: 0.9, text: "0.1–0.9 mg/dL" }, defaultValue: "0.6" },
              { id: "sgot_ast", name: "SGOT / AST", inputType: "numeric", unit: "U/L", referenceRange: { low: 10, high: 40, text: "10–40 U/L" }, defaultValue: "26" },
              { id: "sgpt_alt", name: "SGPT / ALT", inputType: "numeric", unit: "U/L", referenceRange: { low: 7, high: 56, text: "7–56 U/L" }, defaultValue: "32" },
              { id: "alp", name: "ALP", inputType: "numeric", unit: "U/L", referenceRange: { low: 44, high: 147, text: "44–147 U/L" }, defaultValue: "88" },
              { id: "total_protein", name: "Total Protein", inputType: "numeric", unit: "g/dL", referenceRange: { low: 6.0, high: 8.3, text: "6.0–8.3 g/dL" }, defaultValue: "7.1" },
              { id: "serum_albumin", name: "Serum Albumin", inputType: "numeric", unit: "g/dL", referenceRange: { low: 3.5, high: 5.0, text: "3.5–5.0 g/dL" }, defaultValue: "4.3" },
              { id: "globulin", name: "Globulin", inputType: "numeric", unit: "g/dL", referenceRange: { low: 2.0, high: 3.5, text: "2.0–3.5 g/dL" }, defaultValue: "2.8" },
              { id: "ag_ratio", name: "A/G Ratio", inputType: "numeric", referenceRange: { low: 1.2, high: 2.2, text: "1.2–2.2" }, defaultValue: "1.5" },
              { id: "ggt", name: "GGT", inputType: "numeric", unit: "U/L", referenceRange: { low: 9, high: 48, text: "9–48 U/L" }, defaultValue: "24" },
            ],
          },
          {
            id: "test_sgot_ast",
            name: "SGOT / AST",
            code: "AST",
            category: "BIOCHEMISTRY",
            subModule: "Liver Function / Related Tests",
            sampleType: "Serum",
            price: 200,
            parameters: [
              { id: "ast_sgot", name: "AST / SGOT", inputType: "numeric", unit: "U/L", referenceRange: { low: 10, high: 40, text: "10–40 U/L" }, defaultValue: "28" },
            ],
          },
          {
            id: "test_sgpt_alt",
            name: "SGPT / ALT",
            code: "ALT",
            category: "BIOCHEMISTRY",
            subModule: "Liver Function / Related Tests",
            sampleType: "Serum",
            price: 200,
            parameters: [
              { id: "alt_sgpt", name: "ALT / SGPT", inputType: "numeric", unit: "U/L", referenceRange: { low: 7, high: 56, text: "7–56 U/L" }, defaultValue: "30" },
            ],
          },
          {
            id: "test_ggt",
            name: "GGT",
            code: "GGT",
            category: "BIOCHEMISTRY",
            subModule: "Liver Function / Related Tests",
            sampleType: "Serum",
            price: 300,
            parameters: [
              { id: "gamma_gt_ggt", name: "Gamma GT / GGT", inputType: "numeric", unit: "U/L", referenceRange: { low: 9, high: 48, text: "9–48 U/L" }, defaultValue: "22" },
            ],
          },
          {
            id: "test_total_bilirubin",
            name: "Total Bilirubin",
            code: "TBIL",
            category: "BIOCHEMISTRY",
            subModule: "Liver Function / Related Tests",
            sampleType: "Serum",
            price: 180,
            parameters: [
              { id: "total_bilirubin", name: "Total Bilirubin", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 0.2, high: 1.2, text: "0.2–1.2 mg/dL" }, defaultValue: "0.7" },
            ],
          },
        ],
      },
      {
        id: "renal_metabolic_routine",
        name: "Renal / Metabolic / Routine Chemistry",
        tests: [
          {
            id: "test_rft",
            name: "RFT / Renal Function Tests",
            code: "RFT",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Serum (Gold Top SST)",
            price: 700,
            parameters: [
              { id: "bun", name: "Blood Urea Nitrogen (BUN)", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 7, high: 20, text: "7–20 mg/dL" }, defaultValue: "14" },
              { id: "creatinine", name: "Creatinine", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 0.7, high: 1.3, text: "0.7–1.3 mg/dL" }, defaultValue: "0.9" },
              { id: "uric_acid", name: "Uric Acid", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 3.5, high: 7.2, text: "3.5–7.2 mg/dL" }, defaultValue: "5.2" },
              { id: "egfr", name: "eGFR", inputType: "numeric", unit: "mL/min/1.73 m²", referenceRange: { low: 90, high: 150, text: "> 90 mL/min/1.73 m²" }, defaultValue: "105" },
              { id: "bun_creatinine_ratio", name: "BUN/Creatinine Ratio", inputType: "numeric", referenceRange: { low: 10, high: 20, text: "10–20" }, defaultValue: "15.5" },
            ],
          },
          {
            id: "test_bun",
            name: "BUN",
            code: "BUN",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Serum",
            price: 250,
            parameters: [
              { id: "bun", name: "BUN", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 7, high: 20, text: "7–20 mg/dL" }, defaultValue: "13" },
            ],
          },
          {
            id: "test_creatinine",
            name: "Creatinine",
            code: "CREAT",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Serum",
            price: 200,
            parameters: [
              { id: "serum_creatinine", name: "Serum Creatinine", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 0.7, high: 1.3, text: "0.7–1.3 mg/dL" }, defaultValue: "0.95" },
            ],
          },
          {
            id: "test_bun_creatinine_ratio",
            name: "BUN/Creatinine Ratio",
            code: "BUN-CR-RATIO",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Serum",
            price: 250,
            parameters: [
              { id: "bun_creatinine_ratio", name: "BUN/Creatinine Ratio", inputType: "numeric", referenceRange: { low: 10, high: 20, text: "10–20" }, defaultValue: "14.8" },
            ],
          },
          {
            id: "test_egfr",
            name: "eGFR",
            code: "EGFR",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Calculated",
            price: 200,
            parameters: [
              { id: "egfr", name: "eGFR", inputType: "numeric", unit: "mL/min/1.73 m²", referenceRange: { low: 90, high: 150, text: "> 90 mL/min/1.73 m²" }, defaultValue: "98" },
            ],
          },
          {
            id: "test_uric_acid",
            name: "Uric Acid",
            code: "URIC-ACID",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Serum",
            price: 220,
            parameters: [
              { id: "uric_acid", name: "Uric Acid", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 3.5, high: 7.2, text: "3.5–7.2 mg/dL" }, defaultValue: "5.4" },
            ],
          },
          {
            id: "test_fbs",
            name: "FBS",
            code: "FBS",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Fluoride Plasma",
            price: 120,
            parameters: [
              { id: "fasting_blood_sugar", name: "Fasting Blood Sugar", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 70, high: 99, criticalLow: 50, criticalHigh: 350, text: "70–99 mg/dL" }, defaultValue: "88" },
            ],
          },
          {
            id: "test_ppbs",
            name: "PPBS",
            code: "PPBS",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Fluoride Plasma (2h Post-prandial)",
            price: 120,
            parameters: [
              { id: "ppbs", name: "Post-Prandial Blood Sugar", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 70, high: 140, text: "< 140 mg/dL" }, defaultValue: "124" },
            ],
          },
          {
            id: "test_rbs",
            name: "RBS",
            code: "RBS",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Fluoride Plasma",
            price: 100,
            parameters: [
              { id: "random_blood_sugar", name: "Random Blood Sugar", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 70, high: 140, text: "70–140 mg/dL" }, defaultValue: "110" },
            ],
          },
          {
            id: "test_hba1c",
            name: "HbA1c",
            code: "HBA1C",
            category: "BIOCHEMISTRY",
            subModule: "Renal / Metabolic / Routine Chemistry",
            sampleType: "Whole Blood (EDTA)",
            price: 550,
            parameters: [
              { id: "hba1c", name: "HbA1c", inputType: "numeric", unit: "%", referenceRange: { low: 4.0, high: 5.6, text: "< 5.7 % (Non-diabetic), 5.7–6.4 % (Prediabetes), >= 6.5 % (Diabetic)" }, defaultValue: "5.4" },
              { id: "estimated_avg_glucose", name: "Estimated Average Glucose (if reported)", inputType: "numeric", unit: "mg/dL", referenceRange: { text: "100–125 mg/dL" }, defaultValue: "108" },
            ],
          },
        ],
      },
      {
        id: "lipid_protein_enzymes",
        name: "Lipid / Protein / Enzymes",
        tests: [
          {
            id: "test_lipid_profile",
            name: "Lipid Profile",
            code: "LIPID",
            category: "BIOCHEMISTRY",
            subModule: "Lipid / Protein / Enzymes",
            sampleType: "Serum (12h Fasting)",
            price: 650,
            parameters: [
              { id: "total_cholesterol", name: "Total Cholesterol", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 120, high: 200, text: "< 200 mg/dL" }, defaultValue: "175" },
              { id: "triglycerides", name: "Triglycerides", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 40, high: 150, text: "< 150 mg/dL" }, defaultValue: "128" },
              { id: "hdl_cholesterol", name: "HDL Cholesterol", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 40, high: 70, text: "> 40 mg/dL" }, defaultValue: "48" },
              { id: "ldl_cholesterol", name: "LDL Cholesterol", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 50, high: 100, text: "< 100 mg/dL (Optimal)" }, defaultValue: "94" },
              { id: "vldl_cholesterol", name: "VLDL Cholesterol", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 5, high: 30, text: "< 30 mg/dL" }, defaultValue: "25" },
              { id: "cholesterol_hdl_ratio", name: "Cholesterol/HDL Ratio (if reported)", inputType: "numeric", referenceRange: { low: 2.0, high: 5.0, text: "< 5.0" }, defaultValue: "3.6" },
            ],
          },
          {
            id: "test_total_protein",
            name: "Total Protein",
            code: "TP",
            category: "BIOCHEMISTRY",
            subModule: "Lipid / Protein / Enzymes",
            sampleType: "Serum",
            price: 180,
            parameters: [
              { id: "total_protein", name: "Total Protein", inputType: "numeric", unit: "g/dL", referenceRange: { low: 6.0, high: 8.3, text: "6.0–8.3 g/dL" }, defaultValue: "7.2" },
            ],
          },
          {
            id: "test_serum_albumin",
            name: "Serum Albumin",
            code: "ALB",
            category: "BIOCHEMISTRY",
            subModule: "Lipid / Protein / Enzymes",
            sampleType: "Serum",
            price: 180,
            parameters: [
              { id: "serum_albumin", name: "Serum Albumin", inputType: "numeric", unit: "g/dL", referenceRange: { low: 3.5, high: 5.0, text: "3.5–5.0 g/dL" }, defaultValue: "4.4" },
            ],
          },
          {
            id: "test_amylase",
            name: "Amylase",
            code: "AMYLASE",
            category: "BIOCHEMISTRY",
            subModule: "Lipid / Protein / Enzymes",
            sampleType: "Serum",
            price: 350,
            parameters: [
              { id: "amylase", name: "Amylase", inputType: "numeric", unit: "U/L", referenceRange: { low: 28, high: 100, text: "28–100 U/L" }, defaultValue: "55" },
            ],
          },
          {
            id: "test_lipase",
            name: "Lipase",
            code: "LIPASE",
            category: "BIOCHEMISTRY",
            subModule: "Lipid / Protein / Enzymes",
            sampleType: "Serum",
            price: 450,
            parameters: [
              { id: "lipase", name: "Lipase", inputType: "numeric", unit: "U/L", referenceRange: { low: 13, high: 60, text: "13–60 U/L" }, defaultValue: "35" },
            ],
          },
          {
            id: "test_cpk_total",
            name: "CPK Total",
            code: "CPK",
            category: "BIOCHEMISTRY",
            subModule: "Lipid / Protein / Enzymes",
            sampleType: "Serum",
            price: 400,
            parameters: [
              { id: "cpk_total", name: "Creatine Kinase / CPK Total", inputType: "numeric", unit: "U/L", referenceRange: { low: 30, high: 200, text: "30–200 U/L" }, defaultValue: "90" },
            ],
          },
          {
            id: "test_cpk_mb",
            name: "CPK-MB",
            code: "CKMB",
            category: "BIOCHEMISTRY",
            subModule: "Lipid / Protein / Enzymes",
            sampleType: "Serum",
            price: 450,
            parameters: [
              { id: "cpk_mb", name: "CK-MB", inputType: "numeric", unit: "U/L", referenceRange: { low: 0, high: 25, text: "0–25 U/L (or < 5.0 ng/mL)" }, defaultValue: "12" },
            ],
          },
        ],
      },
      {
        id: "electrolytes_minerals",
        name: "Electrolytes / Minerals",
        tests: [
          {
            id: "test_electrolytes",
            name: "Electrolytes",
            code: "ELECTROLYTES",
            category: "BIOCHEMISTRY",
            subModule: "Electrolytes / Minerals",
            sampleType: "Serum (Plain / Heparin)",
            price: 450,
            parameters: [
              { id: "sodium", name: "Sodium (Na+)", inputType: "numeric", unit: "mmol/L", referenceRange: { low: 135, high: 145, criticalLow: 120, criticalHigh: 160, text: "135–145 mmol/L" }, defaultValue: "140" },
              { id: "potassium", name: "Potassium (K+)", inputType: "numeric", unit: "mmol/L", referenceRange: { low: 3.5, high: 5.1, criticalLow: 2.8, criticalHigh: 6.2, text: "3.5–5.1 mmol/L" }, defaultValue: "4.2" },
              { id: "chloride", name: "Chloride (Cl-)", inputType: "numeric", unit: "mmol/L", referenceRange: { low: 98, high: 107, text: "98–107 mmol/L" }, defaultValue: "102" },
            ],
          },
          {
            id: "test_sodium",
            name: "Sodium",
            code: "NA",
            category: "BIOCHEMISTRY",
            subModule: "Electrolytes / Minerals",
            sampleType: "Serum",
            price: 180,
            parameters: [
              { id: "sodium", name: "Sodium (Na+)", inputType: "numeric", unit: "mmol/L", referenceRange: { low: 135, high: 145, text: "135–145 mmol/L" }, defaultValue: "141" },
            ],
          },
          {
            id: "test_potassium",
            name: "Potassium",
            code: "K",
            category: "BIOCHEMISTRY",
            subModule: "Electrolytes / Minerals",
            sampleType: "Serum",
            price: 180,
            parameters: [
              { id: "potassium", name: "Potassium (K+)", inputType: "numeric", unit: "mmol/L", referenceRange: { low: 3.5, high: 5.1, text: "3.5–5.1 mmol/L" }, defaultValue: "4.3" },
            ],
          },
          {
            id: "test_calcium",
            name: "Calcium",
            code: "CA",
            category: "BIOCHEMISTRY",
            subModule: "Electrolytes / Minerals",
            sampleType: "Serum",
            price: 200,
            parameters: [
              { id: "calcium", name: "Calcium", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 8.6, high: 10.2, text: "8.6–10.2 mg/dL" }, defaultValue: "9.4" },
            ],
          },
          {
            id: "test_magnesium",
            name: "Magnesium",
            code: "MG",
            category: "BIOCHEMISTRY",
            subModule: "Electrolytes / Minerals",
            sampleType: "Serum",
            price: 250,
            parameters: [
              { id: "magnesium", name: "Magnesium", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 1.7, high: 2.2, text: "1.7–2.2 mg/dL" }, defaultValue: "2.0" },
            ],
          },
          {
            id: "test_phosphorus",
            name: "Phosphorus",
            code: "PHOS",
            category: "BIOCHEMISTRY",
            subModule: "Electrolytes / Minerals",
            sampleType: "Serum",
            price: 220,
            parameters: [
              { id: "phosphorus", name: "Phosphorus", inputType: "numeric", unit: "mg/dL", referenceRange: { low: 2.5, high: 4.5, text: "2.5–4.5 mg/dL" }, defaultValue: "3.6" },
            ],
          },
        ],
      },
      {
        id: "cardiac_critical_care",
        name: "Cardiac / Critical Care Markers",
        tests: [
          {
            id: "test_troponin_i",
            name: "Troponin I",
            code: "TROP-I",
            category: "BIOCHEMISTRY",
            subModule: "Cardiac / Critical Care Markers",
            sampleType: "Serum / Heparin Plasma",
            price: 1500,
            parameters: [
              { id: "troponin_i", name: "Troponin I", inputType: "numeric", unit: "ng/mL", referenceRange: { low: 0, high: 0.04, criticalHigh: 0.1, text: "< 0.04 ng/mL" }, defaultValue: "0.01" },
              { id: "interpretation", name: "Interpretation", inputType: "text", defaultValue: "Within normal limits. Below cut-off for myocardial injury." },
            ],
          },
          {
            id: "test_nt_probnp",
            name: "NT-proBNP",
            code: "NT-PROBNP",
            category: "BIOCHEMISTRY",
            subModule: "Cardiac / Critical Care Markers",
            sampleType: "Serum / EDTA Plasma",
            price: 2200,
            parameters: [
              { id: "nt_probnp", name: "NT-proBNP", inputType: "numeric", unit: "pg/mL", referenceRange: { low: 0, high: 125, text: "< 125 pg/mL (< 75y: < 125, >= 75y: < 450)" }, defaultValue: "72" },
              { id: "interpretation", name: "Interpretation", inputType: "text", defaultValue: "Normal ventricular wall stress." },
            ],
          },
          {
            id: "test_procalcitonin",
            name: "Procalcitonin",
            code: "PCT",
            category: "BIOCHEMISTRY",
            subModule: "Cardiac / Critical Care Markers",
            sampleType: "Serum (SST)",
            price: 1800,
            parameters: [
              { id: "procalcitonin", name: "Procalcitonin", inputType: "numeric", unit: "ng/mL", referenceRange: { low: 0, high: 0.1, text: "< 0.1 ng/mL (< 0.5: Sepsis unlikely, >= 2.0: High risk)" }, defaultValue: "0.05" },
              { id: "interpretation", name: "Interpretation", inputType: "text", defaultValue: "Low risk of systemic bacterial infection." },
            ],
          },
          {
            id: "test_lactate",
            name: "Lactate",
            code: "LACTATE",
            category: "BIOCHEMISTRY",
            subModule: "Cardiac / Critical Care Markers",
            sampleType: "Fluoride / Heparin Plasma (on Ice)",
            price: 550,
            parameters: [
              { id: "lactate", name: "Lactate", inputType: "numeric", unit: "mmol/L", referenceRange: { low: 0.5, high: 2.0, criticalHigh: 4.0, text: "0.5–2.0 mmol/L" }, defaultValue: "1.2" },
            ],
          },
          {
            id: "test_d_dimer",
            name: "D-Dimer",
            code: "D-DIMER",
            category: "BIOCHEMISTRY",
            subModule: "Cardiac / Critical Care Markers",
            sampleType: "Citrated Plasma (Light Blue Top)",
            price: 1200,
            parameters: [
              { id: "d_dimer", name: "D-Dimer", inputType: "numeric", unit: "µg/mL FEU", referenceRange: { low: 0, high: 0.5, text: "< 0.5 µg/mL FEU" }, defaultValue: "0.25" },
            ],
          },
        ],
      },
      {
        id: "vitamins_hormones_special",
        name: "Vitamins / Hormones / Special Chemistry",
        tests: [
          {
            id: "test_vitamin_d",
            name: "Vitamin D",
            code: "VIT-D",
            category: "BIOCHEMISTRY",
            subModule: "Vitamins / Hormones / Special Chemistry",
            sampleType: "Serum",
            price: 1200,
            parameters: [
              { id: "vitamin_d_25oh", name: "25-OH Vitamin D", inputType: "numeric", unit: "ng/mL", referenceRange: { low: 30, high: 100, text: "30–100 ng/mL (Deficient: < 20)" }, defaultValue: "36.5" },
            ],
          },
          {
            id: "test_vitamin_b12",
            name: "Vitamin B12",
            code: "VIT-B12",
            category: "BIOCHEMISTRY",
            subModule: "Vitamins / Hormones / Special Chemistry",
            sampleType: "Serum",
            price: 900,
            parameters: [
              { id: "vitamin_b12", name: "Vitamin B12", inputType: "numeric", unit: "pg/mL", referenceRange: { low: 200, high: 900, text: "200–900 pg/mL" }, defaultValue: "485" },
            ],
          },
          {
            id: "test_cholinesterase",
            name: "Cholinesterase",
            code: "CHE",
            category: "BIOCHEMISTRY",
            subModule: "Vitamins / Hormones / Special Chemistry",
            sampleType: "Serum",
            price: 700,
            parameters: [
              { id: "cholinesterase", name: "Cholinesterase", inputType: "numeric", unit: "U/L", referenceRange: { low: 5320, high: 12920, text: "5,320–12,920 U/L" }, defaultValue: "8600" },
            ],
          },
          {
            id: "test_fsh",
            name: "FSH",
            code: "FSH",
            category: "BIOCHEMISTRY",
            subModule: "Vitamins / Hormones / Special Chemistry",
            sampleType: "Serum",
            price: 550,
            parameters: [
              { id: "fsh", name: "FSH", inputType: "numeric", unit: "mIU/mL", referenceRange: { low: 1.5, high: 12.4, text: "1.5–12.4 mIU/mL (Follicular)" }, defaultValue: "6.2" },
            ],
          },
          {
            id: "test_lh",
            name: "LH",
            code: "LH",
            category: "BIOCHEMISTRY",
            subModule: "Vitamins / Hormones / Special Chemistry",
            sampleType: "Serum",
            price: 550,
            parameters: [
              { id: "lh", name: "LH", inputType: "numeric", unit: "mIU/mL", referenceRange: { low: 1.7, high: 8.6, text: "1.7–8.6 mIU/mL" }, defaultValue: "4.8" },
            ],
          },
          {
            id: "test_prolactin",
            name: "Prolactin",
            code: "PROLACTIN",
            category: "BIOCHEMISTRY",
            subModule: "Vitamins / Hormones / Special Chemistry",
            sampleType: "Serum",
            price: 550,
            parameters: [
              { id: "prolactin", name: "Prolactin", inputType: "numeric", unit: "ng/mL", referenceRange: { low: 4.0, high: 23.0, text: "4.0–23.0 ng/mL" }, defaultValue: "11.5" },
            ],
          },
          {
            id: "test_beta_hcg",
            name: "β-HCG / B-HCG",
            code: "B-HCG",
            category: "BIOCHEMISTRY",
            subModule: "Vitamins / Hormones / Special Chemistry",
            sampleType: "Serum",
            price: 650,
            parameters: [
              { id: "beta_hcg", name: "β-HCG", inputType: "numeric", unit: "mIU/mL", referenceRange: { low: 0, high: 5, text: "< 5.0 mIU/mL (Non-pregnant)" }, defaultValue: "1.2" },
            ],
          },
          {
            id: "test_psa",
            name: "PSA",
            code: "PSA",
            category: "BIOCHEMISTRY",
            subModule: "Vitamins / Hormones / Special Chemistry",
            sampleType: "Serum",
            price: 750,
            parameters: [
              { id: "psa", name: "PSA", inputType: "numeric", unit: "ng/mL", referenceRange: { low: 0, high: 4.0, text: "< 4.0 ng/mL" }, defaultValue: "1.1" },
            ],
          },
          {
            id: "test_pth",
            name: "PTH",
            code: "PTH",
            category: "BIOCHEMISTRY",
            subModule: "Vitamins / Hormones / Special Chemistry",
            sampleType: "EDTA Plasma (Frozen)",
            price: 1100,
            parameters: [
              { id: "pth", name: "Parathyroid Hormone (PTH)", inputType: "numeric", unit: "pg/mL", referenceRange: { low: 15, high: 65, text: "15–65 pg/mL" }, defaultValue: "32.0" },
            ],
          },
        ],
      },
      {
        id: "iron_studies",
        name: "Iron Studies",
        tests: [
          {
            id: "test_iron_profile",
            name: "Iron Profile",
            code: "IRON-PROFILE",
            category: "BIOCHEMISTRY",
            subModule: "Iron Studies",
            sampleType: "Serum (Morning Fasting)",
            price: 850,
            parameters: [
              { id: "serum_iron", name: "Serum Iron", inputType: "numeric", unit: "µg/dL", referenceRange: { low: 60, high: 170, text: "60–170 µg/dL" }, defaultValue: "95" },
              { id: "tibc", name: "TIBC", inputType: "numeric", unit: "µg/dL", referenceRange: { low: 240, high: 450, text: "240–450 µg/dL" }, defaultValue: "320" },
              { id: "uibc", name: "UIBC (if reported)", inputType: "numeric", unit: "µg/dL", referenceRange: { low: 110, high: 370, text: "110–370 µg/dL" }, defaultValue: "225" },
              { id: "transferrin_sat", name: "Transferrin Saturation (if reported)", inputType: "numeric", unit: "%", referenceRange: { low: 20, high: 50, text: "20–50 %" }, defaultValue: "29.7" },
              { id: "ferritin", name: "Ferritin (if included)", inputType: "numeric", unit: "ng/mL", referenceRange: { low: 30, high: 400, text: "30–400 ng/mL" }, defaultValue: "145" },
            ],
          },
          {
            id: "test_iron",
            name: "Iron",
            code: "IRON",
            category: "BIOCHEMISTRY",
            subModule: "Iron Studies",
            sampleType: "Serum",
            price: 300,
            parameters: [
              { id: "serum_iron", name: "Serum Iron", inputType: "numeric", unit: "µg/dL", referenceRange: { low: 60, high: 170, text: "60–170 µg/dL" }, defaultValue: "92" },
            ],
          },
          {
            id: "test_tibc",
            name: "TIBC",
            code: "TIBC",
            category: "BIOCHEMISTRY",
            subModule: "Iron Studies",
            sampleType: "Serum",
            price: 350,
            parameters: [
              { id: "total_iron_binding_capacity", name: "Total Iron Binding Capacity", inputType: "numeric", unit: "µg/dL", referenceRange: { low: 240, high: 450, text: "240–450 µg/dL" }, defaultValue: "315" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 5. IMMUNOLOGY / SEROLOGY
  // =========================================================================
  {
    id: "immunology_serology",
    name: "IMMUNOLOGY / SEROLOGY",
    subModules: [
      {
        id: "autoimmune_tests",
        name: "Autoimmune Tests",
        tests: [
          {
            id: "test_ana",
            name: "ANA",
            code: "ANA",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Autoimmune Tests",
            sampleType: "Serum",
            price: 800,
            parameters: [
              { id: "ana_result", name: "ANA Result", inputType: "positive_negative", options: ["Negative", "Positive"], defaultValue: "Negative" },
              { id: "titer", name: "Titer (if applicable)", inputType: "text", defaultValue: "< 1:80" },
              { id: "pattern", name: "Pattern (if applicable)", inputType: "text", defaultValue: "None" },
            ],
          },
          {
            id: "test_ana_profile",
            name: "ANA Profile",
            code: "ANA-PROFILE",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Autoimmune Tests",
            sampleType: "Serum",
            price: 2500,
            parameters: [
              { id: "panel_result", name: "Panel Result", inputType: "text", defaultValue: "Negative for 15 autoantibody markers" },
              { id: "individual_antibodies", name: "Individual Antibodies", inputType: "text", defaultValue: "dsDNA: Neg, Sm: Neg, SS-A: Neg, SS-B: Neg, Scl-70: Neg, Jo-1: Neg" },
              { id: "overall_interpretation", name: "Overall Interpretation", inputType: "text", defaultValue: "No specific antinuclear autoantibodies detected by immunoblot." },
            ],
          },
          {
            id: "test_anca",
            name: "ANCA",
            code: "ANCA",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Autoimmune Tests",
            sampleType: "Serum",
            price: 1100,
            parameters: [
              { id: "anca_result", name: "ANCA Result", inputType: "positive_negative", options: ["Negative", "Positive"], defaultValue: "Negative" },
              { id: "titer", name: "Titer (if applicable)", inputType: "text", defaultValue: "< 1:20" },
              { id: "pattern", name: "Pattern (if applicable)", inputType: "text", defaultValue: "None (c-ANCA & p-ANCA Negative)" },
            ],
          },
          {
            id: "test_p_anca",
            name: "p-ANCA",
            code: "P-ANCA",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Autoimmune Tests",
            sampleType: "Serum",
            price: 850,
            parameters: [
              { id: "p_anca_result", name: "p-ANCA Result", inputType: "positive_negative", options: ["Negative", "Positive"], defaultValue: "Negative" },
              { id: "titer", name: "Titer (if applicable)", inputType: "text", defaultValue: "< 1:20" },
            ],
          },
          {
            id: "test_anti_ccp",
            name: "Anti-CCP",
            code: "ANTI-CCP",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Autoimmune Tests",
            sampleType: "Serum",
            price: 1200,
            parameters: [
              { id: "anti_ccp", name: "Anti-CCP", inputType: "numeric", unit: "U/mL", referenceRange: { low: 0, high: 20, text: "< 20 U/mL (Negative)" }, defaultValue: "4.5" },
              { id: "interpretation", name: "Interpretation", inputType: "text", defaultValue: "Negative for cyclic citrullinated peptide antibodies." },
            ],
          },
          {
            id: "test_total_ige",
            name: "Total IgE",
            code: "TOTAL-IGE",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Autoimmune Tests",
            sampleType: "Serum",
            price: 650,
            parameters: [
              { id: "total_ige", name: "Total IgE", inputType: "numeric", unit: "IU/mL", referenceRange: { low: 0, high: 100, text: "< 100 IU/mL" }, defaultValue: "45.0" },
            ],
          },
        ],
      },
      {
        id: "tumor_special_markers",
        name: "Tumor / Special Markers",
        tests: [
          {
            id: "test_ca_19_9",
            name: "CA 19-9",
            code: "CA19-9",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Tumor / Special Markers",
            sampleType: "Serum",
            price: 1100,
            parameters: [
              { id: "ca_19_9", name: "CA 19-9", inputType: "numeric", unit: "U/mL", referenceRange: { low: 0, high: 37, text: "< 37 U/mL" }, defaultValue: "12.4" },
            ],
          },
          {
            id: "test_ca_125",
            name: "CA 125",
            code: "CA125",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Tumor / Special Markers",
            sampleType: "Serum",
            price: 1100,
            parameters: [
              { id: "ca_125", name: "CA 125", inputType: "numeric", unit: "U/mL", referenceRange: { low: 0, high: 35, text: "< 35 U/mL" }, defaultValue: "14.2" },
            ],
          },
          {
            id: "test_cea",
            name: "CEA",
            code: "CEA",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Tumor / Special Markers",
            sampleType: "Serum",
            price: 950,
            parameters: [
              { id: "cea", name: "CEA", inputType: "numeric", unit: "ng/mL", referenceRange: { low: 0, high: 3.0, text: "< 3.0 ng/mL (Non-smoker), < 5.0 (Smoker)" }, defaultValue: "1.6" },
            ],
          },
          {
            id: "test_beta_hcg_tumor",
            name: "β-HCG",
            code: "B-HCG-MARKER",
            category: "IMMUNOLOGY / SEROLOGY",
            subModule: "Tumor / Special Markers",
            sampleType: "Serum",
            price: 700,
            parameters: [
              { id: "beta_hcg", name: "β-HCG", inputType: "numeric", unit: "mIU/mL", referenceRange: { low: 0, high: 5.0, text: "< 5.0 mIU/mL" }, defaultValue: "0.8" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 6. THYROID FUNCTION
  // =========================================================================
  {
    id: "thyroid_function",
    name: "THYROID FUNCTION",
    subModules: [
      {
        id: "tft_submodule",
        name: "TFT",
        tests: [
          {
            id: "test_tft",
            name: "TFT / Thyroid Function Test",
            code: "TFT",
            category: "THYROID FUNCTION",
            subModule: "TFT",
            sampleType: "Serum (Gold Top SST)",
            price: 750,
            parameters: [
              { id: "t3", name: "T3", inputType: "numeric", unit: "ng/mL", referenceRange: { low: 0.8, high: 2.0, text: "0.8–2.0 ng/mL" }, defaultValue: "1.25" },
              { id: "t4", name: "T4", inputType: "numeric", unit: "µg/dL", referenceRange: { low: 5.1, high: 14.1, text: "5.1–14.1 µg/dL" }, defaultValue: "8.6" },
              { id: "tsh", name: "TSH", inputType: "numeric", unit: "µIU/mL", referenceRange: { low: 0.4, high: 4.2, text: "0.4–4.2 µIU/mL" }, defaultValue: "2.10" },
              { id: "ft3", name: "FT3", inputType: "numeric", unit: "pg/mL", referenceRange: { low: 2.0, high: 4.4, text: "2.0–4.4 pg/mL" }, defaultValue: "3.1" },
              { id: "ft4", name: "FT4", inputType: "numeric", unit: "ng/dL", referenceRange: { low: 0.93, high: 1.7, text: "0.93–1.7 ng/dL" }, defaultValue: "1.24" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 7. OTHER SPECIAL TESTS
  // =========================================================================
  {
    id: "other_special_tests",
    name: "OTHER SPECIAL TESTS",
    subModules: [
      {
        id: "markers_calculated_blood_gas",
        name: "Markers / Calculated / Blood Gas",
        tests: [
          {
            id: "test_vbg",
            name: "VBG",
            code: "VBG",
            category: "OTHER SPECIAL TESTS",
            subModule: "Markers / Calculated / Blood Gas",
            sampleType: "Venous Blood Gas (Heparin Syringe)",
            price: 650,
            parameters: [
              { id: "ph", name: "pH", inputType: "numeric", referenceRange: { low: 7.31, high: 7.41, criticalLow: 7.15, criticalHigh: 7.60, text: "7.31–7.41" }, defaultValue: "7.36" },
              { id: "pco2", name: "pCO2", inputType: "numeric", unit: "mmHg", referenceRange: { low: 40, high: 52, text: "40–52 mmHg" }, defaultValue: "45.0" },
              { id: "po2", name: "pO2", inputType: "numeric", unit: "mmHg", referenceRange: { low: 30, high: 50, text: "30–50 mmHg" }, defaultValue: "38.0" },
              { id: "hco3", name: "HCO3-", inputType: "numeric", unit: "mmol/L", referenceRange: { low: 22, high: 29, text: "22–29 mmol/L" }, defaultValue: "24.5" },
              { id: "o2_sat", name: "O2 Saturation", inputType: "numeric", unit: "%", referenceRange: { low: 60, high: 85, text: "60–85 %" }, defaultValue: "72.0" },
              { id: "lactate_vbg", name: "Lactate (if reported)", inputType: "numeric", unit: "mmol/L", referenceRange: { low: 0.5, high: 2.2, text: "0.5–2.2 mmol/L" }, defaultValue: "1.1" },
              { id: "other_analyzer_params", name: "Other Analyzer Parameters", inputType: "text", defaultValue: "Base Excess: -0.5 mmol/L, tHb: 13.8 g/dL" },
            ],
          },
          {
            id: "test_pregnancy_beta_hcg",
            name: "Pregnancy Test / β-HCG",
            code: "PREGNANCY-HCG",
            category: "OTHER SPECIAL TESTS",
            subModule: "Markers / Calculated / Blood Gas",
            sampleType: "Urine / Serum",
            price: 350,
            parameters: [
              { id: "beta_hcg_result", name: "β-HCG Result", inputType: "numeric", unit: "mIU/mL", referenceRange: { text: "Negative: < 5 mIU/mL, Positive: > 25 mIU/mL" }, defaultValue: "2.1" },
              { id: "interpretation", name: "Interpretation", inputType: "text", defaultValue: "Negative. No detectable β-HCG elevation." },
            ],
          },
        ],
      },
    ],
  },
]

// ── Search & Helper Functions ───────────────────────────────────────────────

/** Flattened list of all test definitions across all 7 modules */
export const ALL_LAB_TESTS: LabTestDefinition[] = LAB_CATALOGUE.flatMap((module) =>
  module.subModules.flatMap((sub) => sub.tests)
)

/** Find test definition by ID, Code, or exact/fuzzy Name */
export function findTestDefinition(query: string): LabTestDefinition | undefined {
  if (!query) return undefined
  const q = query.trim().toLowerCase()
  
  // 1. Direct ID or Code match
  const direct = ALL_LAB_TESTS.find(
    (t) => t.id.toLowerCase() === q || t.code.toLowerCase() === q || t.name.toLowerCase() === q
  )
  if (direct) return direct

  // 2. Specific alias matches
  const aliasMap: Record<string, string> = {
    cbc: "CBC",
    "complete blood count": "CBC",
    "hemogram": "CBC",
    "complete hemogram": "CBC",
    dc: "DC",
    "differential count": "DC",
    lft: "LFT",
    "liver function test": "LFT",
    "liver function": "LFT",
    rft: "RFT",
    "renal function test": "RFT",
    "renal function": "RFT",
    kft: "RFT",
    cue: "CUE",
    "complete urine examination": "CUE",
    "routine urine": "URINE-ROUTINE",
    "urine routine": "URINE-ROUTINE",
    "urine analysis": "CUE",
    "urinalysis": "CUE",
    "urine culture": "URINE-CS",
    "urine c/s": "URINE-CS",
    "blood culture": "BLOOD-CS",
    "blood c/s": "BLOOD-CS",
    "pus culture": "PUS-CS",
    "pus c/s": "PUS-CS",
    "lipid profile": "LIPID",
    lipid: "LIPID",
    "lipids": "LIPID",
    tft: "TFT",
    "thyroid function test": "TFT",
    "thyroid profile": "TFT",
    thyroid: "TFT",
    electrolytes: "ELECTROLYTES",
    serum_electrolytes: "ELECTROLYTES",
    "blood group": "BG",
    "blood grouping": "BG",
    "blood group & rh": "BG",
    esr: "ESR",
    aec: "AEC",
    vbg: "VBG",
    "blood gas": "VBG",
    troponin: "TROP-I",
    "troponin i": "TROP-I",
    "d-dimer": "D-DIMER",
    hba1c: "HBA1C",
    fbs: "FBS",
    ppbs: "PPBS",
    rbs: "RBS",
    hiv: "HIV",
    hcv: "HCV",
    hbsag: "HBSAG",
  }

  const aliasTarget = aliasMap[q]
  if (aliasTarget) {
    const aliasHit = ALL_LAB_TESTS.find((t) => t.code.toUpperCase() === aliasTarget)
    if (aliasHit) return aliasHit
  }

  // 3. Substring matching: longest match wins
  const matches = ALL_LAB_TESTS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      q.includes(t.name.toLowerCase()) ||
      t.code.toLowerCase().includes(q) ||
      q.includes(t.code.toLowerCase())
  ).sort((a, b) => b.name.length - a.name.length)

  return matches[0]
}

/** Check if numeric value is outside reference range */
export function evaluateFlag(
  value: string | number,
  ref?: LabParameterDefinition["referenceRange"]
): "H" | "L" | "Critical" | "" {
  if (!ref) return ""
  const num = typeof value === "number" ? value : parseFloat(value)
  if (isNaN(num)) return ""

  if (ref.criticalLow !== undefined && num < ref.criticalLow) return "Critical"
  if (ref.criticalHigh !== undefined && num > ref.criticalHigh) return "Critical"
  if (ref.low !== undefined && num < ref.low) return "L"
  if (ref.high !== undefined && num > ref.high) return "H"

  return ""
}
