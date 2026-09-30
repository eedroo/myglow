import { createTranslator } from 'next-intl';
import type { Locale } from '@prisma/client';
import ptPT from '../../messages/pt-PT.json';
import ptBR from '../../messages/pt-BR.json';
import en from '../../messages/en.json';
import { dbToAppLocale } from './locales';

/** Tradutor fora do React (jobs, geração IA, notificações), a partir do `Locale` do Prisma. */
const MESSAGES = { PT_PT: ptPT, PT_BR: ptBR, EN: en } as const;

export function translatorFor(locale: Locale) {
  return createTranslator({ locale: dbToAppLocale(locale), messages: MESSAGES[locale] });
}

export type Translator = ReturnType<typeof translatorFor>;

export function messagesFor(locale: Locale) {
  return MESSAGES[locale];
}
