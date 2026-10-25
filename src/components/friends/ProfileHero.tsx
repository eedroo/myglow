import type { ReactNode } from 'react';
import type { OrbSigns } from '@/lib/friends/orb';
import { FriendAvatar } from './FriendAvatar';

interface ProfileHeroProps {
  idKey: string;
  orb: OrbSigns | null;
  initials: string;
  name: string;
  handle: string | null;
  /** "Nível 3 · Chama" (já traduzido). */
  levelLabel: string;
  progress: number; // 0–1 dentro do nível
  /** Texto por baixo da barra (já traduzido): Glow no perfil próprio, percentagem no do amigo. */
  xpText: string;
  /** Linha extra opcional (ex.: "Amigos desde…"). */
  meta?: string;
  /** Ao lado do nível (ex.: selo Premium no perfil próprio). */
  badge?: ReactNode;
}

/** Ficha de jogador: a esfera de luz grande a flutuar e a pulsar, nome, @, nível e barra do nível. */
export function ProfileHero({ idKey, orb, initials, name, handle, levelLabel, progress, xpText, meta, badge }: ProfileHeroProps) {
  const pct = Math.round(progress * 100);
  return (
    <section className="mg-profile-hero">
      <div className="mg-profile-hero__orb">
        <span className={orb ? `mg-profile-hero__halo mg-profile-hero__halo--${orb.core.toLowerCase()}` : 'mg-profile-hero__halo'} aria-hidden="true" />
        <FriendAvatar idKey={idKey} orb={orb} initials={initials} progress={progress} size="xl" />
      </div>
      <h1 className="mg-profile-hero__name">{name}</h1>
      {handle && <p className="mg-profile-hero__handle">@{handle}</p>}
      <span className="mg-profile-hero__badges">
        <span className="mg-profile-hero__level">{levelLabel}</span>
        {badge}
      </span>
      <div className="mg-profile-hero__xp" role="progressbar" aria-label={levelLabel} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="mg-profile-hero__fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="mg-profile-hero__xp-text">{xpText}</p>
      {meta && <p className="mg-profile-hero__meta">{meta}</p>}
    </section>
  );
}
