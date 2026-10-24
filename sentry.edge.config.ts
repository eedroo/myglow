import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentry/options';

// Erros no runtime edge (middleware) (F12).
Sentry.init(sentryOptions(process.env.SENTRY_DSN));
