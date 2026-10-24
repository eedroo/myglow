import type { DateISO } from '@/lib/dates';

const label = (d: DateISO) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Activos por dia (últimos 30 dias) em barras CSS; os valores também numa tabela para leitores de ecrã. */
export function ActivityBars({ days }: { days: { day: DateISO; count: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <>
      <div className="mg-admin-bars" aria-hidden="true">
        {days.map((d) => (
          <span key={d.day} className="mg-admin-bars__bar" title={`${label(d.day)}: ${d.count}`}>
            <span className="mg-admin-bars__fill" style={{ height: `${(100 * d.count) / max}%` }} />
          </span>
        ))}
      </div>
      <div className="mg-admin-bars__axis" aria-hidden="true">
        <span>{label(days[0]!.day)}</span>
        <span>{label(days[days.length - 1]!.day)}</span>
      </div>
      <table className="mg-visually-hidden">
        <caption>Activos por dia</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{label(d.day)}</th>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
