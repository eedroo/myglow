import type { ReactNode } from 'react';

interface AppShellProps {
  topBar: ReactNode;
  nav: ReactNode;
  children: ReactNode;
}

/** Contentor da app com safe-area insets; reserva espaço para a navegação. */
export function AppShell({ topBar, nav, children }: AppShellProps) {
  return (
    <div className="mg-shell">
      {topBar}
      <main id="main" className="mg-shell__main">
        {children}
      </main>
      {nav}
    </div>
  );
}
