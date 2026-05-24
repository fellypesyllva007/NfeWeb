export function PageTitle(props: { title: string; subtitle?: string }) {
  return <div className="erp-page-head"><div><span className="erp-kicker">NfeWeb ERP</span><h2>{props.title}</h2>{props.subtitle ? <p>{props.subtitle}</p> : null}</div></div>
}
