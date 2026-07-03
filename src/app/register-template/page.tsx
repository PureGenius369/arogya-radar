import PrintButton from "@/components/PrintButton";
import { getStore } from "@/lib/store";
import { SYNDROMES, SYNDROME_LABELS } from "@/lib/types";

export default function RegisterTemplate() {
  const store = getStore();
  const drugs = store.drugs.filter((d) => d.tiers.includes("PHC")).slice(0, 10);

  return (
    <div>
      <div className="page-head no-print">
        <h1>Printable daily register</h1>
        <span className="asof">
          Print, fill by hand, photograph — the intake AI reads this layout (and the real registers
          it mimics)
        </span>
      </div>
      <p className="no-print" style={{ marginBottom: 14 }}>
        <PrintButton />
      </p>

      <div className="register-sheet">
        <h2 style={{ textAlign: "center", margin: "0 0 4px" }}>
          ଦୈନିକ ଓପିଡି ପଞ୍ଜିକା / Daily OPD Register
        </h2>
        <p style={{ textAlign: "center", margin: "0 0 16px", fontSize: 13 }}>
          Facility (କେନ୍ଦ୍ର): ________________________ &nbsp;&nbsp; Block: ________________ &nbsp;&nbsp;
          Date (ତାରିଖ): ____ / ____ / ________
        </p>

        <table>
          <thead>
            <tr>
              <th style={{ width: "60%" }}>Category / ବର୍ଗ</th>
              <th>Count / ସଂଖ୍ୟା</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Total OPD footfall / ମୋଟ ରୋଗୀ</strong>
              </td>
              <td></td>
            </tr>
            {SYNDROMES.map((s) => (
              <tr key={s}>
                <td>{SYNDROME_LABELS[s]}</td>
                <td></td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Beds occupied / ଶଯ୍ୟା ଭର୍ତ୍ତି</strong>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <h3 style={{ margin: "18px 0 8px", fontSize: 15 }}>Medicine stock / ଔଷଧ ଷ୍ଟକ</h3>
        <table>
          <thead>
            <tr>
              <th style={{ width: "50%" }}>Medicine / ଔଷଧ</th>
              <th>On hand / ଉପଲବ୍ଧ</th>
              <th>Earliest expiry / ମିଆଦ</th>
            </tr>
          </thead>
          <tbody>
            {drugs.map((d) => (
              <tr key={d.id}>
                <td>
                  {d.name} ({d.unit})
                </td>
                <td></td>
                <td></td>
              </tr>
            ))}
            <tr>
              <td></td>
              <td></td>
              <td></td>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginTop: 16, fontSize: 13 }}>
          Notes / ଟିପ୍ପଣୀ: ____________________________________________________________
        </p>
        <p style={{ fontSize: 13 }}>
          Signature (ଦସ୍ତଖତ): ____________________ &nbsp;&nbsp; Designation: ____________________
        </p>
      </div>
    </div>
  );
}
