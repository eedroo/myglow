import 'server-only';
import type { ReactElement } from 'react';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { getEmailEnv, hasEmail } from '@/lib/env';
import type { EmailKind } from '@/emails';

/**
 * Envio de emails transaccionais. Produção: Resend (sempre com `replyTo`). Em teste, ou fora de produção sem
 * `RESEND_API_KEY`, ficam em memória e na consola (os e2e lêem-nos por `GET /api/test/last-email`).
 * Nunca lança: a acção principal não falha por causa do email.
 */
export type { EmailKind } from '@/emails';

export interface EmailMessage {
  to: string;
  subject: string;
  react: ReactElement;
  tag: EmailKind | 'feedback';
  /** Por defeito `EMAIL_REPLY_TO`; o feedback responde directamente ao utilizador. */
  replyTo?: string;
}

export interface CapturedEmail {
  to: string;
  subject: string;
  tag: EmailMessage['tag'];
  html: string;
  text: string;
  sentAt: string;
}

// No globalThis: em dev o Next carrega este módulo em bundles diferentes (actions vs. route handlers).
const store = ((globalThis as { __mgEmails?: CapturedEmail[] }).__mgEmails ??= []);
const MAX_STORED = 200;

let resend: Resend | null = null;

/** Captura em memória: em teste e, fora de produção, quando não há Resend configurado. */
function capturing(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  return process.env.NODE_ENV !== 'production' && !hasEmail();
}

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean }> {
  try {
    const [html, text] = await Promise.all([render(msg.react), render(msg.react, { plainText: true })]);

    if (capturing()) {
      store.push({ to: msg.to.toLowerCase(), subject: msg.subject, tag: msg.tag, html, text, sentAt: new Date().toISOString() });
      if (store.length > MAX_STORED) store.splice(0, store.length - MAX_STORED);
      console.info(`[email] (memória) ${msg.tag} → ${msg.to}: ${msg.subject}`);
      return { ok: true };
    }

    if (!hasEmail()) {
      console.error(`[email] Resend não configurado: "${msg.tag}" não enviado.`);
      return { ok: false };
    }
    const env = getEmailEnv();
    resend ??= new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: msg.to,
      replyTo: msg.replyTo ?? env.EMAIL_REPLY_TO,
      subject: msg.subject,
      html,
      text,
      tags: [{ name: 'kind', value: msg.tag }],
    });
    if (error) {
      console.error(`[email] Falha a enviar "${msg.tag}":`, error.message);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[email] Erro a enviar "${msg.tag}":`, err instanceof Error ? err.message : err);
    return { ok: false };
  }
}

/** Último email capturado para `to` (só fora de produção). */
export function getLastEmail(to: string): CapturedEmail | null {
  if (process.env.NODE_ENV === 'production') return null;
  const key = to.toLowerCase();
  for (let i = store.length - 1; i >= 0; i--) if (store[i]!.to === key) return store[i]!;
  return null;
}
