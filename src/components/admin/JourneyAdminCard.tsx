import type { AdminMetrics } from '@/lib/metrics/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MetricCard } from './MetricCard';
import { AdminTable } from './AdminTable';

const NAMES: Record<string, string> = {
  'stage-2': 'Etapa 2 · Soltar',
  'stage-3': 'Etapa 3 · Rituais',
  'stage-4': 'Etapa 4 · Corpo',
  'stage-5': 'Etapa 5 · Reflexão',
  'month-year': 'Mês e Ano',
};

/** F19 (admin): a jornada da metodologia, só com contagens. */
export function JourneyAdminCard({ journey: j }: { journey: AdminMetrics['journey'] }) {
  const n = (v: number) => v.toLocaleString('pt-PT');
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '–');
  const ceremonies = j.ceremonies.seen + j.ceremonies.dismissed;
  return (
    <GlassCard title="Jornada">
      <div className="mg-admin__tiles">
        <MetricCard value={pct(j.allUnlocked, j.total)} label="Desbloquearam tudo" hint={`${n(j.allUnlocked)} pessoas`} />
        <MetricCard value={pct(j.ceremonies.seen, ceremonies)} label="Mini-lições até ao fim" hint={`${n(j.ceremonies.dismissed)} fechadas antes`} />
      </div>
      <div className="mg-admin__scroll">
        <AdminTable
          caption="Pessoas por etapa"
          columns={[
            { key: 'stage', label: 'Etapa' },
            { key: 'users', label: 'Pessoas', numeric: true },
          ]}
          rows={j.byStage.map((r) => ({ stage: String(r.stage), users: n(r.users) }))}
        />
        <AdminTable
          caption="Dias desde o registo até cada etapa (mediana)"
          columns={[
            { key: 'unlock', label: 'Desbloqueio' },
            { key: 'days', label: 'Mediana (dias)', numeric: true },
            { key: 'users', label: 'Pessoas', numeric: true },
          ]}
          rows={j.medianDays.map((r) => ({ unlock: NAMES[r.unlockId] ?? r.unlockId, days: r.days === null ? '–' : String(r.days), users: n(r.users) }))}
        />
      </div>
      <p className="mg-admin__note">Sem os desbloqueios do mapeamento da v2 nem os de «desbloquear tudo».</p>
    </GlassCard>
  );
}
