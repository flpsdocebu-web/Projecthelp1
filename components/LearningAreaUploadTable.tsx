import type { LearningAreaUpload, UploadSummary } from "@/lib/learning-area-uploads";

export default function LearningAreaUploadTable({ areas, totals, hasOther, totalLabel = "Total uploads", emptyMessage = "No resources have been uploaded yet." }: { areas: LearningAreaUpload[]; totals: UploadSummary["totals"]; hasOther: boolean; totalLabel?: string; emptyMessage?: string }) {
  return <div className="area-upload-table" role="region" aria-label="Learning-area upload counts" tabIndex={0}><table>
    <caption className="sr-only">Uploaded resources by learning area, Term 1, Term 2, Term 3, and Full Year. Counts include all current uploads.</caption>
    <thead><tr><th scope="col">Learning area</th><th scope="col">Term 1</th><th scope="col">Term 2</th><th scope="col">Term 3</th><th scope="col">Full Year</th>{hasOther && <th scope="col">Other / unspecified</th>}<th scope="col">Total</th></tr></thead>
    <tbody>{areas.map((area) => <tr key={area.learningArea}><th scope="row">{area.learningArea}</th><td>{area.term1.toLocaleString()}</td><td>{area.term2.toLocaleString()}</td><td>{area.term3.toLocaleString()}</td><td>{area.fullYear.toLocaleString()}</td>{hasOther && <td>{area.other.toLocaleString()}</td>}<td><strong>{area.total.toLocaleString()}</strong></td></tr>)}{!areas.length && <tr><td colSpan={hasOther ? 7 : 6} className="area-upload-empty">{emptyMessage}</td></tr>}</tbody>
    <tfoot><tr><th scope="row">{totalLabel}</th><td>{totals.term1.toLocaleString()}</td><td>{totals.term2.toLocaleString()}</td><td>{totals.term3.toLocaleString()}</td><td>{totals.fullYear.toLocaleString()}</td>{hasOther && <td>{totals.other.toLocaleString()}</td>}<td>{totals.total.toLocaleString()}</td></tr></tfoot>
  </table></div>;
}
