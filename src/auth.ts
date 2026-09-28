import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { authConfig } from './auth.config';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validation/auth';

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

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
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);
      if (params.trigger === 'update' && token.id) {
        const user = await db.user.findUnique({
          where: { id: token.id },
          select: { name: true, locale: true, theme: true, onboardedAt: true },
        });
        if (user) {
          token.name = user.name;
          token.locale = user.locale;
          token.theme = user.theme;
          token.onboarded = user.onboardedAt !== null;
        }
      }
      return token;
    },
  },
});
