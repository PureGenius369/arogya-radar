export type FacilityType = "PHC" | "CHC" | "SDH" | "DHH";

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  block: string;
  lat: number;
  lng: number;
  catchment: number;
  beds: number;
}

export interface DistrictFile {
  district: string;
  state: string;
  center: { lat: number; lng: number };
  note: string;
  facilities: Facility[];
}

export interface Drug {
  id: string;
  name: string;
  unit: string;
  price: number;
  category: string;
  tiers: FacilityType[];
  perCase: Record<string, number>;
  dailyBase: number;
  outbreak: string[];
}

export const SYNDROMES = [
  "fever",
  "fever_rash",
  "diarrhoea",
  "ari",
  "jaundice",
  "snakebite",
  "maternal",
  "injury",
] as const;
export type Syndrome = (typeof SYNDROMES)[number];

export const SYNDROME_LABELS: Record<string, string> = {
  fever: "Fever (febrile illness)",
  fever_rash: "Fever with rash",
  diarrhoea: "Acute diarrhoeal disease",
  ari: "Acute respiratory infection",
  jaundice: "Acute jaundice",
  snakebite: "Snakebite",
  maternal: "ANC / maternal visits",
  injury: "Injury / trauma",
};

export interface Batch {
  id: string;
  qty: number;
  expiry: string; // ISO date
}

export interface DrugStock {
  batches: Batch[];
  consumption30: number[]; // daily demand, oldest first
}

export interface Reporter {
  name: string;
  role: string;
  staffId: string;
  photo?: string | null; // data URL captured on the spot (ephemeral without a DB)
}

export interface FacilityData {
  lastReportDaysAgo: number; // 0 = reported today
  lastReporter?: Reporter | null;
  doctorsSanctioned: number; // sanctioned doctor posts at this facility
  series: Record<string, number[]>; // footfall, bedOccupied, doctorsPresent, other, each syndrome
  stock: Record<string, DrugStock>;
}

export interface RecordsFile {
  generatedAt: string;
  endDate: string;
  days: string[];
  facilities: Record<string, FacilityData>;
}

// ---- Radar ----------------------------------------------------------------

export interface FacilitySignal {
  facilityId: string;
  facilityName: string;
  today: number;
  baselineMean: number;
  baselineSd: number;
  zscore: number;
  flaggedDays: number; // flagged days among last 3
  spark: number[]; // last 21 days
}

export type AlertSeverity = "watch" | "warning" | "alert";

export interface BlockAlert {
  id: string;
  block: string;
  syndrome: Syndrome;
  label: string;
  severity: AlertSeverity;
  facilities: FacilitySignal[];
  excessToday: number;
  trend: number[]; // block-level sum, last 21 days
  startedDaysAgo: number;
  message: string;
}

// ---- Stock ----------------------------------------------------------------

export type StockStatus = "stockout" | "critical" | "low" | "ok" | "surplus";

export interface StockRow {
  facilityId: string;
  facilityName: string;
  block: string;
  drugId: string;
  drugName: string;
  unit: string;
  stock: number;
  burnRate: number;
  daysOfStock: number;
  status: StockStatus;
}

export interface ExpiryRow {
  facilityId: string;
  facilityName: string;
  drugId: string;
  drugName: string;
  unit: string;
  batchId: string;
  qty: number;
  expiry: string;
  daysToExpiry: number;
  expectedWasteUnits: number;
  wasteValue: number;
}

export type TransferReason = "stockout-relief" | "expiry-prevention" | "outbreak-preposition";

export interface TransferRec {
  drugId: string;
  drugName: string;
  unit: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  qty: number;
  km: number;
  reason: TransferReason;
  valueSaved: number;
}

// ---- Intake ---------------------------------------------------------------

export interface IntakeStockLine {
  drugId: string;
  onHand: number;
  expiry?: string | null;
}

export interface IntakeReport {
  facilityId: string;
  date: string;
  footfall: number | null;
  syndromes: Partial<Record<Syndrome, number>>;
  bedOccupied?: number | null;
  doctorsPresent?: number | null;
  stock: IntakeStockLine[];
  notes?: string | null;
  uncertain?: string[];
  reporter?: Reporter | null;
}

// ---- Reporting compliance -------------------------------------------------

export type ComplianceSeverity = "ok" | "overdue" | "blindspot";

export interface ComplianceRow {
  facilityId: string;
  facilityName: string;
  block: string;
  type: FacilityType;
  daysSinceReport: number;
  severity: ComplianceSeverity;
  inAlertBlock: boolean;
  lastReporter?: Reporter | null;
}
