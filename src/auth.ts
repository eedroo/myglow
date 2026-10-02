import { cache } from 'react';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validation/auth';
import { allowLogin, clientIp } from '@/lib/ratelimit';
import { isSessionValid, shouldRecheck } from '@/lib/auth/session';

/** Lê a versão da sessão (e os campos do token) — uma vez por pedido. */
const readSessionUser = cache((id: string) =>
  db.user.findUnique({ where: { id }, select: { sessionVersion: true, name: true, locale: true, theme: true, onboardedAt: true } }),
);

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        // 5 tentativas / 15 min por email + IP; a resposta é a mesma de credenciais erradas.
        if (!(await allowLogin(parsed.data.email, clientIp(request.headers)))) return null;

        const user = await db.user.findUnique({ where: { email: parsed.data.email } });
        // Compara sempre com um hash para não revelar, pelo tempo de resposta, se o email existe.
        const hash = user?.passwordHash ?? '$2b$12$Ol8IIKeHbqT84tHIY0dAlu7hN9znZmXii0.blvgV7xUyC4VNd14tG';
        const ok = await bcrypt.compare(parsed.data.password, hash);
        if (!user || !ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          locale: user.locale,
          theme: user.theme,
          onboarded: user.onboardedAt !== null,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      if (!token.id) return token;
      const now = Date.now();
      if (params.user) {
        token.sv = params.user.sessionVersion ?? 0;
        token.svCheckedAt = now;
        return token;
      }
      // Sessões invalidadas (sessionVersion++) ou conta apagada: no máximo 5 min depois a sessão termina.
      const isUpdate = params.trigger === 'update';
      if (!isUpdate && !shouldRecheck(token.svCheckedAt, now)) return token;
      const user = await readSessionUser(token.id);
      if (!isSessionValid(token.sv, user?.sessionVersion ?? null)) return null;
      token.svCheckedAt = now;
      if (isUpdate && user) {
        token.name = user.name;
        token.locale = user.locale;
        token.theme = user.theme;
        token.onboarded = user.onboardedAt !== null;
      }
      return token;
    },
  },
});
