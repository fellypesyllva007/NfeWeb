import type { FastifyInstance } from 'fastify';
import { calculateDocument } from '../domain/engine.js';
import type { FiscalContext } from '../domain/types.js';
import { loadFiscalContextFromDatabase, saveCalculationSnapshot } from '../infra/taxContextRepository.js';
import { databaseCalculationRequestSchema, fiscalContextSchema } from './schemas.js';

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
    const parsed = fiscalContextSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ status: 'error', error: 'ValidationError', issues: parsed.error.issues });
    }

    const context = { ...parsed.data, mode: 'preview' } as FiscalContext;
    return calculateDocument(context);
  });

  app.post('/api/tax/calculate-document', async (request, reply) => {
    const parsed = fiscalContextSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ status: 'error', error: 'ValidationError', issues: parsed.error.issues });
    }

    return calculateDocument(parsed.data as FiscalContext);
  });

  app.post('/api/tax/calculate-document/from-db', async (request, reply) => {
    const parsed = databaseCalculationRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ status: 'error', error: 'ValidationError', issues: parsed.error.issues });
    }

    const context = await loadFiscalContextFromDatabase(parsed.data);
    const result = calculateDocument(context);

    if (parsed.data.persistSnapshot) {
      await saveCalculationSnapshot(result);
    }

    return result;
  });

  app.post('/api/tax/calculate-item', async (request, reply) => {
    const parsed = fiscalContextSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ status: 'error', error: 'ValidationError', issues: parsed.error.issues });
    }

    const result = calculateDocument(parsed.data as FiscalContext);
    return { ...result, items: result.items.slice(0, 1) };
  });
}
