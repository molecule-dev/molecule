/**
 * Solid forum / discussion-board thread row.
 *
 * Solid counterpart of `@molecule/app-forum-thread-row-react`'s
 * `ForumThreadRow` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ForumThreadRowProps } from './types.js'

/**
 * Forum / discussion-board thread row. Shows the title, optional excerpt, vote
 * score + reply/view counts, pin/lock badges, author, and timestamp. Pass
 * `voteControls` to render up/down buttons inline.
 *
 * The counter labels ("votes", "replies", "views") and the pin/lock
 * aria-labels are the same hardcoded English React renders (React has no
 * companion locale bond yet); the row has no `data-mol-id` support, exactly
 * like React.
 *
 * @param props - Component props (see {@link ForumThreadRowProps}).
 * @returns The rendered thread row.
 */
export const ForumThreadRow: Component<ForumThreadRowProps> = (props) => {
  const cm = getClassMap()
  return (
    <article
      onClick={(event) => props.onClick?.(event)}
      class={cm.cn(
        cm.flex({ align: 'start', gap: 'sm' }),
        cm.sp('p', 3),
        props.onClick ? cm.cursorPointer : undefined,
        props.className,
      )}
    >
      {props.voteControls ? <div class={cm.shrink0}>{props.voteControls}</div> : null}
      {props.voteScore !== undefined && !props.voteControls ? (
        <div class={cm.cn(cm.shrink0, cm.textCenter, cm.stack(0))}>
          <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{props.voteScore}</span>
          <span class={cm.textSize('xs')}>votes</span>
        </div>
      ) : null}
      <div class={cm.cn(cm.flex1, cm.stack(1))}>
        <header class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {props.pinned ? (
            <span aria-label="Pinned" title="Pinned">
              📌
            </span>
          ) : null}
          {props.locked ? (
            <span aria-label="Locked" title="Locked">
              🔒
            </span>
          ) : null}
          <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{props.title}</h3>
        </header>
        {props.excerpt ? <p class={cm.textSize('sm')}>{props.excerpt}</p> : null}
        <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {props.author ? (
            <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{props.author}</span>
          ) : null}
          {props.createdAt ? (
            <span class={cm.textSize('xs')}>
              {'· '}
              {props.createdAt}
            </span>
          ) : null}
          {props.replyCount !== undefined ? (
            <span class={cm.textSize('xs')}>{`· ${props.replyCount} replies`}</span>
          ) : null}
          {props.viewCount !== undefined ? (
            <span class={cm.textSize('xs')}>{`· ${props.viewCount} views`}</span>
          ) : null}
        </div>
        {props.tags ? (
          <div class={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>{props.tags}</div>
        ) : null}
      </div>
    </article>
  )
}
