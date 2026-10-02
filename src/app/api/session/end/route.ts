import { signOut } from '@/auth';

/**
 * Termina uma sessão invalidada (sessionVersion mudou ou conta apagada). Os Server Components não podem
 * apagar o cookie; o middleware (edge, sem DB) ainda o aceita — por isso o layout da app redirecciona para
 * aqui, que limpa o cookie e segue para /login.
 */
export async function GET() {
  await signOut({ redirectTo: '/login' });
}
