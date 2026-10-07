/**
 * Diagnostic Tariff & Price Master Database Service.
 * Allows Administration to change Laboratory Test prices and Radiology Scan amounts anytime.
 * Persists in LocalStorage with BroadcastChannel fan-out across browser tabs.
 */

export interface DiagnosticTariffItem {
  id: string
  code: string
  name: string
  category: "Laboratory" | "Radiology"
  subCategory: string
  price: number
  unit?: string
  roomOrDept?: string
  lastUpdated?: string
}

const STORAGE_KEY_DIAGNOSTIC_TARIFFS = "hospai_diagnostic_tariffs_v2"
const BROADCAST_CHANNEL = "hospai_diagnostic_tariffs"

// Initial 184 Laboratory Tests from Hospital Rate Card + Radiology Scans Rate Card
const INITIAL_LAB_TARIFFS: Omit<DiagnosticTariffItem, "id">[] = [
  // COLUMN 1 (1-46)
  { code: "LAB-001", name: "HB", category: "Laboratory", subCategory: "Haematology", price: 120 },
  { code: "LAB-002", name: "TC", category: "Laboratory", subCategory: "Haematology", price: 150 },
  { code: "LAB-003", name: "DC", category: "Laboratory", subCategory: "Haematology", price: 150 },
  { code: "LAB-004", name: "PLT", category: "Laboratory", subCategory: "Haematology", price: 240 },
  { code: "LAB-005", name: "CBP", category: "Laboratory", subCategory: "Haematology", price: 740 },
  { code: "LAB-006", name: "HEAMOGRAME", category: "Laboratory", subCategory: "Haematology", price: 740 },
  { code: "LAB-007", name: "ESR", category: "Laboratory", subCategory: "Haematology", price: 140 },
  { code: "LAB-008", name: "BLOOD GROUPING", category: "Laboratory", subCategory: "Blood Bank", price: 170 },
  { code: "LAB-009", name: "BT, CT", category: "Laboratory", subCategory: "Haematology", price: 240 },
  { code: "LAB-010", name: "PERIPHIRAL SMEAR", category: "Laboratory", subCategory: "Haematology", price: 740 },
  { code: "LAB-011", name: "AEC", category: "Laboratory", subCategory: "Haematology", price: 200 },
  { code: "LAB-012", name: "QBC FOR MP", category: "Laboratory", subCategory: "Parasitology", price: 660 },
  { code: "LAB-013", name: "PTT", category: "Laboratory", subCategory: "Coagulation", price: 430 },
  { code: "LAB-014", name: "APTT", category: "Laboratory", subCategory: "Coagulation", price: 410 },
  { code: "LAB-015", name: "PCV", category: "Laboratory", subCategory: "Haematology", price: 200 },
  { code: "LAB-016", name: "LFT", category: "Laboratory", subCategory: "Biochemistry", price: 1320 },
  { code: "LAB-017", name: "LIPID PROFILE", category: "Laboratory", subCategory: "Biochemistry", price: 1250 },
  { code: "LAB-018", name: "AMYLASE", category: "Laboratory", subCategory: "Biochemistry", price: 660 },
  { code: "LAB-019", name: "LIPASE", category: "Laboratory", subCategory: "Biochemistry", price: 1970 },
  { code: "LAB-020", name: "PHASPHOROUS", category: "Laboratory", subCategory: "Biochemistry", price: 500 },
  { code: "LAB-021", name: "BLOOD UREA", category: "Laboratory", subCategory: "Biochemistry", price: 260 },
  { code: "LAB-022", name: "FBS", category: "Laboratory", subCategory: "Diabetic Profile", price: 80 },
  { code: "LAB-023", name: "PPBS", category: "Laboratory", subCategory: "Diabetic Profile", price: 80 },
  { code: "LAB-024", name: "URIC ACID", category: "Laboratory", subCategory: "Biochemistry", price: 500 },
  { code: "LAB-025", name: "DENGUECHEEK", category: "Laboratory", subCategory: "Serology", price: 1490 },
  { code: "LAB-026", name: "WIDAL", category: "Laboratory", subCategory: "Serology", price: 330 },
  { code: "LAB-027", name: "CHICKENGUNIA", category: "Laboratory", subCategory: "Serology", price: 1650 },
  { code: "LAB-028", name: "MP CARD", category: "Laboratory", subCategory: "Parasitology", price: 300 },
  { code: "LAB-029", name: "CBP (SPECIAL)", category: "Laboratory", subCategory: "Haematology", price: 570 },
  { code: "LAB-030", name: "RA FACTOR", category: "Laboratory", subCategory: "Immunology", price: 660 },
  { code: "LAB-031", name: "ASO TITRE", category: "Laboratory", subCategory: "Immunology", price: 630 },
  { code: "LAB-032", name: "RPR", category: "Laboratory", subCategory: "Serology", price: 2450 },
  { code: "LAB-033", name: "TROPNIN T", category: "Laboratory", subCategory: "Cardiac Markers", price: 1650 },
  { code: "LAB-034", name: "TROPNING I", category: "Laboratory", subCategory: "Cardiac Markers", price: 1000 },
  { code: "LAB-035", name: "VIRALMARKERS", category: "Laboratory", subCategory: "Serology", price: 2400 },
  { code: "LAB-036", name: "HIV", category: "Laboratory", subCategory: "Serology", price: 830 },
  { code: "LAB-037", name: "HCV", category: "Laboratory", subCategory: "Serology", price: 910 },
  { code: "LAB-038", name: "HBSAG", category: "Laboratory", subCategory: "Serology", price: 660 },
  { code: "LAB-039", name: "UPI", category: "Laboratory", subCategory: "Clinical Pathology", price: 130 },
  { code: "LAB-040", name: "AMMONIA", category: "Laboratory", subCategory: "Biochemistry", price: 1710 },
  { code: "LAB-041", name: "LACTATE", category: "Laboratory", subCategory: "Critical Care", price: 1450 },
  { code: "LAB-042", name: "PROLACTIN", category: "Laboratory", subCategory: "Endocrinology", price: 1980 },
  { code: "LAB-043", name: "THYROID PROFILE", category: "Laboratory", subCategory: "Endocrinology", price: 1320 },
  { code: "LAB-044", name: "TSH", category: "Laboratory", subCategory: "Endocrinology", price: 500 },
  { code: "LAB-045", name: "T3", category: "Laboratory", subCategory: "Endocrinology", price: 500 },
  { code: "LAB-046", name: "T4", category: "Laboratory", subCategory: "Endocrinology", price: 500 },

  // COLUMN 2 (47-92)
  { code: "LAB-047", name: "FT3", category: "Laboratory", subCategory: "Endocrinology", price: 830 },
  { code: "LAB-048", name: "FT4", category: "Laboratory", subCategory: "Endocrinology", price: 830 },
  { code: "LAB-049", name: "LDH", category: "Laboratory", subCategory: "Biochemistry", price: 410 },
  { code: "LAB-050", name: "CHOLESTRENASE", category: "Laboratory", subCategory: "Biochemistry", price: 1650 },
  { code: "LAB-051", name: "D DIMER", category: "Laboratory", subCategory: "Coagulation", price: 2800 },
  { code: "LAB-052", name: "FERRITIN", category: "Laboratory", subCategory: "Biochemistry", price: 1300 },
  { code: "LAB-053", name: "TIBC", category: "Laboratory", subCategory: "Biochemistry", price: 1920 },
  { code: "LAB-054", name: "PSA", category: "Laboratory", subCategory: "Tumor Markers", price: 2110 },
  { code: "LAB-055", name: "LEPTOSPIRA IGM", category: "Laboratory", subCategory: "Serology", price: 2300 },
  { code: "LAB-056", name: "SERUM CARTISOL", category: "Laboratory", subCategory: "Endocrinology", price: 730 },
  { code: "LAB-057", name: "IL6", category: "Laboratory", subCategory: "Immunology", price: 3000 },
  { code: "LAB-058", name: "PROCALCITIONIN", category: "Laboratory", subCategory: "Critical Care", price: 3000 },
  { code: "LAB-059", name: "ELECTROLYTES", category: "Laboratory", subCategory: "Biochemistry", price: 1050 },
  { code: "LAB-060", name: "SR SODIUM", category: "Laboratory", subCategory: "Biochemistry", price: 500 },
  { code: "LAB-061", name: "SR POTASIUM", category: "Laboratory", subCategory: "Biochemistry", price: 500 },
  { code: "LAB-062", name: "SR CALCIUM", category: "Laboratory", subCategory: "Biochemistry", price: 660 },
  { code: "LAB-063", name: "SR BILURUBIN", category: "Laboratory", subCategory: "Biochemistry", price: 300 },
  { code: "LAB-064", name: "SR ALBUMIN", category: "Laboratory", subCategory: "Biochemistry", price: 210 },
  { code: "LAB-065", name: "CK-MB", category: "Laboratory", subCategory: "Cardiac Markers", price: 1250 },
  { code: "LAB-066", name: "CK-NAC", category: "Laboratory", subCategory: "Cardiac Markers", price: 1250 },
  { code: "LAB-067", name: "ABG", category: "Laboratory", subCategory: "Critical Care", price: 1320 },
  { code: "LAB-068", name: "CUE", category: "Laboratory", subCategory: "Clinical Pathology", price: 300 },
  { code: "LAB-069", name: "U/R", category: "Laboratory", subCategory: "Clinical Pathology", price: 180 },
  { code: "LAB-070", name: "TSUTSU", category: "Laboratory", subCategory: "Serology", price: 400 },
  { code: "LAB-071", name: "BLOOD C/S", category: "Laboratory", subCategory: "Microbiology", price: 1650 },
  { code: "LAB-072", name: "PUS C/S", category: "Laboratory", subCategory: "Microbiology", price: 660 },
  { code: "LAB-073", name: "URINE C/S", category: "Laboratory", subCategory: "Microbiology", price: 660 },
  { code: "LAB-074", name: "BIOPSY", category: "Laboratory", subCategory: "Histopathology", price: 1650 },
  { code: "LAB-075", name: "FNAC", category: "Laboratory", subCategory: "Cytopathology", price: 1440 },
  { code: "LAB-076", name: "AFB", category: "Laboratory", subCategory: "Microbiology", price: 500 },
  { code: "LAB-077", name: "GRAMS STAIN", category: "Laboratory", subCategory: "Microbiology", price: 500 },
  { code: "LAB-078", name: "SPUTAM C/S", category: "Laboratory", subCategory: "Microbiology", price: 660 },
  { code: "LAB-079", name: "MANTOX", category: "Laboratory", subCategory: "Microbiology", price: 330 },
  { code: "LAB-080", name: "RFT", category: "Laboratory", subCategory: "Biochemistry", price: 660 },
  { code: "LAB-081", name: "RBS", category: "Laboratory", subCategory: "Diabetic Profile", price: 80 },
  { code: "LAB-082", name: "TOTAL CHOLESTROL", category: "Laboratory", subCategory: "Biochemistry", price: 570 },
  { code: "LAB-083", name: "TRIGLYCERIDES", category: "Laboratory", subCategory: "Biochemistry", price: 700 },
  { code: "LAB-084", name: "SR IRON", category: "Laboratory", subCategory: "Biochemistry", price: 1920 },
  { code: "LAB-085", name: "GTT", category: "Laboratory", subCategory: "Diabetic Profile", price: 760 },
  { code: "LAB-086", name: "VDRL", category: "Laboratory", subCategory: "Serology", price: 330 },
  { code: "LAB-087", name: "OGCT", category: "Laboratory", subCategory: "Diabetic Profile", price: 120 },
  { code: "LAB-088", name: "LH", category: "Laboratory", subCategory: "Endocrinology", price: 1320 },
  { code: "LAB-089", name: "BETA HCGS", category: "Laboratory", subCategory: "Endocrinology", price: 1310 },
  { code: "LAB-090", name: "VITAMIN B12", category: "Laboratory", subCategory: "Biochemistry", price: 2640 },
  { code: "LAB-091", name: "VITAMIN D", category: "Laboratory", subCategory: "Biochemistry", price: 2640 },
  { code: "LAB-092", name: "TESTOSTIRON", category: "Laboratory", subCategory: "Endocrinology", price: 1980 },

  // COLUMN 3 (93-138)
  { code: "LAB-093", name: "CA 125", category: "Laboratory", subCategory: "Tumor Markers", price: 2640 },
  { code: "LAB-094", name: "MAJOR SURGICAL PROFILE", category: "Laboratory", subCategory: "Surgical Profiles", price: 3500 },
  { code: "LAB-095", name: "MINOR SURGICAL PROFILE", category: "Laboratory", subCategory: "Surgical Profiles", price: 1880 },
  { code: "LAB-096", name: "URINE SODIUM", category: "Laboratory", subCategory: "Clinical Pathology", price: 830 },
  { code: "LAB-097", name: "ABG (STAT)", category: "Laboratory", subCategory: "Critical Care", price: 1320 },
  { code: "LAB-098", name: "SGOT", category: "Laboratory", subCategory: "Biochemistry", price: 370 },
  { code: "LAB-099", name: "URINE KITONE BODIES", category: "Laboratory", subCategory: "Clinical Pathology", price: 180 },
  { code: "LAB-100", name: "SGPT", category: "Laboratory", subCategory: "Biochemistry", price: 370 },
  { code: "LAB-101", name: "ALP", category: "Laboratory", subCategory: "Biochemistry", price: 370 },
  { code: "LAB-102", name: "TOTAL PROTIEN", category: "Laboratory", subCategory: "Biochemistry", price: 250 },
  { code: "LAB-103", name: "FSH", category: "Laboratory", subCategory: "Endocrinology", price: 1320 },
  { code: "LAB-104", name: "SR CHLORIDE", category: "Laboratory", subCategory: "Biochemistry", price: 500 },
  { code: "LAB-105", name: "TRI DOT IGM", category: "Laboratory", subCategory: "Serology", price: 400 },
  { code: "LAB-106", name: "PAP SMEAR", category: "Laboratory", subCategory: "Cytopathology", price: 660 },
  { code: "LAB-107", name: "CSF ANALYSIS", category: "Laboratory", subCategory: "Clinical Pathology", price: 1160 },
  { code: "LAB-108", name: "MAGNANIUM", category: "Laboratory", subCategory: "Biochemistry", price: 1780 },
  { code: "LAB-109", name: "PLEURAL FLUID ANALYS", category: "Laboratory", subCategory: "Clinical Pathology", price: 560 },
  { code: "LAB-110", name: "HBA1C", category: "Laboratory", subCategory: "Diabetic Profile", price: 1120 },
  { code: "LAB-111", name: "STOOL EXAMINATION", category: "Laboratory", subCategory: "Clinical Pathology", price: 250 },
  { code: "LAB-112", name: "STOOL OCCULT BLOOD", category: "Laboratory", subCategory: "Clinical Pathology", price: 250 },
  { code: "LAB-113", name: "URINE CHILE", category: "Laboratory", subCategory: "Clinical Pathology", price: 250 },
  { code: "LAB-114", name: "SEMEN ANALYSIS", category: "Laboratory", subCategory: "Andrology", price: 580 },
  { code: "LAB-115", name: "BILESALTS / BILEPIGMENTS", category: "Laboratory", subCategory: "Clinical Pathology", price: 100 },
  { code: "LAB-116", name: "FEVER PROFILE", category: "Laboratory", subCategory: "Fever Profiles", price: 5400 },
  { code: "LAB-117", name: "COAGULATION PROFILE", category: "Laboratory", subCategory: "Coagulation", price: 760 },
  { code: "LAB-118", name: "COVID ANTI BODIES", category: "Laboratory", subCategory: "Serology", price: 1200 },
  { code: "LAB-119", name: "M.H.C.", category: "Laboratory", subCategory: "Health Checkups", price: 1500 },
  { code: "LAB-120", name: "E.H.C", category: "Laboratory", subCategory: "Health Checkups", price: 2500 },
  { code: "LAB-121", name: "CARDIACH PROFILE", category: "Laboratory", subCategory: "Cardiac Markers", price: 3300 },
  { code: "LAB-122", name: "FLUID LDH", category: "Laboratory", subCategory: "Biochemistry", price: 480 },
  { code: "LAB-123", name: "KARYOTYPING", category: "Laboratory", subCategory: "Genetics", price: 4700 },
  { code: "LAB-124", name: "ANA", category: "Laboratory", subCategory: "Immunology", price: 2200 },
  { code: "LAB-125", name: "ANA PROFILE", category: "Laboratory", subCategory: "Immunology", price: 6500 },
  { code: "LAB-126", name: "CSF PCR", category: "Laboratory", subCategory: "Molecular Biology", price: 380 },
  { code: "LAB-127", name: "ADA", category: "Laboratory", subCategory: "Biochemistry", price: 960 },
  { code: "LAB-128", name: "AMMIONA", category: "Laboratory", subCategory: "Biochemistry", price: 1710 },
  { code: "LAB-129", name: "TB PCR", category: "Laboratory", subCategory: "Molecular Biology", price: 3800 },
  { code: "LAB-130", name: "CA 1909", category: "Laboratory", subCategory: "Tumor Markers", price: 2500 },
  { code: "LAB-131", name: "PARATHYROPHORMON (PTH)", category: "Laboratory", subCategory: "Endocrinology", price: 2450 },
  { code: "LAB-132", name: "IRON", category: "Laboratory", subCategory: "Biochemistry", price: 1900 },
  { code: "LAB-133", name: "C-ANCA", category: "Laboratory", subCategory: "Immunology", price: 2030 },
  { code: "LAB-134", name: "P-ANCA", category: "Laboratory", subCategory: "Immunology", price: 2030 },
  { code: "LAB-135", name: "24 HRS URINE CREATININE", category: "Laboratory", subCategory: "Clinical Pathology", price: 830 },
  { code: "LAB-136", name: "SERUM OSMALITY", category: "Laboratory", subCategory: "Biochemistry", price: 1250 },
  { code: "LAB-137", name: "URINE OSMALITY", category: "Laboratory", subCategory: "Clinical Pathology", price: 830 },
  { code: "LAB-138", name: "URINE SODIUM (RPT)", category: "Laboratory", subCategory: "Clinical Pathology", price: 830 },

  // COLUMN 4 (139-184)
  { code: "LAB-139", name: "HCV RNA PCR", category: "Laboratory", subCategory: "Molecular Biology", price: 5500 },
  { code: "LAB-140", name: "C.PEPTISE LEVELS INSULIN ONTIBODIES", category: "Laboratory", subCategory: "Endocrinology", price: 1310 },
  { code: "LAB-141", name: "CSF TB PCR", category: "Laboratory", subCategory: "Molecular Biology", price: 380 },
  { code: "LAB-142", name: "ASO TITER", category: "Laboratory", subCategory: "Immunology", price: 660 },
  { code: "LAB-143", name: "GAMA GGT", category: "Laboratory", subCategory: "Biochemistry", price: 750 },
  { code: "LAB-144", name: "BODY FLUIDS PCR", category: "Laboratory", subCategory: "Molecular Biology", price: 1250 },
  { code: "LAB-145", name: "ANTI HEV IGM", category: "Laboratory", subCategory: "Serology", price: 2200 },
  { code: "LAB-146", name: "ANTI HAV IGM", category: "Laboratory", subCategory: "Serology", price: 2600 },
  { code: "LAB-147", name: "ANA IF", category: "Laboratory", subCategory: "Immunology", price: 2000 },
  { code: "LAB-148", name: "FIBRINIGEN", category: "Laboratory", subCategory: "Coagulation", price: 2000 },
  { code: "LAB-149", name: "CEA", category: "Laboratory", subCategory: "Tumor Markers", price: 1650 },
  { code: "LAB-150", name: "AFP", category: "Laboratory", subCategory: "Tumor Markers", price: 1650 },
  { code: "LAB-151", name: "DOBLE MARKAR", category: "Laboratory", subCategory: "Maternal Screening", price: 4000 },
  { code: "LAB-152", name: "URINE TB PCR", category: "Laboratory", subCategory: "Molecular Biology", price: 3800 },
  { code: "LAB-153", name: "AMH", category: "Laboratory", subCategory: "Endocrinology", price: 3500 },
  { code: "LAB-154", name: "FLUID CBNAAJ", category: "Laboratory", subCategory: "Molecular Biology", price: 1500 },
  { code: "LAB-155", name: "SPUTUM CBNAAJ", category: "Laboratory", subCategory: "Molecular Biology", price: 1000 },
  { code: "LAB-156", name: "BICARBONATE", category: "Laboratory", subCategory: "Biochemistry", price: 1180 },
  { code: "LAB-157", name: "CD4 COUNT", category: "Laboratory", subCategory: "Immunology", price: 3750 },
  { code: "LAB-158", name: "CD3", category: "Laboratory", subCategory: "Immunology", price: 500 },
  { code: "LAB-159", name: "CD4", category: "Laboratory", subCategory: "Immunology", price: 1250 },
  { code: "LAB-160", name: "C4", category: "Laboratory", subCategory: "Immunology", price: 1250 },
  { code: "LAB-161", name: "SERUM NT PROB NP LEVELS", category: "Laboratory", subCategory: "Cardiac Markers", price: 3450 },
  { code: "LAB-162", name: "SERUM AJDESTERONELEVELS", category: "Laboratory", subCategory: "Endocrinology", price: 2800 },
  { code: "LAB-163", name: "ANTI CCP", category: "Laboratory", subCategory: "Immunology", price: 2630 },
  { code: "LAB-164", name: "TB GOLD", category: "Laboratory", subCategory: "Molecular Biology", price: 4250 },
  { code: "LAB-165", name: "HUNTING TONS GENE", category: "Laboratory", subCategory: "Genetics", price: 6500 },
  { code: "LAB-166", name: "TRIPLE MARKER", category: "Laboratory", subCategory: "Maternal Screening", price: 4130 },
  { code: "LAB-167", name: "ANTI TPO", category: "Laboratory", subCategory: "Endocrinology", price: 2440 },
  { code: "LAB-168", name: "BETA HCG", category: "Laboratory", subCategory: "Endocrinology", price: 1310 },
  { code: "LAB-169", name: "CSF MEANINGETIS PANEL", category: "Laboratory", subCategory: "Molecular Biology", price: 5500 },
  { code: "LAB-170", name: "LKM", category: "Laboratory", subCategory: "Immunology", price: 2940 },
  { code: "LAB-171", name: "URINE PH", category: "Laboratory", subCategory: "Clinical Pathology", price: 80 },
  { code: "LAB-172", name: "ACTH", category: "Laboratory", subCategory: "Endocrinology", price: 3000 },
  { code: "LAB-173", name: "ASMA", category: "Laboratory", subCategory: "Immunology", price: 1370 },
  { code: "LAB-174", name: "MITOCHONFRIAL ANTIBODIES", category: "Laboratory", subCategory: "Immunology", price: 2630 },
  { code: "LAB-175", name: "STOOL C/S", category: "Laboratory", subCategory: "Microbiology", price: 810 },
  { code: "LAB-176", name: "PAP SMEAR (REPEAT)", category: "Laboratory", subCategory: "Cytopathology", price: 660 },
  { code: "LAB-177", name: "BUN", category: "Laboratory", subCategory: "Biochemistry", price: 250 },
  { code: "LAB-178", name: "ET", category: "Laboratory", subCategory: "Biochemistry", price: 810 },
  { code: "LAB-179", name: "RSP", category: "Laboratory", subCategory: "Immunology", price: 1650 },
  { code: "LAB-180", name: "RETICLO", category: "Laboratory", subCategory: "Haematology", price: 500 },
  { code: "LAB-181", name: "SPETURE AFL", category: "Laboratory", subCategory: "Microbiology", price: 440 },
  { code: "LAB-182", name: "C3", category: "Laboratory", subCategory: "Immunology", price: 1250 },
  { code: "LAB-183", name: "TPO", category: "Laboratory", subCategory: "Endocrinology", price: 2440 },
  { code: "LAB-184", name: "AFP (ONCO)", category: "Laboratory", subCategory: "Tumor Markers", price: 1650 },

  // RADIOLOGY SCANS (DUMMY RATE CARD)
  { code: "RAD-XR-001", name: "Chest X-Ray PA/Lateral", category: "Radiology", subCategory: "X-Ray", price: 450, roomOrDept: "XR-1" },
  { code: "RAD-XR-002", name: "X-Ray Right Hip AP & Frog-Leg Lateral", category: "Radiology", subCategory: "X-Ray", price: 550, roomOrDept: "XR-1" },
  { code: "RAD-XR-003", name: "X-Ray Cervical Spine AP & Lateral", category: "Radiology", subCategory: "X-Ray", price: 600, roomOrDept: "XR-2" },
  { code: "RAD-XR-004", name: "X-Ray KUB", category: "Radiology", subCategory: "X-Ray", price: 450, roomOrDept: "XR-2" },
  { code: "RAD-CT-001", name: "CT Head w/o IV Contrast", category: "Radiology", subCategory: "CT Scan", price: 3500, roomOrDept: "CT-1" },
  { code: "RAD-CT-002", name: "CT Abdomen & Pelvis with IV Contrast", category: "Radiology", subCategory: "CT Scan", price: 5500, roomOrDept: "CT-2" },
  { code: "RAD-CT-003", name: "HRCT Chest (High Resolution CT)", category: "Radiology", subCategory: "CT Scan", price: 4800, roomOrDept: "CT-1" },
  { code: "RAD-MR-001", name: "MRI Brain 3T with Angiography", category: "Radiology", subCategory: "MRI", price: 8500, roomOrDept: "MR-1" },
  { code: "RAD-MR-002", name: "MRI Lumbar Spine", category: "Radiology", subCategory: "MRI", price: 7200, roomOrDept: "MR-1" },
  { code: "RAD-US-001", name: "Ultrasound Abdomen & Pelvis (USG)", category: "Radiology", subCategory: "Ultrasound (USG)", price: 1400, roomOrDept: "US-1" },
  { code: "RAD-US-002", name: "Doppler Arterial & Venous Lower Limb", category: "Radiology", subCategory: "Doppler", price: 2800, roomOrDept: "Echo-1" },
  { code: "RAD-MAM-001", name: "Digital Mammography Bilateral", category: "Radiology", subCategory: "Mammography", price: 2500, roomOrDept: "XR-2" },
  { code: "RAD-FLU-001", name: "Barium Swallow & Upper GI Fluoroscopy", category: "Radiology", subCategory: "Fluoroscopy", price: 3200, roomOrDept: "XR-2" },
]

