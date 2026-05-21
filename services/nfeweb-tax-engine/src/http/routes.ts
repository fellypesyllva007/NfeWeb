import type { FastifyInstance } from 'fastify';
import { calculateDocument } from '../domain/engine.js';
import type { FiscalContext } from '../domain/types.js';
import { loadFiscalContextFromDatabase, saveCalculationSnapshot } from '../infra/taxContextRepository.js';
import { databaseCalculationRequestSchema, fiscalContextSchema } from './schemas.js';

async function calculateFromDatabase(rawBody: unknown) {
  const parsed = databaseCalculationRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return { ok: false as const, response: { status: 'error', error: 'ValidationError', issues: parsed.error.issues }, statusCode: 400 };
  }

  const context = await loadFiscalContextFromDatabase(parsed.data);
  const result = calculateDocument(context);

  if (parsed.data.persistSnapshot) {
    await saveCalculationSnapshot(result);
  }

  return { ok: true as const, response: result };
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'nfeweb-tax-engine',
    version: '0.1.0'
  }));

  app.get('/api/tax/health', async () => ({
    status: 'ok',
    service: 'nfeweb-tax-engine',
    version: '0.1.0'
  }));

  app.post('/api/tax/preview', async (request, reply) => {
    const calculated = await calculateFromDatabase({ ...(request.body as object), mode: 'preview' });
    if (!calculated.ok) return reply.status(calculated.statusCode).send(calculated.response);
    return calculated.response;
  });

  app.post('/api/tax/calculate-document', async (request, reply) => {
    const calculated = await calculateFromDatabase(request.body);
    if (!calculated.ok) return reply.status(calculated.statusCode).send(calculated.response);
    return calculated.response;
  });

  app.post('/api/tax/calculate-document/from-db', async (request, reply) => {
    const calculated = await calculateFromDatabase(request.body);
    if (!calculated.ok) return reply.status(calculated.statusCode).send(calculated.response);
    return calculated.response;
  });

  app.post('/api/tax/calculate-item', async (_request, reply) => {
    return reply.status(410).send({
      status: 'error',
      error: 'EndpointDeprecated',
      message: 'Cálculo por item isolado foi desativado. Use /api/tax/preview ou /api/tax/calculate-document com tenantId/documentId para carregar todos os parâmetros fiscais do banco.'
    });
  });

  app.post('/api/tax/debug/calculate-document', async (request, reply) => {
    if (process.env.ENABLE_PAYLOAD_CALCULATION !== 'true') {
      return reply.status(403).send({
        status: 'error',
        error: 'PayloadCalculationDisabled',
        message: 'Cálculo por payload completo está desativado. Alíquotas e parâmetros fiscais devem vir das tabelas do banco.'
      });
    }

    const parsed = fiscalContextSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ status: 'error', error: 'ValidationError', issues: parsed.error.issues });
    }

    return calculateDocument(parsed.data as FiscalContext);
  });
}
