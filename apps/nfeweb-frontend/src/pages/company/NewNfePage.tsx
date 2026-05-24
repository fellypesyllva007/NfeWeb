import { FormEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { callNfeOperation } from '../../services/api'

type LabOperation = 'gerar-chave' | 'carregar-ini' | 'assinar' | 'validar-regras' | 'status-servico'

const operations: Array<[LabOperation, string]> = [
  ['gerar-chave', 'Gerar chave'],
  ['carregar-ini', 'Carregar INI'],
  ['assinar', 'Assinar XML'],
  ['validar-regras', 'Validar regras'],
  ['status-servico', 'Status SEFAZ'],
]

export function NewNfePage() {
  const [emitterId, setEmitterId] = useState('')
  const [result, setResult] = useState<any>({ status: 'idle', message: 'Informe um emitente e execute uma operação real da API.' })
  const mutation = useMutation({
    mutationFn: (operation: LabOperation) => callNfeOperation(operation, { emitter_id: emitterId, include_xml: false }),
    onSuccess: setResult,
    onError: (error) => setResult({ status: 'error', message: error instanceof Error ? error.message : 'Erro inesperado' }),
  })

  function submit(event: FormEvent, operation: LabOperation) {
    event.preventDefault()
    if (!emitterId.trim()) {
      setResult({ status: 'error', message: 'Informe o ID do emitente.' })
      return
    }
    mutation.mutate(operation)
  }

  return (
    <div className="erp-page nfe-workspace">
      <header className="page-title">
        <span className="eyebrow">Emissor NF-e</span>
        <h2>Nova NF-e</h2>
        <p>Fluxo fiscal conectado às operações reais disponíveis no backend.</p>
      </header>
      <div className="nfe-grid">
        <section className="panel">
          <h3>Identificação</h3>
          <label>Emitente fiscal<input value={emitterId} onChange={(e) => setEmitterId(e.target.value)} placeholder="ID real do emitente" /></label>
          <p className="field-help">Use um emitente retornado por /api/emitentes. Nenhum emitente fictício é preenchido automaticamente.</p>
        </section>
        <section className="panel nfe-actions">
          <h3>Ações fiscais</h3>
          {operations.map(([operation, label], index) => <form key={operation} onSubmit={(event) => submit(event, operation)}><button className="operation-button" disabled={mutation.isPending}><span>{index + 1}</span>{mutation.isPending ? 'Executando...' : label}</button></form>)}
        </section>
      </div>
      <section className="panel">
        <h3>Resultado da API</h3>
        <pre className="json-box">{JSON.stringify(result, null, 2)}</pre>
      </section>
    </div>
  )
}
