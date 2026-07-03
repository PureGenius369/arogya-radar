// Sanity harness: runs the full analytics pipeline on the generated data
// and prints what the dashboard will show. Run with: node scripts/check.ts

import { getStore } from "../src/lib/store";
import { buildDashboard } from "../src/lib/analytics";

const store = getStore();
const dash = buildDashboard(store);

console.log("=== KPIs ===");
console.log(dash.kpis);

console.log("\n=== Alerts ===");
for (const a of dash.alerts) {
  console.log(`[${a.severity.toUpperCase()}] ${a.block} — ${a.label}`);
  console.log("   " + a.message);
  for (const f of a.facilities) {
    console.log(
      `   ${f.facilityName}: today ${f.today} vs baseline ${f.baselineMean}±${f.baselineSd} (z=${f.zscore}, flagged ${f.flaggedDays}/3 days)`
    );
  }
}

console.log("\n=== Worst shortages (top 10) ===");
for (const s of dash.shortages.slice(0, 10)) {
  console.log(
    `${s.facilityName} | ${s.drugName}: ${s.stock} ${s.unit} = ${s.daysOfStock}d of stock [${s.status}]`
  );
}

console.log("\n=== Expiry risk (top 8) ===");
for (const e of dash.expiry.slice(0, 8)) {
  console.log(
    `${e.facilityName} | ${e.drugName}: ${e.expectedWasteUnits}/${e.qty} ${e.unit} will expire ${e.expiry} → Rs ${e.wasteValue.toLocaleString("en-IN")}`
  );
}
console.log(`District total expiry waste (120d): Rs ${dash.expiryTotal.toLocaleString("en-IN")}`);

console.log("\n=== Transfers (top 10) ===");
for (const tr of dash.transfers.slice(0, 10)) {
  console.log(
    `${tr.drugName}: ${tr.qty} ${tr.unit} ${tr.fromName} → ${tr.toName} (${tr.km} km) [${tr.reason}]` +
      (tr.valueSaved > 0 ? ` saves Rs ${tr.valueSaved.toLocaleString("en-IN")}` : "")
  );
}
