/**
 * Solid forum / discussion-board thread row.
 *
 * Solid counterpart of `@molecule/app-forum-thread-row-react`'s
 * `ForumThreadRow` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import { type Component, createUniqueId } from 'solid-js'

import { PresentWhileNode, ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { ForumThreadRowProps } from './types.js'

/**
 * Forum / discussion-board thread row. Shows the title, optional excerpt, vote
 * score + reply/view counts, pin/lock badges, author, and timestamp. Pass
 * `voteControls` to render up/down buttons inline.
 *
 * The marker labels ("Pinned" / "Locked", announced through `role="img"` +
 * `aria-label`) and the counter labels ("votes", "{{count}} replies",
 * "{{count}} views") go through `t()` with those English defaults — the same
 * text, through the same keys, React renders. The row has no root
 * `data-mol-id` prop, exactly like React.
 *
 * @param props - Component props (see {@link ForumThreadRowProps}).
 * @returns The rendered thread row.
 */
export const ForumThreadRow: Component<ForumThreadRowProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The row's own text, through the same keys React renders (each read is
  // reactive, so a locale switch re-renders).
  const pinnedLabel = (): string =>
    t('forumThreadRow.aria.pinned', undefined, { defaultValue: 'Pinned' })
  const lockedLabel = (): string =>
    t('forumThreadRow.aria.locked', undefined, { defaultValue: 'Locked' })
  const votesLabel = (): string =>
    t('forumThreadRow.label.votes', undefined, { defaultValue: 'votes' })
  const repliesText = (): string | undefined =>
    props.replyCount === undefined
      ? undefined
      : t(
          'forumThreadRow.label.replies',
          { count: props.replyCount },
          {
            defaultValue: '{{count}} replies',
          },
        )
  const viewsText = (): string | undefined =>
    props.viewCount === undefined
      ? undefined
      : t(
          'forumThreadRow.label.views',
          { count: props.viewCount },
          {
            defaultValue: '{{count}} views',
          },
        )
  // The open button is named by the title: the id goes on the `<h3>` itself,
  // so the row's accessible name is the thread title.
  const nameId = createUniqueId()
  return (
    <article
      class={cm.cn(
        cm.flex({ align: 'start', gap: 'sm' }),
        cm.sp('p', 3),
        props.onClick ? cm.position('relative') : undefined,
        props.className,
      )}
    >
      {props.onClick && (
        <button
          type="button"
          aria-labelledby={nameId}
          data-mol-id="forum-thread-row-open"
          onClick={() => props.onClick?.()}
          /* mol-bespoke-button: the whole row is the hit area, not a CTA — an
             empty, transparent button over the row; the inline background/
             border/padding are native resets. React writes the shorthand
             `border: 'none'` and `padding: 0`, which the CSSOM serializes as
             `border: medium` and `0px` — Solid writes the style attribute
             directly, so the port writes that same serialized form (identical
             computed style). */
          class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          style={{ background: 'transparent', border: 'medium', padding: '0px' }}
        />
      )}
      <ResolveNode node={props.voteControls}>
        {(voteControls, hasVoteControls) => (
          <>
            {hasVoteControls() ? (
              <div class={cm.cn(cm.shrink0, props.onClick ? cm.position('relative') : undefined)}>
                {voteControls()}
              </div>
            ) : null}
            {props.voteScore !== undefined && !hasVoteControls() ? (
              <div class={cm.cn(cm.shrink0, cm.textCenter, cm.stack(0))}>
                <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
                  {props.voteScore}
                </span>
                <span class={cm.textSize('xs')}>{votesLabel()}</span>
              </div>
            ) : null}
          </>
        )}
      </ResolveNode>
      <div class={cm.cn(cm.flex1, cm.stack(1))}>
        <header class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {props.pinned ? (
            <span role="img" aria-label={pinnedLabel()} title={pinnedLabel()}>
              📌
            </span>
          ) : null}
          {props.locked ? (
            <span role="img" aria-label={lockedLabel()} title={lockedLabel()}>
              🔒
            </span>
          ) : null}
          <h3
            id={props.onClick ? nameId : undefined}
            class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}
          >
            {props.title}
          </h3>
        </header>
        <PresentWhileNode node={props.excerpt}>
          {(excerpt) => <p class={cm.textSize('sm')}>{excerpt()}</p>}
        </PresentWhileNode>
        <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          <PresentWhileNode node={props.author}>
            {(author) => (
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{author()}</span>
            )}
          </PresentWhileNode>
          <PresentWhileNode node={props.createdAt}>
            {(createdAt) => (
              <span class={cm.textSize('xs')}>
                {'· '}
                {createdAt()}
              </span>
            )}
          </PresentWhileNode>
          {repliesText() !== undefined ? (
            <span class={cm.textSize('xs')}>{`· ${repliesText()}`}</span>
          ) : null}
          {viewsText() !== undefined ? (
            <span class={cm.textSize('xs')}>{`· ${viewsText()}`}</span>
          ) : null}
        </div>
        <PresentWhileNode node={props.tags}>
          {(tags) => (
            <div
              class={cm.cn(
                cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
                props.onClick ? cm.position('relative') : undefined,
              )}
            >
              {tags()}
            </div>
          )}
        </PresentWhileNode>
      </div>
    </article>
  )
}
