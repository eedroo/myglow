import Link from 'next/link';
import { getAdminMetrics } from '@/lib/metrics/server';
import { GlassCard } from '@/components/ui/GlassCard';
import { MetricCard } from '@/components/admin/MetricCard';
import { ActivityBars } from '@/components/admin/ActivityBars';
import { FunnelTable } from '@/components/admin/FunnelTable';
import { RetentionTable } from '@/components/admin/RetentionTable';
import { AdminTable } from '@/components/admin/AdminTable';

/** Métricas de produto, calculadas a pedido a partir da base de dados (só totais). */
export default async function AdminMetricsPage() {
  const m = await getAdminMetrics();
  const n = (v: number) => v.toLocaleString('pt-PT');
  return (
    <>
      <h1 className="mg-admin__title">Métricas</h1>
      <p className="mg-admin__note">Dias em UTC. A actividade conta a partir da Fase 12.</p>

      <GlassCard title="Utilizadores">
        <div className="mg-admin__tiles">
          <MetricCard value={n(m.users.total)} label="Contas" />
          <MetricCard value={n(m.users.new7)} label="Novos em 7 dias" />
          <MetricCard value={n(m.users.new30)} label="Novos em 30 dias" />
          <MetricCard value={n(m.users.premium)} label="Premium" />
          <MetricCard value={n(m.users.interested)} label="Interessados no premium" />
        </div>
      </GlassCard>

      <GlassCard title="Actividade">
        <div className="mg-admin__tiles">
          <MetricCard value={n(m.activity.dau)} label="DAU" hint="hoje" />
          <MetricCard value={n(m.activity.wau)} label="WAU" hint="7 dias" />
          <MetricCard value={n(m.activity.mau)} label="MAU" hint="30 dias" />
          <MetricCard value={`${Math.round(m.activity.stickiness * 100)}%`} label="Stickiness" hint="DAU / MAU" />
        </div>
        <ActivityBars days={m.activity.byDay} />
      </GlassCard>

      <GlassCard title="Funil do onboarding">
        <FunnelTable steps={m.funnel} />
      </GlassCard>

      <GlassCard title="Retenção (coortes semanais)">
        <div className="mg-admin__scroll">
          <RetentionTable cohorts={m.retention} />
        </div>
      </GlassCard>

      <GlassCard title="Grimório">
        <div className="mg-admin__tiles">
          <MetricCard value={n(m.grimoire.lessons7)} label="Lições em 7 dias" />
          <MetricCard value={n(m.grimoire.coursesCompleted)} label="Cursos concluídos" hint="total" />
        </div>
      </GlassCard>

      <GlassCard title="Avisos (7 dias)">
        {m.notifications.length === 0 ? (
          <p>Sem avisos.</p>
        ) : (
          <div className="mg-admin__scroll">
            <AdminTable
              caption="Avisos dos últimos 7 dias"
              columns={[
                { key: 'kind', label: 'Tipo' },
                { key: 'sent', label: 'Enviados', numeric: true },
                { key: 'opened', label: 'Abertos', numeric: true },
                { key: 'rate', label: '% abertos', numeric: true },
              ]}
              rows={m.notifications.map((r) => ({
                kind: r.kind,
                sent: n(r.sent),
                opened: n(r.opened),
                rate: r.sent ? `${Math.round((100 * r.opened) / r.sent)}%` : '–',
              }))}
            />
          </div>
        )}
        <p className="mg-admin__note">Aberto = tocado na notificação ou na caixa de avisos.</p>
      </GlassCard>

      <GlassCard title="Retrospectivas (4 semanas)">
        {m.recaps.length === 0 ? (
          <p>Sem retrospectivas vistas.</p>
        ) : (
          <div className="mg-admin__scroll">
            <AdminTable
              caption="Retrospectivas abertas nas últimas 4 semanas"
              columns={[
                { key: 'kind', label: 'Tipo' },
                { key: 'viewed', label: 'Vistas', numeric: true },
                { key: 'completed', label: 'Concluídas', numeric: true },
                { key: 'rate', label: '% conclusão', numeric: true },
              ]}
              rows={m.recaps.map((r) => ({
                kind: r.kind === 'WEEK' ? 'Semanal' : 'Mensal',
                viewed: n(r.viewed),
                completed: n(r.completed),
                rate: r.viewed ? `${Math.round((100 * r.completed) / r.viewed)}%` : '–',
              }))}
            />
          </div>
        )}
        <p className="mg-admin__note">Concluída = chegou ao último slide.</p>
      </GlassCard>

      <GlassCard title="Guia (4 semanas)">
        <div className="mg-admin__tiles">
          <MetricCard value={n(m.guide.consented)} label="Com consentimento" hint="agora" />
          <MetricCard value={n(m.guide.byStatus.READY)} label="Prontas" />
          <MetricCard value={n(m.guide.byStatus.INSUFFICIENT)} label="Sem dados suficientes" />
          <MetricCard value={n(m.guide.byStatus.SUPPORT)} label="Modo apoio" />
          <MetricCard value={n(m.guide.byStatus.FAILED)} label="Falhadas" />
          <MetricCard
            value={m.guide.rated ? `${Math.round((100 * m.guide.helped) / m.guide.rated)}%` : '–'}
            label="Ajudou"
            hint={`${n(m.guide.rated)} avaliadas`}
          />
          <MetricCard value={n(m.guide.inputTokens + m.guide.outputTokens)} label="Tokens" hint={`${n(m.guide.inputTokens)} entrada · ${n(m.guide.outputTokens)} saída`} />
          <MetricCard value={`$${m.guide.costUsd.toFixed(2)}`} label="Custo estimado" hint="preços em lib/guide/cost.ts" />
        </div>
        <p className="mg-admin__note">Só contagens: o conteúdo das leituras nunca aparece aqui.</p>
      </GlassCard>

      <GlassCard title="Feedback">
        <div className="mg-admin__tiles">
          <MetricCard value={n(m.feedback.total)} label="Total" />
          <MetricCard value={n(m.feedback.last7)} label="Últimos 7 dias" />
        </div>
        <p className="mg-admin__note">
          <Link href="/admin/feedback">Ver o feedback</Link>
        </p>
      </GlassCard>
    </>
  );
}
