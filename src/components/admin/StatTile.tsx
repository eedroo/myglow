/** Número em destaque + rótulo (backoffice). */
export function StatTile({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="mg-stat">
      <span className="mg-stat__value">{value}</span>
      <span className="mg-stat__label">{label}</span>
      {hint && <span className="mg-stat__hint">{hint}</span>}
    </div>
  );
}
