import { useQuery } from '@tanstack/react-query'
import { getEmitentes } from '../../services/api'

export function EmittersPage() {
  const query = useQuery({ queryKey: ['emitters'], queryFn: getEmitentes })
  const data = query.data as any
  const emitters = Array.isArray(data?.emitentes) ? data.emitentes : []

  return (
    <div className="erp-page">
      <header className="page-title">
        <span className="eyebrow">Cadastro fiscal</span>
        <h2>Emitentes</h2>
        <p>Lista real retornada por /api/emitentes.</p>
      </header>
      <section className="panel">
        {query.isLoading ? <p>Carregando...</p> : null}
        {query.isError ? <p>Não foi possível carregar os emitentes.</p> : null}
        {!query.isLoading && !query.isError && emitters.length === 0 ? <p>Nenhum emitente encontrado no backend.</p> : null}
        {emitters.length > 0 ? <div className="table-wrap"><table><thead><tr><th>ID</th><th>Razão social</th><th>CNPJ</th><th>UF</th><th>Ambiente</th><th>Status</th></tr></thead><tbody>{emitters.map((item: any) => <tr key={item.id}><td>{item.id}</td><td>{item.razao_social}</td><td>{item.cnpj}</td><td>{item.uf}</td><td>{item.ambiente}</td><td>{item.status}</td></tr>)}</tbody></table></div> : null}
      </section>
    </div>
  )
}
