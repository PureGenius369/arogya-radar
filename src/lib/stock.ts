// Stock analytics: burn rates, days-of-stock, expiry waste in rupees, and
// redistribution recommendations. Deliberately plain arithmetic - every
// number here must be explainable to a district pharmacist in one sentence.

import type {
  BlockAlert,
  Drug,
  ExpiryRow,
  StockRow,
  StockStatus,
  TransferRec,
} from "./types";
import type { Store } from "./store";
import { haversineKm } from "./geo";

/** Average daily demand over the trailing 14 days (fallback: full window). */
export function burnRate(consumption30: number[]): number {
  const window = consumption30.length >= 14 ? consumption30.slice(-14) : consumption30;
  if (window.length === 0) return 0.05;
  const mu = window.reduce((a, b) => a + b, 0) / window.length;
  return Math.max(0.05, mu);
}

function totalQty(batches: { qty: number }[]): number {
  return batches.reduce((a, b) => a + b.qty, 0);
}

export function statusOf(stock: number, daysOfStock: number): StockStatus {
  if (stock <= 0) return "stockout";
  if (daysOfStock < 7) return "critical";
  if (daysOfStock < 14) return "low";
  if (daysOfStock > 90) return "surplus";
  return "ok";
}

export function stockRows(store: Store): StockRow[] {
  const { district, drugs, records } = store;
  const rows: StockRow[] = [];
  for (const fac of district.facilities) {
    const fd = records.facilities[fac.id];
    if (!fd) continue;
    for (const drug of drugs) {
      const ds = fd.stock[drug.id];
      if (!ds) continue;
      const stock = totalQty(ds.batches);
      const burn = burnRate(ds.consumption30);
      const days = Math.min(999, Math.round(stock / burn));
      rows.push({
        facilityId: fac.id,
        facilityName: fac.name,
        block: fac.block,
        drugId: drug.id,
        drugName: drug.name,
        unit: drug.unit,
        stock,
        burnRate: Math.round(burn * 10) / 10,
        daysOfStock: days,
        status: statusOf(stock, days),
      });
    }
  }
  return rows;
}

/**
 * Expected waste per batch under FEFO: consumption capacity before a batch
 * expires is burn * daysToExpiry, allocated to earlier-expiring batches
 * first. Whatever a batch cannot absorb becomes waste, valued at
 * procurement price.
 */
export function expiryRows(store: Store, horizonDays = 120): ExpiryRow[] {
  const { district, drugs, records } = store;
  const endDate = new Date(records.endDate + "T00:00:00Z").getTime();
  const rows: ExpiryRow[] = [];

  for (const fac of district.facilities) {
    const fd = records.facilities[fac.id];
    if (!fd) continue;
    for (const drug of drugs) {
      const ds = fd.stock[drug.id];
      if (!ds || ds.batches.length === 0) continue;
      const burn = burnRate(ds.consumption30);
      const sorted = [...ds.batches].sort((a, b) => (a.expiry < b.expiry ? -1 : 1));
      let allocated = 0;
      for (const batch of sorted) {
        const dte = Math.max(
          0,
          Math.round((new Date(batch.expiry + "T00:00:00Z").getTime() - endDate) / 86400000)
        );
        const capacity = burn * dte;
        const take = Math.min(batch.qty, Math.max(0, capacity - allocated));
        allocated += take;
        const waste = Math.round(batch.qty - take);
        if (waste > 0 && dte <= horizonDays) {
          rows.push({
            facilityId: fac.id,
            facilityName: fac.name,
            drugId: drug.id,
            drugName: drug.name,
            unit: drug.unit,
            batchId: batch.id,
            qty: batch.qty,
            expiry: batch.expiry,
            daysToExpiry: dte,
            expectedWasteUnits: waste,
            wasteValue: Math.round(waste * drug.price),
          });
        }
      }
    }
  }
  return rows.sort((a, b) => b.wasteValue - a.wasteValue);
}

interface Need {
  facilityId: string;
  drugId: string;
  qty: number;
  daysOfStock: number;
  reason: "stockout-relief" | "outbreak-preposition";
}

interface Source {
  facilityId: string;
  drugId: string;
  transferable: number;
  wasteUnits: number; // portion of transferable that would otherwise expire
}

/**
 * Greedy redistribution: worst shortages first, matched to the nearest
 * facility holding transferable surplus of the same drug. Transfers that
 * move stock which would otherwise expire are tagged expiry-prevention and
 * credited with the rupee value saved.
 */
