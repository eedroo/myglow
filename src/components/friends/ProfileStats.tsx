import { MagicIcon } from '@/components/ui/MagicIcon';
import type { MagicIconName } from '@/lib/icons';

export interface ProfileStatTile {
  key: string;
  icon: MagicIconName;
  value: number | string;
  label: string;
}

/** Atributos em mosaico, ao estilo de um jogo. */
export function ProfileStats({ tiles, label }: { tiles: ProfileStatTile[]; label: string }) {
  return (
    <ul className="mg-profile-stats" aria-label={label}>
      {tiles.map((t) => (
        <li key={t.key} className="mg-profile-stats__tile">
          <span className="mg-profile-stats__icon">
            <MagicIcon name={t.icon} size="md" decorative />
          </span>
          <span className="mg-profile-stats__value">{t.value}</span>
          <span className="mg-profile-stats__label">{t.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Missão actual": o curso em curso. */
export function ProfileQuest({ title, text, done, total }: { title: string; text: string; done: number; total: number }) {
  const pct = Math.round((100 * done) / Math.max(1, total));
  return (
    <section className="mg-profile-quest" aria-label={title}>
      <span className="mg-profile-quest__eyebrow">
        <MagicIcon name="scroll" size="sm" decorative />
        {title}
      </span>
      <p className="mg-profile-quest__text">{text}</p>
      <div className="mg-profile-quest__bar" role="progressbar" aria-label={text} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
        <div className="mg-profile-quest__fill" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
