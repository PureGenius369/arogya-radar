import { getStore } from "@/lib/store";
import IntakeClient from "@/components/IntakeClient";

export const dynamic = "force-dynamic";

export default function IntakePage() {
  const store = getStore();
  const facilities = store.district.facilities.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    block: f.block,
  }));
  const drugs = store.drugs.map((d) => ({ id: d.id, name: d.name, unit: d.unit, tiers: d.tiers }));

  return (
    <div>
      <div className="page-head">
        <h1>Facility daily report</h1>
        <span className="asof">30 seconds by voice or photo — no forms, no typing required</span>
      </div>
      <IntakeClient facilities={facilities} drugs={drugs} today={store.records.endDate} />
    </div>
  );
}
