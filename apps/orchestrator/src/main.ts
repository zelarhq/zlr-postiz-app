import { initializeSentry } from '@gitroom/nestjs-libraries/sentry/initialize.sentry';
initializeSentry('orchestrator', true);
import 'source-map-support/register';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

import { NestFactory } from '@nestjs/core';
import { AppModule } from '@gitroom/orchestrator/app.module';
import * as dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const port = process.env.ORCHESTRATOR_PORT || 3002;
  await app.listen(port);
  console.log(`Orchestrator health check listening on port ${port}`);
}

// A half-started orchestrator is worse than a dead one: the Temporal workers
// register but nothing supervises them, so posts sit in QUEUE forever with no
// error anywhere. Exit non-zero on any bootstrap failure so pm2 restarts us and
// the container healthcheck can see it.
bootstrap().catch((err) => {
  if (err?.code === 'EADDRINUSE') {
    console.error(
      `Orchestrator bootstrap failed: port ${
        process.env.ORCHESTRATOR_PORT || 3002
      } is already in use - another orchestrator instance is still running.`
    );
  } else {
    console.error('Orchestrator bootstrap failed:', err);
  }
  process.exit(1);
});
