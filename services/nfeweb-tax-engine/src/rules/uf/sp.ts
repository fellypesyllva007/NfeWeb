import type { TaxRule } from '../../domain/types.js';

/**
 * Pacote SP reservado para metadados/fixtures controladas por versão.
 *
 * Importante:
 * - A Tax Engine não deve carregar alíquotas fixas de ICMS/IPI/PIS/COFINS/DIFAL/MVA a partir do código.
 * - Alíquotas, CST/CSOSN, CFOP, MVA, reduções, benefícios e exceções devem vir do banco de dados.
 * - Este arquivo existe apenas para manter a separação por UF e permitir seeds não oficiais em ambiente de laboratório.
 * - Regras de produção devem ser cadastradas no Supabase com tenant, emitente, produto, operação, UF e vigência.
 */
export const spRules: TaxRule[] = [];
