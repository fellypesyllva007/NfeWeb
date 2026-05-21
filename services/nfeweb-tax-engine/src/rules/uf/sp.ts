import type { TaxRule } from '../../domain/types.js';

/**
 * Pacote SP demonstrativo.
 * Não é uma tabela legal completa nem substitui parametrização/validação contábil.
 * Use como seed inicial e sobrescreva por tenant/produto/operação no Supabase.
 */
export const spRules: TaxRule[] = [
  {
    id: 'system-sp-lp-venda-interna-padrao',
    name: 'SP lucro presumido/real venda interna padrão parametrizável',
    priority: 100,
    active: true,
    source: 'uf',
    conditions: {
      taxRegime: ['lucro_presumido', 'lucro_real'],
      ufOrigin: ['SP'],
      ufDestination: ['SP'],
      operationType: ['venda_mercadoria'],
      interstate: false
    },
    output: {
      cfop: '5102',
      icms: { cst: '00', aliquota: '18.00' },
      pis: { enabled: true, cst: '01', aliquota: '0.65' },
      cofins: { enabled: true, cst: '01', aliquota: '3.00' },
      ipi: { enabled: false, cst: '53', aliquota: '0.00' },
      notes: ['Regra seed para teste. Revisar por NCM, produto, benefício e regime antes de produção.']
    }
  },
  {
    id: 'system-sp-sn-venda-interna-padrao',
    name: 'SP simples nacional venda interna padrão parametrizável',
    priority: 100,
    active: true,
    source: 'uf',
    conditions: {
      taxRegime: ['simples_nacional'],
      ufOrigin: ['SP'],
      ufDestination: ['SP'],
      operationType: ['venda_mercadoria'],
      interstate: false
    },
    output: {
      cfop: '5102',
      icms: { csosn: '102', aliquota: '0.00' },
      pis: { enabled: false, cst: '99', aliquota: '0.00' },
      cofins: { enabled: false, cst: '99', aliquota: '0.00' },
      ipi: { enabled: false, cst: '53', aliquota: '0.00' },
      notes: ['Regra seed de Simples Nacional. Ajustar por CSOSN, operação e anexos aplicáveis.']
    }
  }
];
