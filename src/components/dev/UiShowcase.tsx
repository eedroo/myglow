'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Settings, X } from 'lucide-react';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { Button } from '@/components/ui/Button';
import { CheckChip } from '@/components/ui/CheckChip';
import { CheckTile } from '@/components/ui/CheckTile';
import { Field } from '@/components/ui/Field';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconBadge } from '@/components/ui/IconBadge';
import { LinedTextArea } from '@/components/ui/LinedTextArea';
import { MagicIcon } from '@/components/ui/MagicIcon';
import { MoodScale } from '@/components/ui/MoodScale';
import { Motto } from '@/components/ui/Motto';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextInput } from '@/components/ui/TextInput';
import { Toast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/shell/PageHeader';
import type { MagicIconName } from '@/lib/icons';
import type { NextTheme, ThemePref } from '@/lib/theme';
import { nextThemeToPref, prefToNextTheme } from '@/lib/theme';

interface UiShowcaseProps {
  icons: { name: MagicIconName; ready: boolean }[];
}

export function UiShowcase({ icons }: UiShowcaseProps) {
  const t = useTranslations();
  const { theme, setTheme } = useTheme();
  // O servidor não conhece o tema: só marcar a opção activa depois de montar (evita mismatch de hidratação).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [banish, setBanish] = useState({ text: '', done: false });
  const [ritual, setRitual] = useState(true);
  const [chips, setChips] = useState({ stretch: true, workout: false, water: false });
  const [mood, setMood] = useState<number | null>(4);
  const [notes, setNotes] = useState('');
  const [segment, setSegment] = useState<'PT_PT' | 'PT_BR' | 'EN'>('PT_PT');

  const moodLabels = t.raw('dev.moodLabels') as [string, string, string, string, string];
  const crystals = t.raw('dev.crystals') as string[];
  const readyCount = icons.filter((i) => i.ready).length;

  return (
    <div className="mg-dev">
      <PageHeader eyebrow={t('common.appName')} title={t('dev.title')} subtitle={t('dev.subtitle')} />

      <GlassCard variant="accent">
        <SegmentedControl<ThemePref>
          name="dev-theme"
          legend={t('dev.theme')}
          value={mounted ? nextThemeToPref(theme) : undefined}
          onChange={(v) => setTheme(prefToNextTheme(v) as NextTheme)}
          options={(['LIGHT', 'DARK', 'SYSTEM'] as const).map((value) => ({
            value,
            label: t(`settings.themeOptions.${value}`),
          }))}
        />
      </GlassCard>

      <section className="mg-stack">
        <SectionHeader title={t('dev.cards')} icon="sparkles" />
        <div className="mg-dev__grid">
          <GlassCard title={t('dev.cardDefault')}>
            <p>{t('dev.cardBody')}</p>
          </GlassCard>
          <GlassCard variant="accent" title={t('dev.cardAccent')}>
            <p>{t('dev.cardBody')}</p>
          </GlassCard>
          <GlassCard variant="flat" title={t('dev.cardFlat')}>
            <p>{t('dev.cardBody')}</p>
          </GlassCard>
          <GlassCard variant="interactive" title={t('dev.cardInteractive')}>
            <p>{t('dev.cardBody')}</p>
          </GlassCard>
        </div>
      </section>

      <section className="mg-stack">
        <SectionHeader title={t('dev.sectionHeaders')} icon="star" />
        <div className="mg-row">
          <SectionHeader title={t('dev.morning')} icon="sun" as="h3" />
          <SectionHeader title={t('dev.night')} icon="moon-crescent" as="h3" />
          <SectionHeader title={t('dev.motto')} as="h3" />
        </div>
      </section>

      <section className="mg-stack">
        <SectionHeader title={t('dev.buttons')} icon="glow-orb" />
        <GlassCard>
          <div className="mg-row">
            <Button>{t('dev.primary')}</Button>
            <Button variant="ghost">{t('dev.ghost')}</Button>
            <Button variant="subtle">{t('dev.subtle')}</Button>
            <Button loading loadingLabel={t('common.loading')}>
              {t('dev.loadingBtn')}
            </Button>
            <Button disabled>{t('dev.disabled')}</Button>
          </div>
          <Button block>{t('dev.block')}</Button>
          <Button variant="ghost" block>
            {t('dev.block')}
          </Button>
        </GlassCard>
      </section>

      <section className="mg-stack">
        <SectionHeader title={t('dev.fields')} icon="feather" />
        <div className="mg-dev__grid">
          <GlassCard>
            <Field id="dev-text" label={t('dev.textLabel')} hint={t('dev.textHint')}>
              <TextInput id="dev-text" placeholder={t('dev.textPlaceholder')} aria-describedby="dev-text-hint" />
            </Field>
            <Field id="dev-error" label={t('dev.errorLabel')} error={t('dev.errorMessage')}>
              <TextInput id="dev-error" invalid defaultValue="—" aria-describedby="dev-error-error" />
            </Field>
            <Field id="dev-disabled" label={t('dev.disabledLabel')}>
              <TextInput id="dev-disabled" disabled placeholder={t('dev.textPlaceholder')} />
            </Field>
          </GlassCard>
          <GlassCard title={t('dev.lined')}>
            <label htmlFor="dev-lined" className="mg-visually-hidden">
              {t('dev.lined')}
            </label>
            <LinedTextArea
              id="dev-lined"
              rows={5}
              value={notes}
              placeholder={t('dev.linedPlaceholder')}
              onChange={(e) => setNotes(e.target.value)}
            />
          </GlassCard>
        </div>
      </section>

      <section className="mg-stack">
        <SectionHeader title={t('dev.segmented')} icon="scale" />
        <div className="mg-dev__grid">
          <GlassCard>
            <SegmentedControl
              name="dev-segment"
              legend={t('settings.language')}
              value={segment}
              onChange={setSegment}
              options={(['PT_PT', 'PT_BR', 'EN'] as const).map((value) => ({
                value,
                label: t(`settings.languageOptions.${value}`),
              }))}
            />
          </GlassCard>
          <GlassCard title={t('dev.autocomplete')}>
            <Autocomplete<string>
              id="dev-autocomplete"
              label={t('dev.autocompleteLabel')}
              placeholder={t('dev.textPlaceholder')}
              fetchOptions={async (q) =>
                crystals.filter((c) => c.toLowerCase().includes(q.toLowerCase()))
              }
              getOptionKey={(c) => c}
              getOptionLabel={(c) => c}
              onSelect={() => undefined}
              loadingLabel={t('onboarding.step2.searching')}
              emptyLabel={t('onboarding.step2.noResults')}
              errorLabel={t('onboarding.step2.searchError')}
            />
          </GlassCard>
        </div>
      </section>

      <section className="mg-stack">
        <SectionHeader title={t('dev.checks')} icon="tea-cup" />
        <GlassCard>
          <CheckTile
            icon="feather"
            label={t('dev.banish')}
            withText
            text={banish.text}
            textLabel={t('dev.banishName')}
            textPlaceholder={t('dev.banishPlaceholder')}
            onTextChange={(text) => setBanish((b) => ({ ...b, text }))}
            checked={banish.done}
            checkLabel={t('common.done')}
            onCheckedChange={(done) => setBanish((b) => ({ ...b, done }))}
          />
          <CheckTile
            icon="lotus"
            label={t('dev.ritual')}
            checked={ritual}
            checkLabel={t('common.done')}
            onCheckedChange={setRitual}
          />
          <div className="mg-row">
            <CheckChip
              icon="stretch"
              label={t('dev.stretch')}
              checked={chips.stretch}
              onCheckedChange={(v) => setChips((c) => ({ ...c, stretch: v }))}
            />
            <CheckChip
              icon="dumbbell"
              label={t('dev.workout')}
              checked={chips.workout}
              onCheckedChange={(v) => setChips((c) => ({ ...c, workout: v }))}
            />
            <CheckChip
              icon="water-drop"
              label={t('dev.water')}
              checked={chips.water}
              onCheckedChange={(v) => setChips((c) => ({ ...c, water: v }))}
            />
          </div>
          <MoodScale name="dev-mood" legend={t('dev.mood')} labels={moodLabels} value={mood} onChange={setMood} />
        </GlassCard>
      </section>

      <section className="mg-stack">
        <SectionHeader title={t('dev.toasts')} icon="scroll" />
        <Toast inline variant="success" message={t('dev.toastSuccess')} closeLabel={t('common.close')} duration={0} />
        <Toast inline variant="error" message={t('dev.toastError')} closeLabel={t('common.close')} duration={0} />
      </section>

      <section className="mg-stack">
        <SectionHeader title={t('dev.badges')} icon="crystal-cluster" />
        <GlassCard>
          <div className="mg-row">
            <IconBadge size="sm">
              <MagicIcon name="heart" size="sm" decorative />
            </IconBadge>
            <IconBadge size="md">
              <MagicIcon name="crystal-ball" size="md" decorative />
            </IconBadge>
            <IconBadge size="lg">
              <MagicIcon name="candle" size="lg" decorative />
            </IconBadge>
            <IconBadge size="md">
              <Settings size={20} strokeWidth={1.5} aria-hidden="true" />
            </IconBadge>
            <IconBadge size="sm">
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            </IconBadge>
            <MagicIcon name="crystal-cluster" size="xl" decorative />
          </div>
        </GlassCard>
      </section>

      <section className="mg-stack">
        <SectionHeader title={t('dev.icons')} icon="zodiac-wheel" />
        <GlassCard title={t('dev.iconsReady', { ready: readyCount, total: icons.length })}>
          <ul className="mg-icon-grid" role="list">
            {icons.map(({ name, ready }) => (
              <li key={name} className="mg-icon-grid__item">
                <MagicIcon name={name} size="lg" label={name} />
                <span className="mg-icon-grid__name">
                  <span
                    className={ready ? 'mg-icon-grid__dot mg-icon-grid__dot--ready' : 'mg-icon-grid__dot'}
                    aria-hidden="true"
                  />
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>

      <Motto text={t('common.motto')} />
    </div>
  );
}
