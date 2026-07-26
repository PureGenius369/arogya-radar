# Arogya Radar — proposal for a no-cost outbreak-detection pilot in Dahod

**To:** Health & Family Welfare Department, Government of Gujarat
**From:** Mann Sutaria, Arogya Radar
**Re:** A 6-week, zero-cost, read-only pilot to detect disease outbreaks and prevent medicine waste — starting in one block of Dahod district

---

## The ask (up front)

Permission to run a **6-week pilot in one block of Dahod district**, with the blessing of the CDHO/Collector. It is **read-only** — it changes nothing the department currently runs — and it costs the state **nothing** (it runs on Google Cloud's free tier). We ask only for: (1) access to the block's existing e-Aushadhi drug-stock data, and (2) a nod for a few PHC staff to send a daily one-line WhatsApp update. In return we will prove one number: **how many days earlier an outbreak can be caught.**

## The problem

Gujarat's PHCs and CHCs generate the earliest signal of every outbreak — but on paper, and in systems that report weekly or monthly. By the time a fever-with-rash cluster shows up in a routine report, it is days old. Medicines, meanwhile, run out in one facility while expiring unused in another, because no one sees both at once in time.

## What Arogya Radar does

It is **not another data-entry system** — the department already has enough of those. It is an **intelligence layer** that reads data Gujarat *already collects* and turns it into same-day action:

- **Outbreak radar** — CDC/WHO-style aberration detection (auditable statistics, not a black box) flags a block when several centres rise together, days before a weekly report would.
- **A second radar with zero reporting** — it infers outbreaks from **medicine consumption** in the existing **e-Aushadhi** supply-chain data. It works even if not one facility files a symptom report.
- **Stock & expiry** — days-to-stockout and rupees-about-to-expire per facility, from e-Aushadhi, with the transfers that fix both at once.

## Why it is safe to say yes

- **Read-only.** It reads existing data and advises. It cannot alter any government record or process.
- **No new burden.** It rides on e-Aushadhi and, for the last mile, a 30-second WhatsApp voice note or a photo of the register staff already keep — not a new form.
- **Auditable.** Every alert shows exactly why it fired. Officers act on evidence, not on "the AI said so."
- **Zero cost, zero lock-in.** Free-tier hosting; state owns all data; open formats (see the data-governance note).

## What the Dahod pilot will prove

One headline metric, measured against the block's own routine reports:

> *"The radar flagged the cluster **N days earlier** than the weekly cycle — and surfaced **₹X** of medicine that would have expired unused."*

(Our calibrated Dahod scenario shows ~7–9 days of lead time and ₹3+ lakh of preventable expiry in a single district. The pilot measures the real figure.)

## Cost, timeline, and the next step

- **Cost to the state:** ₹0.
- **Timeline:** 6 weeks — 1 to set up, 4 to run, 1 to report.
- **Next step:** a 20-minute walkthrough of the live Dahod dashboard, and identifying one willing block.

*A working demonstration covering all 33 districts, live on Dahod, is available now.*
