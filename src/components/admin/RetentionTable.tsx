import type { CohortRetention } from '@/lib/metrics/retention';
import { AdminTable } from './AdminTable';

const pct = (v: number | null) => (v === null ? '–' : `${v}%`);

/** D1/D7/D30 das últimas coortes semanais (domingo); "–" quando o dia ainda não chegou. */
export function RetentionTable({ cohorts }: { cohorts: CohortRetention[] }) {
  return (
    <AdminTable
      caption="Retenção por coorte semanal"
      columns={[
        { key: 'week', label: 'Semana de' },
        { key: 'size', label: 'Registos', numeric: true },
        { key: 'd1', label: 'D1', numeric: true },
        { key: 'd7', label: 'D7', numeric: true },
        { key: 'd30', label: 'D30', numeric: true },
      ]}
      rows={[...cohorts].reverse().map((c) => ({
        week: `${c.cohortStart.slice(8, 10)}/${c.cohortStart.slice(5, 7)}`,
        size: c.size,
        d1: pct(c.d1),
        d7: pct(c.d7),
        d30: pct(c.d30),
      }))}
    />
  );
}
