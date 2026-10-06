import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import messages from "../../../messages/pt-BR.json";
import { LessonComplete } from "./LessonComplete";

const render = (props: Partial<Parameters<typeof LessonComplete>[0]>) =>
  renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      {
        locale: "pt-BR",
        messages: messages as unknown as AbstractIntlMessages,
      } as ComponentProps<typeof NextIntlClientProvider>,
      createElement(LessonComplete, {
        replay: false,
        lessonsLeft: null,
        nextHref: null,
        quizUnlocked: false,
        courseSlug: "lua",
        ...props,
      }),
    ),
  );

describe("LessonComplete", () => {
  it("enquanto grava não mostra nenhum botão para sair", () => {
    const html = render({ practice: { label: "Abrir o Mês", href: "/month" } });
    expect(html).toContain("Salvando");
    expect(html).not.toContain("Voltar ao mapa");
    expect(html).not.toContain("href=");
  });

  it('depois de gravar mostra "Voltar ao mapa" e a prática', () => {
    const html = render({
      lessonsLeft: 2,
      practice: { label: "Abrir o Mês", href: "/month" },
    });
    expect(html).not.toContain("Salvando");
    expect(html).toContain("Voltar ao mapa");
    expect(html).toContain('href="/month"');
  });

  it("se a gravação falhou, oferece tentar de novo", () => {
    const html = render({ onRetry: () => {} });
    expect(html).not.toContain("Salvando");
    expect(html).toContain("Tentar de novo");
    expect(html).toContain("Voltar ao mapa");
  });
});
