<!--
  InboxRow: the Svelte counterpart of `@molecule/app-inbox-row-react`'s
  `InboxRow` — selection slot + star toggle + avatar + sender/labels +
  subject/preview + attachment/unread/timestamp. Same props (React names),
  same DOM for the same input. Node-valued props are snippets (a plain string
  or number renders as text), and every visible string goes through `t()` so a
  locale switch re-renders it.

  Inline styles go through the `reactStyle` action (CSSOM property setters),
  exactly as React's runtime applies them, so values normalize the same way.
  The subject line's whitespace lives inside tags: it is a block-level div, so
  a line break between its inline children would draw one space React does
  not render.
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Avatar } from '@molecule/app-ui-svelte'

  import { type CSSStyle, reactStyle } from './style.js'
  import type { InboxRowProps } from './types.js'

  let {
    sender,
    senderAvatarSrc,
    subject,
    preview,
    timestamp,
    unread,
    starred,
    hasAttachment,
    labels,
    selectionSlot,
    onClick,
    onToggleStar,
    className,
  }: InboxRowProps = $props()

  /** Base of the two ids that name the open button (Svelte's `$props.id`). */
  const nameId: string = $props.id()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const senderName = $derived(
    typeof sender === 'string'
      ? sender
      : t('inboxRow.sender', undefined, { defaultValue: 'Sender' }),
  )
  const starLabel = $derived(t('inboxRow.star', undefined, { defaultValue: 'Star' }))
  const unstarLabel = $derived(t('inboxRow.unstar', undefined, { defaultValue: 'Unstar' }))
  const attachmentLabel = $derived(
    t('inboxRow.hasAttachment', undefined, { defaultValue: 'Has attachment' }),
  )

  /** The two ids that name the open button, while `onClick` is set. */
  const senderId = $derived(onClick ? `${nameId}-sender` : undefined)
  const subjectId = $derived(onClick ? `${nameId}-subject` : undefined)
  const openLabelledBy = $derived(onClick ? `${nameId}-sender ${nameId}-subject` : undefined)

  /** React's row style: bold while unread. */
  const rowStyle = $derived<CSSStyle | undefined>(unread ? { fontWeight: '600' } : undefined)
  /** React's star-button inline style (its colour is a ClassMap tone below). */
  const starStyle = $derived<CSSStyle>({
    background: 'none',
    border: 'none',
    fontSize: '16px',
  })
  /** The unread dot's box style; its colour is the ClassMap's info tone. */
  const dotStyle: CSSStyle = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  }
  /** The open button's native resets (React's transparent-cover style). */
  const openStyle: CSSStyle = {
    background: 'transparent',
    border: 'none',
    padding: '0px',
  }

  // The preview span is in the page while `preview` renders something, the
  // separator aside — React's `preview && <span>— {preview}</span>`. Its style
  // attribute is React's `{ opacity: 0.6 }` as the CSSOM serializes it.
  let previewPresent = $state<boolean>()
</script>

{#snippet field(value: InboxRowProps['sender'])}
  {#if typeof value === 'function'}{@render value?.()}{:else}{value ?? ''}{/if}
{/snippet}

{#snippet starButton()}
  <!-- Raised above the open button in its positioned wrapper, so its click
    cannot reach the row's open action. -->
  <button
    type="button"
    onclick={() => onToggleStar?.()}
    aria-pressed={starred}
    data-mol-id="inbox-row-star"
    aria-label={starred ? unstarLabel : starLabel}
    class={cm.cn(cm.cursorPointer, cm.touchTarget, starred ? cm.textTone('warning') : cm.textMuted)}
    use:reactStyle={starStyle}>★</button
  >
{/snippet}

<!-- The row's label text: sender + labels, subject + preview. The sender and
  the subject carry the two ids that name the open button. -->
{#snippet labelRows()}
  <div class={cm.flex({ align: 'baseline', gap: 'sm' })}>
    <span id={senderId} class={cm.textSize('sm')}>{@render field(sender)}</span>
    {#if labels}
      <PresentWhileContent
        tag="span"
        class={cm.cn(
          cm.flex({ align: 'center', gap: 'xs' }),
          onClick ? cm.position('relative') : undefined,
        )}>{@render field(labels)}</PresentWhileContent
      >
    {/if}
  </div>
  <div use:reactStyle={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    <span id={subjectId} class={cm.textSize('sm')}>{@render field(subject)}</span
    >{#if preview}<PresentWhileContent
        tag="span"
        class={cm.cn(cm.textSize('sm'), cm.sp('ml', 2))}
        style="opacity: 0.6;"
        present={previewPresent}
        >— <ContentOrElse bind:present={previewPresent}>{@render field(preview)}</ContentOrElse
        ></PresentWhileContent
      >{/if}
  </div>
{/snippet}

<div
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('px', 3),
    cm.sp('py', 2),
    onClick ? cm.position('relative') : undefined,
    className,
  )}
  use:reactStyle={rowStyle}
>
  {#if onClick}
    <!-- The row's open action: an empty, transparent native button covering
      the whole row (Enter / Space activate it natively), named by the sender
      and the subject. A sibling of the row's other controls, not their
      wrapper, so a button may carry it. -->
    <button
      type="button"
      aria-labelledby={openLabelledBy}
      data-mol-id="inbox-row-open"
      onclick={() => onClick?.()}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      use:reactStyle={openStyle}
    ></button>
  {/if}
  {#if selectionSlot}
    <!-- The selection slot: inside a positioned wrapper while the open button
      exists (the wrapper paints above it, so a click lands on the slot and
      never reaches the open button), bare otherwise. -->
    {#if onClick}<span class={cm.cn(cm.position('relative'))}>{@render field(selectionSlot)}</span
      >{:else}{@render field(selectionSlot)}{/if}
  {/if}
  {#if onToggleStar !== undefined}
    {#if onClick}
      <span class={cm.cn(cm.position('relative'))}>{@render starButton()}</span>
    {:else}
      {@render starButton()}
    {/if}
  {/if}
  <Avatar src={senderAvatarSrc} alt={senderName} name={senderName} size="sm" />
  <div class={cm.cn(cm.flex1, cm.stack(0))} use:reactStyle={{ minWidth: '0px' }}>
    {@render labelRows()}
  </div>
  {#if hasAttachment}
    <span aria-label={attachmentLabel}>📎</span>
  {/if}
  {#if unread}
    <span aria-hidden="true" class={cm.bgTone('info')} use:reactStyle={dotStyle}></span>
  {/if}
  {#if timestamp}
    <PresentWhileContent tag="span" class={cm.cn(cm.textSize('xs'), cm.shrink0)}
      >{@render field(timestamp)}</PresentWhileContent
    >
  {/if}
</div>
