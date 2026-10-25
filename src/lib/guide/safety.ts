import type { AppLocale } from '@/i18n/locales';
import { normalizeText } from './bannedTerms';
import { allTexts, type GuideInput } from './input';

/**
 * Segurança emocional do Guia (F14). Detecção determinística de sofrimento sério nos textos do período,
 * antes de qualquer chamada à IA. As expressões nunca aparecem na UI nem nos logs.
 * Comparação sem acentos, em minúsculas, por expressão inteira.
 */
const DISTRESS: string[] = [
  // Português (PT e BR)
  'quero morrer', 'queria morrer', 'vontade de morrer', 'me matar', 'matar me', 'suicidio', 'suicidar', 'suicida',
  'acabar com a minha vida', 'acabar com minha vida', 'tirar a minha vida', 'tirar minha vida', 'nao quero viver',
  'nao quero mais viver', 'nao aguento mais viver', 'sem razao para viver', 'nao vale a pena viver',
  'melhor sem mim', 'melhor se eu morresse', 'automutilacao', 'automutilar', 'autolesao', 'me cortar de proposito',
  'cortar me de proposito', 'cortar os pulsos', 'me machucar de proposito', 'magoar me de proposito', 'sem esperanca nenhuma',
  'violencia domestica', 'ele me bate', 'ela me bate', 'bate me',
  // English
  'kill myself', 'killing myself', 'suicide', 'suicidal', 'want to die', 'wanna die', 'end my life', 'take my life',
  'no reason to live', 'better off without me', 'better off dead', 'self harm', 'hurt myself on purpose', 'cut myself',
  'domestic violence', 'he hits me', 'she hits me', 'no hope left',
];

const NORMALIZED = DISTRESS.map(normalizeText);

/** Algum texto do período tem sinais de sofrimento sério? */
export function detectDistress(input: GuideInput): boolean {
  return allTexts(input).some((t) => {
    const hay = ` ${normalizeText(t)} `;
    return NORMALIZED.some((p) => hay.includes(` ${p} `));
  });
}

export interface SupportContact {
  /** Chave em `guide.support.contacts` (o texto visível vive em `messages`). */
  label: string;
  value: string;
  /** Vazio quando não há um número único (ex.: emergência local em inglês). */
  href: string;
}

/** Contactos de ajuda por língua (confirmar antes de publicar). */
export function supportContacts(locale: AppLocale): SupportContact[] {
  switch (locale) {
    case 'pt-PT':
      return [
        { label: 'sns24', value: '808 24 24 24', href: 'tel:808242424' },
        { label: 'vozAmiga', value: '213 544 545', href: 'tel:213544545' },
        { label: 'emergency', value: '112', href: 'tel:112' },
      ];
    case 'pt-BR':
      return [
        { label: 'cvv', value: '188', href: 'tel:188' },
        { label: 'samu', value: '192', href: 'tel:192' },
      ];
    case 'en':
      return [
        { label: 'findHelpline', value: 'findahelpline.com', href: 'https://findahelpline.com' },
        { label: 'localEmergency', value: '112 · 911 · 999', href: '' },
      ];
  }
}
