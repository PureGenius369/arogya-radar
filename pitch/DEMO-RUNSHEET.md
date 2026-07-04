# Arogya Radar — Live Demo Run Sheet
**Keep beside laptop · Delhi finals · ~5 min · one continuous session (don't reload into a cold server)**

---

## PRE-FLIGHT (do before you stand up)
- [ ] Open the live site: **arogya-radar-767054106508.asia-south1.run.app**
- [ ] Click **"Reset demo data"** (footer or banner) → opens on the clean outbreak scenario
- [ ] Dismiss the blue tour banner (✕) so the screen is clean
- [ ] Backup ready: `npm run dev` running locally in another tab + demo video open in a 3rd tab
- [ ] Optional: switch intake to Flash (~3s) for a faster live parse — remove `GEMINI_INTAKE_MODEL` line, or just use the sample
- [ ] Reset one last time right before you begin

---

## THE WALKTHROUGH  ( DO → SAY )

**0. HOOK — before clicking (20s)**
> "Every health centre in Kalahandi keeps a paper register that never leaves the building in time. So outbreaks are caught late and medicine runs out in one village while it expires in the next. Arogya Radar reads those registers every day. And this is live, running on Google Cloud right now."

**1. COMMAND CENTRE — top KPIs (30s)** → gesture across the 5 numbers
> "3 outbreak alerts. 17 medicines about to run out. ₹3.14 lakh about to expire unused. The whole district on one screen."

**2. OUTBREAK RADAR — the headline, slow down (60s)** → point at Lanjigarh alert
> "This is what no one else has. Lanjigarh — three centres, all spiking fever-with-rash. 41 cases where we'd expect 3. Flagged ~28 June — days before the government's weekly report would show it. In an outbreak those days are lives."
> "And it's not a black box — same statistics the CDC and WHO use. The officer sees exactly why it fired."

**3. MAP (20s)** → point at the red dashed ring, then a hollow grey pin
> "Real facilities, real locations. The red ring is the outbreak block. And these grey hollow pins — those are centres that have gone silent."

**4. BLIND SPOTS — the silence question (35s)** → scroll to "Reporting compliance" card
> "A reporting system's real enemy isn't bad data — it's no data. So we treat silence as a signal. PHC Gunupur has been quiet for 4 days — and it's *inside* the outbreak block. That's a blind spot: the dengue is spreading and we're blind to one centre in it."
> "And every report carries a name. So the officer doesn't chase a building — the system says: call Manoj Patra, the pharmacist who last reported. Accountability is built in."

**5. MONEY / TRANSFER — 'one move, two wins' (45s)** → transfers table, dengue-kit row
> "246 dengue test kits near expiry in the west, routed 64 km east to the outbreak. One move — saves ₹44,000 AND arms the response. Because the radar and the stock run on the same data."

---

## ⭐ 6. THE CENTREPIECE — PROVE IT'S LIVE (90s)
*This is the moment that wins the room. Do it slowly. Best move: report the silent blind-spot centre and watch it clear.*

> "It looks like a snapshot — let me show you it's live. I'll have that silent centre report in."

**DO:**
1. Click **Submit report** (top nav) → **/intake**
2. Pick **PHC Gunupur** (the blind spot) from the facility list → **Voice note** tab
3. Fill **Who is recording this** — name, staff ID, role — then **📷 Take reporter photo on the spot** (say: "the person is on the record — accountability")
4. Click **"▶ Load a sample voice note"** (or record live Hindi) → **Parse with Gemini →**
5. *While it thinks (~10s), fill the silence:*
   > "Gemini is reading a spoken report — Odia, Hindi or English. It keeps fever-with-rash separate from ordinary fever — that's the dengue signal."
6. Confirm screen appears →
   > "The AI drafts, the staff confirm. Uncertain fields are flagged — we don't blindly trust the machine with health data."
7. Click **Confirm & send to district** → then **"See what the district sees"**

**SAY (landing back on dashboard):**
> "Two things just happened. The blind spot closed — Gunupur is no longer silent. And every number recalculated: radar, stock, expiry, transfers. Nothing is hardcoded. A hundred centres reporting over a month re-run this engine every time. **This is a live calculation, not a static page.**"

*(Proven live: reporting the blind-spot centre drops "reporting blind spots" 2 → 1; a restock report drops "critical medicine lines" 17 → 16.)*

---

**7. THE BRIEF (20s)** → brief panel, click **ଓଡ଼ିଆ** or **हिन्दी** → Generate
> "One click writes the whole week as a plain-language brief, in the officer's own language — including which silent centres to chase."

**8. CLOSE — then STOP TALKING (15s)**
> "Earlier outbreak response, less medicine wasted, a district officer who sees every centre each morning. It runs on Google Cloud, works with the paper and phones people already have, and maps onto the government's IDSP system. It could pilot in Kalahandi next month. Thank you."

---

## Q&A — ONE-LINE ANSWERS

- **"Is it static?"** → "No — every number recomputes from live data on each load. Watch: [submit a report, show it change]."
- **"How do you know the stock?"** → "It's whatever the centre last reported; days-left = on-hand ÷ 2-week usage. Simple arithmetic on their data."
- **"After a month of data, does it re-route?"** → "Yes — every report re-runs the full engine: detection, forecasts, and transfers, all regenerated."
- **"What if a centre is lazy and doesn't report?"** → "Silence is a signal. We flag it — and a silent centre inside an outbreak block is a 'blind spot'. Every report has a name attached, so the officer knows exactly who to call. Low friction (a 30-sec voice note) removes the excuse; visibility supplies the reason."
- **"Where's the data stored?"** → "Prototype keeps it in memory to prove the engine. Production step is Firestore — the intelligence doesn't change, only where data lives." *(Say this before they ask — it shows you know the road to production.)*
- **"Is the data real?"** → "Facilities, medicines, prices, outbreak categories — all real public govt data. Daily activity is simulated because that data doesn't exist yet — creating it is the product."
- **"What's the actual AI?"** → "Gemini does the two things only AI can — read handwriting, understand spoken Odia/Hindi. Detection is transparent statistics so it's auditable."
- **"How does it scale / cost?"** → "Stateless on Cloud Run — scales district to state on the same pipeline. Intake is a voice note or one photo — low bandwidth."

---

## IF SOMETHING BREAKS
- Wifi dies → switch to the **localhost tab** (`npm run dev`), keep talking.
- Gemini slow/errors → use the **sample** (don't record live); or the parse still returns — just wait, narrate the fever-vs-rash point.
- Data looks wrong → hit **Reset demo data**, carry on.
- Total failure → **play the demo video tab**. Never freeze — keep narrating the story.
