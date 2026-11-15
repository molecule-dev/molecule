/**
 * Solid Card wrapping a DefinitionList — the counterpart of
 * `@molecule/app-info-display-react`'s `InfoCard`: the same props (React names),
 * the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import { DefinitionList } from './DefinitionList.jsx'
import type { InfoCardProps } from './types.js'

/**
 * Card wrapping a `<DefinitionList>` of metadata fields.
 *
 * Used all over CRM/helpdesk/finance detail pages (CompanyInfoCard,
 * DealInfoCard, TicketDetailsCard, TransactionDetailsCard) — same shape
 * everywhere, only the fields differ.
 *
 * @param props - Component props (see {@link InfoCardProps}).
 * @returns The rendered info card.
 */
export const InfoCard: Component<InfoCardProps> = (props) => {
  const cm = getClassMap()
  const columns = (): 1 | 2 | 3 => props.columns ?? 1

  return (
    <Card className={props.className} data-mol-id={props.dataMolId}>
      <div class={cm.stack(3)}>
        <header class={cm.flex({ justify: 'between', align: 'center', gap: 'sm' })}>
          <div class={cm.flex({ align: 'center', gap: 'sm' })}>
            {props.icon}
            <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
          </div>
          {props.actions}
        </header>
        <DefinitionList fields={props.fields} columns={columns()} />
      </div>
    </Card>
  )
}
