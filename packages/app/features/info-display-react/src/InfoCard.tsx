import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

import { type DefinitionField, DefinitionList } from './DefinitionList.js'

/** Props for {@link InfoCard}. */
export interface InfoCardProps {
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
 * @param props - Component props (see {@link InfoCardProps}).
 */
export function InfoCard({
  title,
  icon,
  actions,
  fields,
  columns = 1,
  className,
  dataMolId,
}: InfoCardProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Card className={className} data-mol-id={dataMolId}>
      <Box as="div" className={cm.stack(3)}>
        <Box as="header" className={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <Box as="div" className={cm.flex({ align: 'center', gap: 'sm' })}>
            {icon}
            <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
              {title}
            </Text>
          </Box>
          {actions}
        </Box>
        <DefinitionList fields={fields} columns={columns} />
      </Box>
    </Card>
  )
}
