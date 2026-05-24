import { ReactNode } from 'react'

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className="m-page-header"><div><span>ERP Fiscal</span><h1>{title}</h1>{subtitle ? <p>{subtitle}</p> : null}</div></header>
}

export function Panel({ title, subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return <section className="m-panel">{title ? <div className="m-panel-head"><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div> : null}{children}</section>
}

export function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: string }) {
  return <div className={'m-stat ' + tone}><span>{label}</span><strong>{value}</strong></div>
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={'m-pill ' + tone}>{children}</span>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="m-field"><span>{label}</span>{children}</label>
}

export function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return <div className="m-table-wrap"><table className="m-table"><thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
}

export function money(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
