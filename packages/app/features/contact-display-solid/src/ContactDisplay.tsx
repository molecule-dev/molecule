/**
 * Solid formatted contact display: avatar + name + role + email/phone with
 * leading glyphs + optional address and company, in card, row and compact
 * layouts.
 *
 * @module
 */

import { type Component, createUniqueId } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-solid'

import type { ContactDisplayProps } from './types.js'

/**
 * The open button's native resets. Declared outside the JSX so the Solid
 * compiler does not inline it into the template (a static style would bypass
 * the CSSOM serialization every other framework's inline style goes through).
 */
const openButtonStyle = { background: 'transparent', border: 'none', padding: '0' }

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
  const nameId = createUniqueId()
  const layout = (): 'card' | 'row' | 'compact' => props.layout ?? 'card'
  const isCompact = (): boolean => layout() === 'compact'
  const nameClass = (): string =>
    cm.cn(cm.textSize(isCompact() ? 'sm' : 'base'), cm.fontWeight('semibold'))
  // The row's open control: a transparent native button covering the row
  // (Enter / Space activate it natively), named by the contact name. The
  // first child of the root, and a sibling — not a wrapper — of the row's
  // inner controls, so those stay reachable controls.
  const openButton = props.onClick ? (
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="contact-display-open"
      onClick={() => props.onClick?.()}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      style={openButtonStyle}
    />
  ) : null
  // The mail/tel links are controls: when the open button covers the row,
  // their line paints above it so a click on the link keeps its own action.
  const raisedControlLineClass = (): string =>
    props.onClick
      ? cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'), cm.position('relative'))
      : cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))
  return (
    <div
      class={cm.cn(
        cm.flex({
          align: layout() === 'card' ? 'start' : 'center',
          gap: isCompact() ? 'sm' : 'md',
          direction: layout() === 'card' ? 'col' : 'row',
        }),
        props.onClick ? cm.position('relative') : undefined,
        props.className,
      )}
    >
      {openButton}
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
          {props.onClick ? (
            <span id={nameId} class={nameClass()}>
              {props.contact.name}
            </span>
          ) : (
            <span class={nameClass()}>{props.contact.name}</span>
          )}
          {props.contact.role && <span class={cm.textSize('xs')}>{props.contact.role}</span>}
        </div>
        {props.contact.company && <div class={cm.textSize('sm')}>{props.contact.company}</div>}
        {!isCompact() && props.contact.email && (
          <div class={raisedControlLineClass()}>
            <span aria-hidden="true">✉</span>
            <a href={`mailto:${props.contact.email}`} class={cm.link}>
              {props.contact.email}
            </a>
          </div>
        )}
        {!isCompact() && props.contact.phone && (
          <div class={raisedControlLineClass()}>
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
      {props.onClick && props.actions ? (
        <div class={cm.position('relative')}>{props.actions}</div>
      ) : (
        props.actions
      )}
    </div>
  )
}
