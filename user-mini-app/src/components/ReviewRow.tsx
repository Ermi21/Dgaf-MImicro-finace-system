/** Shared ReviewRow — a labelled value pair used on the Register review
 *  step and the Profile page. Centralises the markup so both pages stay
 *  in sync without copy-paste. */
export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-row">
      <div className="review-row__label">{label}</div>
      <div className="review-row__value">{value}</div>
    </div>
  );
}
