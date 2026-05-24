export function UnavailablePage({ title }: { title: string }) {
  return (
    <div className="erp-page">
      <header className="page-title">
        <span className="eyebrow">Módulo pendente</span>
        <h2>{title}</h2>
        <p>Este módulo ainda não possui endpoint real no backend. Nenhum dado fictício será exibido.</p>
      </header>
      <div className="module-blocked">
        <strong>Integração necessária</strong>
        <p>Quando o endpoint correspondente existir na NfeWeb API, esta tela será conectada aos dados reais.</p>
      </div>
    </div>
  )
}
