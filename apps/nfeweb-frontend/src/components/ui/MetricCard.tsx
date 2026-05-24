import { ReactNode } from 'react'

type MetricCardProps = {
  title: string
  value: string
  description?: string
  icon: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
}

export function MetricCard({ title, value, description, icon, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-icon">{icon}</div>
      <span>{title}</span>
      <strong>{value}</strong>
      {description ? <small>{description}</small> : null}
    </article>
  )
}
