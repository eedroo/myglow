import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentry/options';

// Erros no servidor Node (F12): só com SENTRY_DSN; eventos limpos em scrubEvent.
Sentry.init(sentryOptions(process.env.SENTRY_DSN));
