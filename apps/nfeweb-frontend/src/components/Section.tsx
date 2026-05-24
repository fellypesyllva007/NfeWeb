import type { ReactNode } from 'react'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="panel"><h3>{title}</h3>{children}</section>
}
