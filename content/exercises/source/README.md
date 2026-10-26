# Biblioteca de exercícios

`exercises.json` é a `dist/exercises.json` da [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(licença Unlicense, domínio público), commit `f00c92c7dcf1`, descarregada a 2026-10-26 (876 exercícios).

- As imagens não ficam no repositório: `scripts/fitness/import-images.ts` envia-as para o Vercel Blob e escreve
  `content/exercises/images.json`.
- Os nomes e as instruções em português ficam em `content/exercises/i18n/{pt-PT,pt-BR}.json`
  (`scripts/fitness/translate.ts`), para rever no git.
- `prisma/seed-exercises.ts` junta tudo na base (corre em cada deploy; só toca nos exercícios `LIBRARY`).
