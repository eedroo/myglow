import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentry/options';

// Erros no browser (F12): região UE (pelo DSN), sem dados pessoais nem Session Replay.
Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));
