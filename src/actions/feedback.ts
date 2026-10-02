'use server';

import { headers } from 'next/headers';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { appUrl, feedbackEmail } from '@/lib/env';
import { allowFeedback } from '@/lib/ratelimit';
import { sendEmail } from '@/lib/email/send';
import { feedbackSchema, type FeedbackInput } from '@/lib/validation/feedback';
import { FeedbackEmail } from '@/emails/FeedbackEmail';
import { createElement } from 'react';

export type FeedbackResult = { ok: true } | { ok: false; error: string };

/**
 * Feedback do beta: grava `Feedback` e envia um email para `FEEDBACK_EMAIL` com resposta directa ao utilizador.
 * 5 por hora. Uma falha no email não falha a acção.
 */
export async function sendFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, error: 'common.errors.unauthorized' };
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'feedback.errors.invalid' };
  if (!(await allowFeedback(userId))) return { ok: false, error: 'feedback.errors.rateLimited' };

  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, locale: true } });
  if (!user) return { ok: false, error: 'common.errors.unauthorized' };
  const userAgent = headers().get('user-agent')?.slice(0, 300) ?? null;
  const { kind, message, path } = parsed.data;

  await db.feedback.create({ data: { userId, kind, message, path: path ?? null, userAgent, locale: user.locale } });

  const to = feedbackEmail();
  if (to) {
    await sendEmail({
      to,
      replyTo: user.email,
      subject: `[MYGLOW beta] ${kind} — ${message.slice(0, 50)}`,
      tag: 'feedback',
      react: createElement(FeedbackEmail, {
        kind, message, userName: user.name, userEmail: user.email, path: path ?? null, locale: user.locale, userAgent, appUrl: appUrl(),
      }),
    });
  }
  return { ok: true };
}