export class DiagnosticTariffDatabase {
  private static listeners: Set<() => void> = new Set()

  private static load(): DiagnosticTariffItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DIAGNOSTIC_TARIFFS)
      if (raw) return JSON.parse(raw)
    } catch {}

    // Seed defaults if not present
    const seeded = INITIAL_LAB_TARIFFS.map((t) => ({
      ...t,
      id: t.code,
      lastUpdated: new Date().toISOString().split("T")[0],
    }))
    this.save(seeded)
    return seeded
  }

  private static save(items: DiagnosticTariffItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_DIAGNOSTIC_TARIFFS, JSON.stringify(items))
      this.notify()
    } catch {}
  }

  private static notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn()
      } catch {}
    })
    try {
      const ch = new BroadcastChannel(BROADCAST_CHANNEL)
      ch.postMessage("updated")
      ch.close()
    } catch {}
  }

  static onUpdate(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  static getAllTariffs(): DiagnosticTariffItem[] {
    return this.load()
  }

  static getTariffs(): DiagnosticTariffItem[] {
    return this.load()
  }

  static getLabTariffs(): DiagnosticTariffItem[] {
    return this.load().filter((t) => t.category === "Laboratory")
  }

  static getRadiologyTariffs(): DiagnosticTariffItem[] {
    return this.load().filter((t) => t.category === "Radiology")
  }

  static getTariffPriceByName(nameOrCode: string): number | null {
    if (!nameOrCode) return null
    const items = this.load()
    const rawQ = nameOrCode.trim()
    const q = rawQ.toLowerCase().replace(/\s*\([^\)]*\)/g, "").trim()

    // 1. Direct ID or Code match
    const byCode = items.find(
      (i) => i.code.toLowerCase() === rawQ.toLowerCase() || i.id.toLowerCase() === rawQ.toLowerCase(),
    )
    if (byCode) return byCode.price

    // 2. Exact name match
    const byName = items.find(
      (i) => i.name.toLowerCase() === rawQ.toLowerCase() || i.name.toLowerCase() === q,
    )
    if (byName) return byName.price

    // 3. Substring / parenthetical match
    const matched = items.find((i) => {
      const itemLow = i.name.toLowerCase()
      const itemClean = itemLow.replace(/\s*\([^\)]*\)/g, "").trim()
      return (
        itemLow === q ||
        itemClean === q ||
        rawQ.toLowerCase().includes(itemLow) ||
        rawQ.toLowerCase().includes(itemClean) ||
        itemLow.includes(q) ||
        itemClean.includes(q)
      )
    })
    if (matched) return matched.price

    return null
  }

  static updateTariffPrice(idOrCode: string, newPrice: number): DiagnosticTariffItem | null {
    const items = this.load()
    const idx = items.findIndex((i) => i.id === idOrCode || i.code === idOrCode)
    if (idx === -1) return null

    items[idx] = {
      ...items[idx],
      price: newPrice,
      lastUpdated: new Date().toISOString().split("T")[0],
    }
    this.save(items)
    return items[idx]
  }

  static updateTariffItem(idOrCode: string, updates: Partial<DiagnosticTariffItem>): DiagnosticTariffItem | null {
    const items = this.load()
    const idx = items.findIndex((i) => i.id === idOrCode || i.code === idOrCode)
    if (idx === -1) return null

    items[idx] = {
      ...items[idx],
      ...updates,
      lastUpdated: new Date().toISOString().split("T")[0],
    }
    this.save(items)
    return items[idx]
  }

  static addTariffItem(item: Omit<DiagnosticTariffItem, "id"> & { id?: string }): DiagnosticTariffItem {
    const items = this.load()
    const newId = item.id || item.code || `TEST-${Date.now()}`
    const newItem: DiagnosticTariffItem = {
      ...item,
      id: newId,
      lastUpdated: new Date().toISOString().split("T")[0],
    }
    items.unshift(newItem)
    this.save(items)
    return newItem
  }

  static deleteTariffItem(idOrCode: string): boolean {
    const items = this.load()
    const filtered = items.filter((i) => i.id !== idOrCode && i.code !== idOrCode)
    if (filtered.length === items.length) return false
    this.save(filtered)
    return true
  }

  static resetToHospitalRateCard(): DiagnosticTariffItem[] {
    const seeded = INITIAL_LAB_TARIFFS.map((t) => ({
      ...t,
      id: t.code,
      lastUpdated: new Date().toISOString().split("T")[0],
    }))
    this.save(seeded)
    return seeded
  }
}
