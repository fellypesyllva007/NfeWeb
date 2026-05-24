export function Metric(props: { label: string; value: string; tone?: string; hint?: string }) {
  const className = 'erp-metric ' + (props.tone || 'neutral')
  return <div className={className}><span>{props.label}</span><strong>{props.value}</strong>{props.hint ? <small>{props.hint}</small> : null}</div>
}
