"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { MagicIcon } from "@/components/ui/MagicIcon";
import { DAILY_LESSON_LIMIT } from "@/lib/grimoire/rules";

interface LessonCompleteProps {
  replay: boolean;
  lessonsLeft: number | null; // null enquanto grava
  nextHref: string | null;
  quizUnlocked: boolean;
  courseSlug: string;
  /** Acção da prática da lição (ex.: abrir o diário), só depois de concluída. */
  practice?: { label: string; href: string };
  /** Só quando a gravação falhou: mostra "Tentar de novo". */
  onRetry?: () => void;
}

/**
 * Card final: brilho, lições restantes hoje (luas), "Continuar" (se houver limite) e "Voltar ao mapa".
 * Enquanto grava não há botões, para não sair antes de o progresso ficar salvo.
 */
export function LessonComplete({
  replay,
  lessonsLeft,
  nextHref,
  quizUnlocked,
  courseSlug,
  practice,
  onRetry,
}: LessonCompleteProps) {
  const t = useTranslations("grimoire");
  const used = lessonsLeft === null ? null : DAILY_LESSON_LIMIT - lessonsLeft;
  const saving = lessonsLeft === null && !onRetry;
  const continueHref = quizUnlocked
    ? `/grimoire/${courseSlug}/quiz`
    : lessonsLeft && lessonsLeft > 0
      ? nextHref
      : null;

  return (
    <article className="mg-lesson-done">
      <span className="mg-lesson-done__glow">
        <MagicIcon name="sparkles" size="xl" decorative />
      </span>
      <h2 className="mg-lesson-done__title">
        {replay ? t("done.replayTitle") : t("done.title")}
      </h2>
      <p className="mg-lesson-done__text" role="status">
        {saving
          ? t("player.saving")
          : lessonsLeft === null
            ? null
            : quizUnlocked
              ? t("done.quizUnlocked")
              : t("done.text")}
      </p>
      {used !== null && (
        <>
          <span className="mg-lesson-done__moons" aria-hidden="true">
            {Array.from({ length: DAILY_LESSON_LIMIT }, (_, i) => (
              <span
                key={i}
                className={
                  i < used
                    ? "mg-daily-meter__moon mg-daily-meter__moon--filled"
                    : "mg-daily-meter__moon"
                }
              >
                <MagicIcon name="moon-crescent" size="sm" decorative />
              </span>
            ))}
          </span>
          <p className="mg-lesson-done__text">
            {t("meter.left", { count: lessonsLeft ?? 0 })}
          </p>
        </>
      )}
      {practice && lessonsLeft !== null && (
        <div className="mg-lesson-done__practice">
          <p className="mg-lesson-done__label">{t("done.practice")}</p>
          <Link href={practice.href} className="mg-btn mg-btn--subtle">
            {practice.label}
          </Link>
        </div>
      )}
      {!saving && (
        <div className="mg-lesson-done__actions">
          <Link href="/grimoire" className="mg-btn mg-btn--ghost">
            {t("done.backToMap")}
          </Link>
          {onRetry && <Button onClick={onRetry}>{t("result.retry")}</Button>}
          {continueHref && (
            <Link href={continueHref} className="mg-btn mg-btn--primary">
              {t("done.continue")}
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
