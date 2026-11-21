import { type JSX, type ReactNode, useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import { type ColorVariant, getClassMap } from '@molecule/app-ui'

/** Props for {@link NoteCard}. */
export interface NoteCardProps {
  /** Note title. */
  title?: ReactNode
  /** Note body text. */
  body: ReactNode
  /**
   * Background tint (CSS colour). The documented note tints (yellow
   * `#fef9c3`, green `#dcfce7`, blue `#dbeafe`, red `#fee2e2`, amber
   * `#fef3c7`) render as the theme's light tint of their tone; a colour
   * with no tone is data, applied as given.
   */
  color?: string
  /** Optional pin / starred indicator. */
  pinned?: boolean
  /** Optional last-modified display. */
  modifiedAt?: ReactNode
  /** Optional right-side actions (edit, archive, delete). */
  actions?: ReactNode
  /**
   * Activates the card: while it is set, an empty, transparent native button
   * covers the whole card and calls this on click — Enter and Space included,
   * natively, since the control is a real button. The button is named by the
   * title when there is one, else the body. The card's other controls (the
   * `actions` slot) sit above that button and keep their own clicks, so they
   * do not fire this.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * The note tints the theme covers, and the tone each one is: a note's colour
 * is chosen by the user, so a tint from this table renders as the theme's
 * light tint of its tone (`bgTone(tone, { subtle: true })`) and follows the
 * app theme. A colour not listed has no tone — it is data, applied as given.
 */
const TINT_TONES: Record<string, ColorVariant> = {
  '#fef9c3': 'warning', // yellow note
  '#fef3c7': 'warning', // amber note (the tint this card originally shipped with)
  '#dcfce7': 'success', // green note
  '#dbeafe': 'info', // blue note
  '#fee2e2': 'error', // red note
}

/**
 * Resolves a note tint to the tone whose light tint the theme renders for it.
 *
 * @param color - The `color` prop (any CSS colour).
 * @returns The tone, or undefined when the colour has no tone (data).
 */
const tintTone = (color: string | undefined): ColorVariant | undefined =>
  color === undefined ? undefined : TINT_TONES[color.trim().toLowerCase()]

/**
 * Sticky-note style card with optional color tint, pinned indicator,
 * and bottom-right actions. Use for note-taking apps, digital
 * post-its, dashboard quick-notes.
 * @param props - Component props (see {@link NoteCardProps}).
 */
export function NoteCard({
  title,
  body,
  color,
  pinned,
  modifiedAt,
  actions,
  onClick,
  className,
}: NoteCardProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const nameId = useId()
  // The card's paper: the light tint of the note colour's tone, or the
  // warning paper when no colour is given. A colour with no tone is data —
  // it is applied as given, over the tone's paper. The text inherits the
  // theme's ink, readable on a theme tint in either mode.
  const tone = tintTone(color) ?? 'warning'
  const dataTint = tintTone(color) === undefined ? color : undefined
  // The open button's accessible name comes from the title when there is one,
  // else the body. Without an onClick no id is rendered, so the card's DOM
  // stays exactly as it is without the action.
  const labelId = onClick ? nameId : undefined
  const content = (
    <>
      {title && (
        <h3 id={labelId} className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
          {title}
        </h3>
      )}
      <div
        id={title ? undefined : labelId}
        className={cm.textSize('sm')}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {body}
      </div>
    </>
  )
  return (
    <article
      className={cm.cn(
        cm.stack(2),
        cm.sp('p', 3),
        cm.bgTone(tone, { subtle: true }),
        cm.shadowLifted,
        className,
      )}
      style={{
        background: dataTint,
        borderRadius: 8,
        // The card owns its absolute children: the open button's overlay and
        // the pinned indicator both sit inside it.
        position: 'relative',
      }}
    >
      {onClick ? (
        <button
          type="button"
          aria-labelledby={nameId}
          data-mol-id="note-card-open"
          onClick={() => onClick()}
          /* mol-bespoke-button: the whole row is the hit area, not a CTA — an empty,
             transparent button over the row; the inline background/border/padding are
             native resets. */
          className={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          style={{ background: 'transparent', border: 'none', padding: 0 }}
        />
      ) : null}
      {pinned && (
        <span
          role="img"
          aria-label={t('noteCard.aria.pinned', undefined, { defaultValue: 'Pinned' })}
          style={{ position: 'absolute', top: 6, right: 6 }}
        >
          📌
        </span>
      )}
      {content}
      {(modifiedAt || actions) && (
        <footer
          className={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            onClick ? cm.position('relative') : undefined,
          )}
        >
          {modifiedAt && <span className={cm.textSize('xs')}>{modifiedAt}</span>}
          {actions}
        </footer>
      )}
    </article>
  )
}
