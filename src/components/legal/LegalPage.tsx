import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatLongDate } from '@/lib/dates';
import { isAppLocale } from '@/i18n/locales';
import { parseRich, type MdBlock } from '@/lib/grimoire/markdown';
import { getLegalDocument, type LegalDoc } from '@/lib/legal/content';

function Rich({ text }: { text: string }) {
  return (
    <>
      {parseRich(text).map((s, i) => {
        const content: ReactNode = s.bold ? <strong>{s.text}</strong> : s.text;
        return s.href ? (
          <a key={i} href={s.href}>
            {content}
          </a>
        ) : (
          <span key={i}>{content}</span>
        );
      })}
    </>
  );
}

function Block({ block }: { block: MdBlock }) {
  switch (block.type) {
    case 'heading': {
      const Tag = (['h1', 'h2', 'h3'] as const)[block.level - 1]!;
      return (
        <Tag>
          <Rich text={block.text} />
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p>
          <Rich text={block.text} />
        </p>
      );
    case 'quote':
      return (
        <blockquote>
          <Rich text={block.text} />
        </blockquote>
      );
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul';
      return (
        <Tag>
          {block.items.map((item, i) => (
            <li key={i}>
              <Rich text={item} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'rule':
      return <hr />;
  }
}

/** Política de Privacidade / Termos: tipografia de leitura, versão e data no topo, aviso de rascunho. */
export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('legal')]);
  const appLocale = isAppLocale(locale) ? locale : 'pt-PT';
  const document = getLegalDocument(doc, appLocale);
  return (
    <article className="mg-legal" lang={appLocale}>
      <p className="mg-legal__meta">
        {t('meta', { version: document.version, date: document.date ? formatLongDate(document.date, appLocale) : '' })}
      </p>
      {document.draft?.type === 'quote' && (
        <p className="mg-legal__draft" role="note">
          <Rich text={document.draft.text} />
        </p>
      )}
      <div className="mg-legal__body">
        {document.blocks.map((b, i) => (
          <Block key={i} block={b} />
        ))}
      </div>
    </article>
  );
}
