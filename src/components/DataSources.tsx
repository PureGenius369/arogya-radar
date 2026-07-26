import { DATA_FEEDS } from "@/lib/sources";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  live: { label: "live", cls: "ok" },
  "pilot-sim": { label: "pilot: simulated", cls: "neutral" },
  planned: { label: "planned", cls: "watch" },
};

export default function DataSources() {
  const entryFree = DATA_FEEDS.filter((f) => f.entryFree).length;
  return (
    <div>
      <p className="sub">
        Every number on this dashboard is assembled from systems that already collect it — not from
        a new reporting burden. {entryFree} of {DATA_FEEDS.length} feeds need <strong>no data entry
        at all</strong>; the last is a 30-second voice note or a photo of the register staff already
        fill, only where nothing digital exists yet.
      </p>
      <div className="data-feeds">
        {DATA_FEEDS.map((f) => {
          const s = STATUS_LABEL[f.status];
          return (
            <div key={f.id} className={`feed ${f.entryFree ? "entry-free" : "field"}`}>
              <div className="feed-head">
                <span className="feed-name">{f.name}</span>
                <span className={`badge ${s.cls}`}>{s.label}</span>
              </div>
              <div className="feed-op">{f.operator}</div>
              <div className="feed-provides">{f.provides}</div>
              <div className="feed-foot">
                <span className={`entry-tag ${f.entryFree ? "no-entry" : "capture"}`}>
                  {f.entryFree ? "✓ no data entry" : "last-mile capture"}
                </span>
                <span className="feed-into">→ {f.feedsInto}</span>
              </div>
              <div className="feed-note">{f.note}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
