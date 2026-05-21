import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './http/routes.js';

const port = Number(process.env.PORT ?? 3340);
const host = process.env.HOST ?? '127.0.0.1';
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = Fastify({
  logger: true,
  bodyLimit: 4 * 1024 * 1024
});

await app.register(cors, {
  origin: allowedOrigins.length > 0 ? allowedOrigins : false,
  credentials: true
});

await registerRoutes(app);

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  reply.status(500).send({
    status: 'error',
    service: 'nfeweb-tax-engine',
    error: error.name,
    message: error.message
  });
});

await app.listen({ port, host });
