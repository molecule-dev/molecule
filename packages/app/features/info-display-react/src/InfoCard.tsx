import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

import { type DefinitionField,DefinitionList } from './DefinitionList.js'

interface InfoCardProps {
  /** Card heading. */
  title: ReactNode
  /** Optional leading icon. */
  icon?: ReactNode
  /** Optional right-side header actions (edit button, overflow menu). */
  actions?: ReactNode
  /** Structured fields to display. */
  fields: DefinitionField[]
  /** Grid column count — `1` stacks labels above values, `2+` puts labels beside values. */
  columns?: 1 | 2 | 3
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string
}

/**
 * Card wrapping a `<DefinitionList>` of metadata fields.
 *
 * Used all over CRM/helpdesk/finance detail pages (CompanyInfoCard,
 * DealInfoCard, TicketDetailsCard, TransactionDetailsCard) — same shape
 * everywhere, only the fields differ.
 * @param root0
 * @param root0.title
 * @param root0.icon
 * @param root0.actions
 * @param root0.fields
 * @param root0.columns
 * @param root0.className
 * @param root0.dataMolId
 */
export function InfoCard({
  title,
  icon,
  actions,
  fields,
  columns = 1,
  className,
  dataMolId,
}: InfoCardProps) {
  const cm = getClassMap()
  return (
    <Card className={className} data-mol-id={dataMolId}>
      <div className={cm.stack(3)}>
        <header className={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
            {icon}
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
          </div>
          {actions}
        </header>
        <DefinitionList fields={fields} columns={columns} />
      </div>
    </Card>
  )
}
