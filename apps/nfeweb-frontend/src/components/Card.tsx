import { ReactNode } from 'react'

export function Card(props: { title?: string; subtitle?: string; children: ReactNode }) {
  return <section className="erp-card">{props.title && <div className="erp-card-head"><h3>{props.title}</h3>{props.subtitle && <p>{props.subtitle}</p>}</div>}{props.children}</section>
}
