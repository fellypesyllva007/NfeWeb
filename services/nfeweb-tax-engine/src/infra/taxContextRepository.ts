import { fiscalContextSchema } from '../http/schemas.js';
import type { FiscalContext, TaxMode } from '../domain/types.js';
import { createSupabaseServerClient } from './supabaseClient.js';

export interface LoadFiscalContextParams {
  tenantId: string;
  documentId: string;
  mode: TaxMode;
}

/**
 * Carrega o contexto fiscal completo a partir do banco.
 *
 * A RPC deve montar o payload no mesmo formato de FiscalContext, incluindo:
 * - emitente e regime tributário
 * - cliente e UF destino
 * - operação
 * - itens
 * - regras fiscais mutáveis vindas do banco
 * - exceções vigentes
 *
 * Nome sugerido da RPC no Supabase:
 *   tax_engine_get_fiscal_context(p_tenant_id uuid/text, p_document_id uuid/text, p_mode text)
 */
export async function loadFiscalContextFromDatabase(params: LoadFiscalContextParams): Promise<FiscalContext> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc('tax_engine_get_fiscal_context', {
    p_tenant_id: params.tenantId,
    p_document_id: params.documentId,
    p_mode: params.mode
  });

  if (error) {
    throw new Error(`Supabase RPC tax_engine_get_fiscal_context failed: ${error.message}`);
  }

  const parsed = fiscalContextSchema.safeParse({
    ...(data as Record<string, unknown>),
    tenantId: params.tenantId,
    documentId: params.documentId,
    mode: params.mode
  });

  if (!parsed.success) {
    throw new Error(`Invalid fiscal context returned by database: ${JSON.stringify(parsed.error.issues)}`);
  }

  return parsed.data as FiscalContext;
}

export async function saveCalculationSnapshot(result: unknown): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc('tax_engine_save_calculation_snapshot', {
    p_result: result
  });

  if (error) {
    throw new Error(`Supabase RPC tax_engine_save_calculation_snapshot failed: ${error.message}`);
  }
}