export function transferRecs(store: Store, alerts: BlockAlert[]): TransferRec[] {
  const { district, drugs } = store;
  const rows = stockRows(store);
  const expiry = expiryRows(store, 120);
  const facById = new Map(district.facilities.map((f) => [f.id, f]));
  const drugById = new Map(drugs.map((d) => [d.id, d]));

  // Sources: keep 45 days of cover, offer the rest.
  const sources: Source[] = [];
  for (const r of rows) {
    const excess = r.stock - r.burnRate * 45;
    if (excess <= 0) continue;
    const waste = expiry
      .filter((e) => e.facilityId === r.facilityId && e.drugId === r.drugId)
      .reduce((a, e) => a + e.expectedWasteUnits, 0);
    sources.push({
      facilityId: r.facilityId,
      drugId: r.drugId,
      transferable: Math.floor(excess),
      wasteUnits: waste,
    });
  }

  // Needs: bring shortage facilities up to 30 days of cover.
  const needs: Need[] = [];
  for (const r of rows) {
    if (r.status === "stockout" || r.status === "critical" || r.status === "low") {
      needs.push({
        facilityId: r.facilityId,
        drugId: r.drugId,
        qty: Math.ceil(r.burnRate * (30 - r.daysOfStock)),
        daysOfStock: r.daysOfStock,
        reason: "stockout-relief",
      });
    }
  }

  // Outbreak pre-positioning: every facility in an alerted block should hold
  // at least 21 days of the outbreak-relevant drugs.
  const alertBlocks = alerts.filter((a) => a.severity !== "watch");
  for (const alert of alertBlocks) {
    const relevantDrugs = drugs.filter((d) => d.outbreak.includes(alert.syndrome));
    const blockFacs = district.facilities.filter((f) => f.block === alert.block);
    for (const fac of blockFacs) {
      for (const drug of relevantDrugs) {
        const row = rows.find((r) => r.facilityId === fac.id && r.drugId === drug.id);
        if (!row || row.daysOfStock >= 21) continue;
        const already = needs.find((n) => n.facilityId === fac.id && n.drugId === drug.id);
        if (already) {
          already.reason = "outbreak-preposition";
          continue;
        }
        needs.push({
          facilityId: fac.id,
          drugId: drug.id,
          qty: Math.ceil(row.burnRate * (21 - row.daysOfStock)),
          daysOfStock: row.daysOfStock,
          reason: "outbreak-preposition",
        });
      }
    }
  }

  needs.sort((a, b) => a.daysOfStock - b.daysOfStock);

  const recs: TransferRec[] = [];
  for (const need of needs) {
    let remaining = need.qty;
    const toFac = facById.get(need.facilityId);
    if (!toFac) continue;

    const candidates = sources
      .filter((s) => s.drugId === need.drugId && s.transferable > 0 && s.facilityId !== need.facilityId)
      .map((s) => {
        const fromFac = facById.get(s.facilityId)!;
        return { s, km: haversineKm(fromFac.lat, fromFac.lng, toFac.lat, toFac.lng) };
      })
      // Prefer sources whose stock would otherwise expire, then nearest.
      .sort((a, b) => (b.s.wasteUnits > 0 ? 1 : 0) - (a.s.wasteUnits > 0 ? 1 : 0) || a.km - b.km);

    for (const { s, km } of candidates) {
      if (remaining <= 0) break;
      const qty = Math.min(remaining, s.transferable);
      if (qty < 5 && remaining > 5) continue; // skip trivial partial transfers
      const drug = drugById.get(need.drugId)!;
      const savedUnits = Math.min(qty, s.wasteUnits);
      recs.push({
        drugId: need.drugId,
        drugName: drug.name,
        unit: drug.unit,
        fromId: s.facilityId,
        fromName: facById.get(s.facilityId)!.name,
        toId: need.facilityId,
        toName: toFac.name,
        qty,
        km: Math.round(km),
        reason: savedUnits > qty * 0.3 ? "expiry-prevention" : need.reason,
        valueSaved: Math.round(savedUnits * drug.price),
      });
      s.transferable -= qty;
      s.wasteUnits = Math.max(0, s.wasteUnits - qty);
      remaining -= qty;
    }
  }

  return recs.sort((a, b) => b.valueSaved - a.valueSaved).slice(0, 24);
}
