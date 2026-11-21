/**
 * Solid sticky-note style card.
 *
 * Solid counterpart of `@molecule/app-note-card-react`'s `NoteCard` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { type Component, createUniqueId, type JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { type ColorVariant, getClassMap } from '@molecule/app-ui'

import type { NoteCardProps } from './types.js'

/**
 * The open button's overlay reset: an empty, transparent native button over
 * the whole card (the same inline style React applies).
 */
const openButtonStyle: JSX.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '0px',
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
 * Sticky-note style card with optional color tint, pinned indicator, and
 * bottom-right actions. Use for note-taking apps, digital post-its,
 * dashboard quick-notes.
 *
 * The card's paper is a theme tone: the documented note tints (yellow
 * `#fef9c3`, green `#dcfce7`, blue `#dbeafe`, red `#fee2e2`, amber
 * `#fef3c7`) render as the theme's light tint of the matching tone, so the
 * card and its text (the theme's ink) follow the app theme. A `color` with
 * no tone is data: it is applied as given, over the tone's paper. The
 * accessible label of the pin
 * indicator is the string React renders (`t('noteCard.aria.pinned', undefined,
 * { defaultValue: 'Pinned' })`), read through `useTranslation()` so it follows
 * a locale switch.
 *
 * @param props - Component props (see {@link NoteCardProps}).
 * @returns The rendered note card.
 */
export const NoteCard: Component<NoteCardProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const nameId = createUniqueId()
  const content = (
    <>
      {props.title ? (
        <h3
          id={props.onClick ? nameId : undefined}
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}
        >
          {props.title}
        </h3>
      ) : null}
      <div
        id={props.title ? undefined : props.onClick ? nameId : undefined}
        class={cm.textSize('sm')}
        style={{ 'white-space': 'pre-wrap' }}
      >
        {props.body}
      </div>
    </>
  )
  return (
    // The card's paper: the light tint of the note colour's tone, or the
    // warning paper when no colour is given. A colour with no tone is data —
    // it is applied as given, over the tone's paper. The text inherits the
    // theme's ink, readable on a theme tint in either mode.
    <article
      class={cm.cn(
        cm.stack(2),
        cm.sp('p', 3),
        cm.bgTone(tintTone(props.color) ?? 'warning', { subtle: true }),
        cm.shadowLifted,
        props.className,
      )}
      style={{
        background: tintTone(props.color) === undefined ? props.color : undefined,
        'border-radius': '8px',
        // The card owns its absolute children: the open button's overlay and
        // the pinned indicator both sit inside it.
        position: 'relative',
      }}
    >
      {props.onClick ? (
        <button
          type="button"
          aria-labelledby={nameId}
          data-mol-id="note-card-open"
          onClick={() => props.onClick?.()}
          class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          style={openButtonStyle}
        />
      ) : null}
      {props.pinned ? (
        <span
          role="img"
          aria-label={t('noteCard.aria.pinned', undefined, { defaultValue: 'Pinned' })}
          style={{ position: 'absolute', top: '6px', right: '6px' }}
        >
          📌
        </span>
      ) : null}
      {content}
      {props.modifiedAt || props.actions ? (
        <footer
          class={cm.cn(
            cm.flex({ align: 'center', justify: 'between', gap: 'sm' }),
            props.onClick ? cm.position('relative') : undefined,
          )}
        >
          {props.modifiedAt ? <span class={cm.textSize('xs')}>{props.modifiedAt}</span> : null}
          {props.actions}
        </footer>
      ) : null}
    </article>
  )
}
