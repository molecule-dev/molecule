import { type JSX, type ReactNode, useId } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

/** Fields describing a contact rendered by ContactDisplay. */
export interface ContactFields {
  name: string
  email?: string
  phone?: string
  role?: ReactNode
  avatarSrc?: string
  address?: ReactNode
  company?: ReactNode
}

/** Props for {@link ContactDisplay}. */
export interface ContactDisplayProps {
  contact: ContactFields
  /** Layout preset. */
  layout?: 'card' | 'row' | 'compact'
  /** Optional right-side actions. */
  actions?: ReactNode
  /**
   * Activates the contact: the whole row becomes clickable through a
   * transparent native button covering it, named by the contact name (the
   * name span), so Enter and Space activate it natively. The row's inner
   * controls — the mail/tel links and the `actions` slot — sit above that
   * button and keep their own clicks.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Formatted contact display — avatar + name + role + email/phone with
 * leading icons + optional address and company. Three layouts for
 * different densities.
 * @param props - Component props (see {@link ContactDisplayProps}).
 */
export function ContactDisplay({
  contact,
  layout = 'card',
  actions,
  onClick,
  className,
}: ContactDisplayProps): JSX.Element {
  const cm = getClassMap()
  const nameId = useId()
  const { name, email, phone, role, avatarSrc, address, company } = contact
  const isCompact = layout === 'compact'
  const direction = layout === 'card' ? 'col' : 'row'
  const nameClass = cm.cn(cm.textSize(isCompact ? 'sm' : 'base'), cm.fontWeight('semibold'))
  // The row's open control: a transparent native button covering the row
  // (Enter / Space activate it natively), named by the contact name. The
  // first child of the root, and a sibling — not a wrapper — of the row's
  // inner controls, so those stay reachable controls (a button's children
  // are presentational).
  const openButton = onClick ? (
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="contact-display-open"
      onClick={() => onClick()}
      /* mol-bespoke-button: the whole row is the hit area, not a CTA — an empty,
         transparent button over the row; the inline background/border/padding are
         native resets. */
      className={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      style={{ background: 'transparent', border: 'none', padding: '0' }}
    />
  ) : null
  // The mail/tel links are controls: when the open button covers the row,
  // their line paints above it so a click on the link keeps its own action.
  const raisedControlLineClass = onClick
    ? cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'), cm.position('relative'))
    : cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))
  return (
    <div
      className={cm.cn(
        cm.flex({
          align: layout === 'card' ? 'start' : 'center',
          gap: isCompact ? 'sm' : 'md',
          direction,
        }),
        onClick ? cm.position('relative') : undefined,
        className,
      )}
    >
      {openButton}
      <div className={cm.shrink0}>
        <Avatar src={avatarSrc} alt={name} name={name} size={isCompact ? 'sm' : 'md'} />
      </div>
      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
          <span id={onClick ? nameId : undefined} className={nameClass}>
            {name}
          </span>
          {role && <span className={cm.textSize('xs')}>{role}</span>}
        </div>
        {company && <div className={cm.textSize('sm')}>{company}</div>}
        {!isCompact && email && (
          <div className={raisedControlLineClass}>
            <span aria-hidden>✉</span>
            <a href={`mailto:${email}`} className={cm.link}>
              {email}
            </a>
          </div>
        )}
        {!isCompact && phone && (
          <div className={raisedControlLineClass}>
            <span aria-hidden>☎</span>
            <a href={`tel:${phone}`} className={cm.link}>
              {phone}
            </a>
          </div>
        )}
        {!isCompact && address && (
          <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
            <span aria-hidden>⌂</span>
            <span>{address}</span>
          </div>
        )}
      </div>
      {onClick && actions ? (
        <div className={cm.position('relative')}>{actions}</div>
      ) : (
        (actions ?? null)
      )}
    </div>
  )
}
