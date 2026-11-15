/**
 * Solid formatted contact display: avatar + name + role + email/phone with
 * leading glyphs + optional address and company, in card, row and compact
 * layouts.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-solid'

import type { ContactDisplayProps } from './types.js'

/**
 * Formatted contact display — avatar + name + role + email/phone with leading
 * icons + optional address and company. Three layouts for different densities.
 *
 * This is the Solid counterpart of `@molecule/app-contact-display-react`'s
 * `ContactDisplay`: the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @param props - Component props (see {@link ContactDisplayProps}).
 * @returns The rendered contact display.
 */
export const ContactDisplay: Component<ContactDisplayProps> = (props) => {
  const cm = getClassMap()
  const layout = (): 'card' | 'row' | 'compact' => props.layout ?? 'card'
  const isCompact = (): boolean => layout() === 'compact'
  return (
    <div
      onClick={props.onClick}
      class={cm.cn(
        cm.flex({
          align: layout() === 'card' ? 'start' : 'center',
          gap: isCompact() ? 'sm' : 'md',
          direction: layout() === 'card' ? 'col' : 'row',
        }),
        props.onClick ? cm.cursorPointer : undefined,
        props.className,
      )}
    >
      <div class={cm.shrink0}>
        <Avatar
          src={props.contact.avatarSrc}
          alt={props.contact.name}
          name={props.contact.name}
          size={isCompact() ? 'sm' : 'md'}
        />
      </div>
      <div class={cm.cn(cm.flex1, cm.stack(1))}>
        <div class={cm.flex({ align: 'baseline', gap: 'sm' })}>
          <span class={cm.cn(cm.textSize(isCompact() ? 'sm' : 'base'), cm.fontWeight('semibold'))}>
            {props.contact.name}
          </span>
          {props.contact.role && <span class={cm.textSize('xs')}>{props.contact.role}</span>}
        </div>
        {props.contact.company && <div class={cm.textSize('sm')}>{props.contact.company}</div>}
        {!isCompact() && props.contact.email && (
          <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
            <span aria-hidden="true">✉</span>
            <a href={`mailto:${props.contact.email}`} class={cm.link}>
              {props.contact.email}
            </a>
          </div>
        )}
        {!isCompact() && props.contact.phone && (
          <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
            <span aria-hidden="true">☎</span>
            <a href={`tel:${props.contact.phone}`} class={cm.link}>
              {props.contact.phone}
            </a>
          </div>
        )}
        {!isCompact() && props.contact.address && (
          <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
            <span aria-hidden="true">⌂</span>
            <span>{props.contact.address}</span>
          </div>
        )}
      </div>
      {props.actions}
    </div>
  )
}
