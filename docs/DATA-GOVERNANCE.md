# Arogya Radar — data governance & security note

A one-page answer to the first question any Health Secretary asks: *is our citizens' health data safe, lawful, and ours?* Written for the Gujarat pilot and statewide rollout.

---

## 1. What data the system holds — and what it does not

- **Holds:** facility-level *aggregates* — daily OPD counts by symptom category, bed occupancy, and drug stock/consumption/expiry per facility; plus the *identity of the staff member* who files each report (name, role, staff ID) for accountability.
- **Does NOT hold:** individual patient names, addresses, or clinical records. The radar works entirely on counts and stock — no patient-level PII is required or collected.

## 2. Ownership

The **State owns all data.** Arogya Radar is a processor acting on the department's behalf, never the owner. On exit, the department receives a full export in open formats and all instances are wiped — **no lock-in.**

## 3. Hosting & data residency

- Hosted in an **India region** (Google Cloud `asia-south1`, Mumbai) for the pilot; for statewide production, deployable to the **state's own environment** — Gujarat Informatics Ltd (GIL) / State Data Centre / GI-Cloud (MeghRaj) — so data never leaves government-controlled infrastructure.
- Encryption **in transit** (TLS) and **at rest** by default.

## 4. Access control

- **Role-based access**, mirroring the health administration: State → District (CDHO) → Block → Facility. Each user sees only their level and below.
- Authentication via phone/OTP or the department's existing SSO. **Full audit log** of every access and action.

## 5. Legal & regulatory compliance

- Built to comply with the **Digital Personal Data Protection Act, 2023 (DPDP)** — data minimisation (aggregates only), purpose limitation (public-health surveillance), and the State as Data Fiduciary.
- Aligned with national health-data direction (ABDM / health-data management policy) for future interoperability.

## 6. Integration — reads existing systems, does not replace them

Arogya Radar is a decision layer *on top of* the department's investments, via **authorised departmental data access / data-sharing agreements** — not public APIs:

| System | Direction | Purpose |
|---|---|---|
| **e-Aushadhi / DVDMS (GMSCL)** | read | drug stock, consumption, expiry |
| **TeCHO+** | read | frontline field data |
| **IHIP / IDSP** | read + **export back** | baseline; and pushing alerts into the official channel |
| **eVIN** | read (optional) | vaccine cold-chain stock |

It **exports into IHIP/IDSP formats**, so it strengthens the official reporting chain rather than creating a parallel one.

## 7. Reliability & continuity

- Stateless application tier, managed database with automated backups; scales to statewide facility volumes.
- Degrades gracefully: if a feed is missing or a facility is silent, the block-level radar still operates on the data it has, and the gap is shown as a *reporting blind spot* rather than failing silently.

---

*Prepared for the Government of Gujarat pilot. Specifics (hosting location, SSO provider, data-sharing scope) to be finalised with the department's IT and legal teams.*
