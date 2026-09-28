interface PageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}

/** Título de página em Cormorant + subtítulo. */
export function PageHeader({ title, subtitle, eyebrow }: PageHeaderProps) {
  return (
    <header className="mg-page-header">
      {eyebrow && <p className="mg-page-header__eyebrow">{eyebrow}</p>}
      <h1 className="mg-page-header__title">{title}</h1>
      {subtitle && <p className="mg-page-header__subtitle">{subtitle}</p>}
    </header>
  );
}
