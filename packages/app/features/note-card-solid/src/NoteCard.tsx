/**
 * Solid sticky-note style card.
 *
 * Solid counterpart of `@molecule/app-note-card-react`'s `NoteCard` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { NoteCardProps } from './types.js'

/**
 * Sticky-note style card with optional color tint, pinned indicator, and
 * bottom-right actions. Use for note-taking apps, digital post-its,
 * dashboard quick-notes.
 *
 * The card intentionally keeps a paper-sticky-note look in BOTH themes: its
 * text color is fixed near-black, so `color` must be a LIGHT pastel — a dark
 * `color` value makes the body unreadable. The accessible label of the pin
 * indicator is the same literal React renders (`aria-label="Pinned"`); the
 * React package does not route it through i18n.
 *
 * @param props - Component props (see {@link NoteCardProps}).
 * @returns The rendered note card.
 */
export const NoteCard: Component<NoteCardProps> = (props) => {
  const cm = getClassMap()
  return (
    <article
      onClick={(event) => props.onClick?.(event)}
      class={cm.cn(
        cm.stack(2),
        cm.sp('p', 3),
        props.onClick ? cm.cursorPointer : undefined,
        props.className,
      )}
      style={{
        background: props.color ?? '#fef3c7',
        color: '#1f2937',
        'border-radius': '8px',
        'box-shadow': '0 1px 3px rgba(0,0,0,0.08)',
        position: 'relative',
      }}
    >
      {props.pinned ? (
        <span aria-label="Pinned" style={{ position: 'absolute', top: '6px', right: '6px' }}>
          📌
        </span>
      ) : null}
      {props.title ? (
        <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{props.title}</h3>
      ) : null}
      <div class={cm.textSize('sm')} style={{ 'white-space': 'pre-wrap' }}>
        {props.body}
      </div>
      {props.modifiedAt || props.actions ? (
        <footer class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          {props.modifiedAt ? <span class={cm.textSize('xs')}>{props.modifiedAt}</span> : null}
          {props.actions}
        </footer>
      ) : null}
    </article>
  )
}
