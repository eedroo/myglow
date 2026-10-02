import type { ReactNode } from 'react';
import { Body, Button, Container, Head, Heading, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components';

/**
 * Base dos emails transaccionais. Os clientes de email não suportam CSS variables: as cores vivem aqui em
 * constantes (única excepção à regra dos tokens — ver docs/ARCHITECTURE.md). Valores alinhados com o tema claro.
 */
export const EMAIL_COLORS = {
  cream: '#FBF6EC',
  card: '#FFFDF8',
  ink: '#2B2340',
  muted: '#6E6680',
  gold: '#C9A24B',
  goldInk: '#2B2340',
  line: '#E9DFCB',
} as const;

const FONT_SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const FONT_SANS = "Jost, 'Helvetica Neue', Arial, sans-serif";

export interface EmailLayoutProps {
  lang: string;
  preview: string;
  title: string;
  greeting?: string;
  children: ReactNode;
  button?: { label: string; url: string };
  linkFallback?: string;
  /** Nota final (por defeito "Se não foste tu, ignora este email."). */
  note: string;
  footer: string;
  openApp: string;
  appUrl: string;
}

export function EmailLayout({
  lang, preview, title, greeting, children, button, linkFallback, note, footer, openApp, appUrl,
}: EmailLayoutProps) {
  return (
    <Html lang={lang}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: EMAIL_COLORS.cream, margin: 0, padding: '32px 0', fontFamily: FONT_SANS, color: EMAIL_COLORS.ink }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', padding: '0 16px' }}>
          <Section style={{ textAlign: 'center', paddingBottom: 16 }}>
            <Img src={`${appUrl}/icons/icon-192.png`} width="56" height="56" alt="MYGLOW" style={{ margin: '0 auto', borderRadius: 14 }} />
            <Text style={{ fontFamily: FONT_SERIF, fontSize: 20, letterSpacing: 4, margin: '8px 0 0', color: EMAIL_COLORS.ink }}>MYGLOW</Text>
          </Section>
          <Section style={{ backgroundColor: EMAIL_COLORS.card, border: `1px solid ${EMAIL_COLORS.line}`, borderRadius: 16, padding: '28px 24px' }}>
            <Heading as="h1" style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 28, lineHeight: '34px', margin: '0 0 16px', color: EMAIL_COLORS.ink }}>
              {title}
            </Heading>
            {greeting && <Text style={{ fontSize: 16, lineHeight: '24px', margin: '0 0 12px' }}>{greeting}</Text>}
            {children}
            {button && (
              <>
                <Section style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                  <Button
                    href={button.url}
                    style={{
                      backgroundColor: EMAIL_COLORS.gold, color: EMAIL_COLORS.goldInk, borderRadius: 999, padding: '14px 28px',
                      fontSize: 16, fontWeight: 600, textDecoration: 'none', display: 'inline-block',
                    }}
                  >
                    {button.label}
                  </Button>
                </Section>
                {linkFallback && (
                  <Text style={{ fontSize: 13, lineHeight: '20px', color: EMAIL_COLORS.muted, margin: '16px 0 0', wordBreak: 'break-all' }}>
                    {linkFallback}
                    <br />
                    <Link href={button.url} style={{ color: EMAIL_COLORS.muted }}>
                      {button.url}
                    </Link>
                  </Text>
                )}
              </>
            )}
            <Hr style={{ borderColor: EMAIL_COLORS.line, margin: '24px 0 16px' }} />
            <Text style={{ fontSize: 13, lineHeight: '20px', color: EMAIL_COLORS.muted, margin: 0 }}>{note}</Text>
          </Section>
          <Text style={{ fontSize: 12, lineHeight: '18px', color: EMAIL_COLORS.muted, textAlign: 'center', margin: '20px 0 0' }}>
            {footer}
            <br />
            <Link href={appUrl} style={{ color: EMAIL_COLORS.muted }}>
              {openApp}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const paragraphStyle = { fontSize: 16, lineHeight: '24px', margin: '0 0 12px' } as const;
