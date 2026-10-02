'use client';

import { useEffect, useState } from 'react';

interface SettingsNavProps {
  label: string;
  sections: { id: string; label: string }[];
}

/** Índice das secções das definições: âncoras; marca a secção visível. */
export function SettingsNav({ label, sections }: SettingsNavProps) {
  const [active, setActive] = useState(sections[0]?.id ?? '');

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className="mg-settings-nav" aria-label={label}>
      <ul className="mg-settings-nav__list">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={s.id === active ? 'mg-settings-nav__item mg-settings-nav__item--active' : 'mg-settings-nav__item'}
              aria-current={s.id === active ? 'location' : undefined}
              onClick={() => setActive(s.id)}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
