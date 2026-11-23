<!--
  The strips stacked above the composer — working plan, background tasks,
  tests, uncommitted files — are one family. `DockStrip` is their shared chrome
  (hairline top border, chevron, muted label, right-hand actions, indented
  detail) and `StatusMark` is their shared status icon, so they cannot drift
  apart.

  Svelte counterpart of `@molecule/app-ide-react`'s `DockStrip` (see that file
  for the design notes): the same props (React names), the same DOM for the
  same input, the same callbacks. Node-valued props (`icon`, `label`,
  `hint`, `actions`, `detailActions`, `chipLabel`) are snippets (or plain
  text); the strip's detail is the `children` snippet. Inside a work tray
  (`WorkTrayContext`) the chip and, when open, the detail are portalled into
  the tray's header and detail elements.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express.
-->
<script module lang="ts">
  import type { Snippet } from 'svelte'

  /**
   * The slots of the one-row work tray (see WorkCard). When a `DockStrip`
   * sits inside it, the strip draws a compact chip into `headerEl` and, while
   * it is the open one, its detail into `detailEl` — so every section shares
   * a single row instead of stacking one bar each. Provided as one `$state`
   * object, so a tray whose open section changes re-renders every strip in it.
   */
  export interface WorkTrayValue {
    /** Where the chips go. Null until the tray has mounted. */
    headerEl: HTMLElement | null
    /** Where the open section's detail goes. */
    detailEl: HTMLElement | null
    /** The open section's `molId`, if any. */
    openId: string | null
    /** Open this section (or close it, when it is already the open one). */
    toggle: (id: string) => void
  }

  /** Provided by the work tray; absent when a strip stands alone. */
  export const WorkTrayContext = Symbol('DockStrip.WorkTrayContext')

  /** A node prop: a snippet, or plain text. */
  export type StripNode = Snippet | string | number

  /** Props for `DockStrip` — the React prop names, React's own contract. */
  export interface DockStripProps {
    /** `data-mol-id` of the strip root. */
    molId: string
    /** `data-mol-id` of the header row's overlay disclosure button. */
    toggleMolId?: string
    /** Whether the detail is shown. */
    expanded: boolean
    /** Toggle the detail. */
    onToggle: () => void
    /** Open a full view directly instead of disclosing inline detail. */
    onActivate?: () => void
    /** Leading icon, before the label. */
    icon?: StripNode
    /** The strip's one-line summary. */
    label: StripNode
    /** Use an icon-only disclosure when the adjacent action already carries the summary. */
    hideLabel?: boolean
    /** A shorter label for the tray chip (defaults to `label`). */
    chipLabel?: StripNode
    /** Hover text for the tray chip. */
    chipTitle?: string
    /** Quieter text after the label (the thing in flight). */
    hint?: StripNode
    /** Right-hand readout and action buttons; they sit above the disclosure overlay and take their own clicks. */
    actions?: StripNode
    /** Secondary actions: at the top of the open detail in the tray, beside `actions` when standalone. */
    detailActions?: StripNode
    /** Extra attributes for the root (e.g. a tone `data-*`). */
    rootProps?: Record<string, string>
    /** The detail shown when expanded (the `children` snippet). */
    children?: Snippet
  }

  /**
   * Whether a node prop holds a snippet rather than plain text.
   *
   * @param value - The prop.
   * @returns True when it renders through a snippet.
   */
  function isSnippet(value: StripNode | undefined): value is Snippet {
    return typeof value === 'function'
  }

  /**
   * The text a plain node prop renders (React renders strings and numbers as
   * text).
   *
   * @param value - The prop.
   * @returns The text, or `''` for a snippet prop.
   */
  function textOf(value: StripNode | undefined): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
</script>

<script lang="ts">
  import { getContext } from 'svelte'

  import { BodyPortal } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  let {
    molId,
    toggleMolId,
    expanded,
    onToggle,
    onActivate,
    icon,
    label,
    hideLabel = false,
    chipLabel,
    chipTitle,
    hint,
    actions,
    detailActions,
    rootProps,
    children,
  }: DockStripProps = $props()

  const cm = getClassMap()
  const tray = getContext<WorkTrayValue | null>(WorkTrayContext) ?? null
  // Names the overlay disclosure button through `aria-labelledby`.
  const labelId = $props.id()
  const rowClasses = cm.cn(
    cm.button({ variant: 'ghost', color: 'secondary', size: 'xs' }),
    cm.touchTargetCompact,
  )
  const labelClasses = cm.cn(cm.textMuted, cm.textSize('xs'))

  // The tray's open section, read from the tray's $state object so a change
  // re-renders this strip.
  const open = $derived(!!tray && !onActivate && tray.openId === molId)
  // The row's accessible name: the label, but only when it is plain text.
  const rowAriaLabel = $derived(
    hideLabel && (typeof label === 'string' || typeof label === 'number')
      ? String(label)
      : undefined,
  )
  const chipHoverText = $derived(
    chipTitle ??
      (hideLabel && (typeof label === 'string' || typeof label === 'number')
        ? String(label)
        : undefined),
  )

  /**
   * Acts on a key press the way React's handler does: only the row's own
   * keys, and only when the key was pressed on the row itself.
   *
   * @param event - The keydown.
   * @param activate - What a press does.
   */
  function onRowKeydown(event: KeyboardEvent, activate: () => void): void {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      activate()
    }
  }

  const trayActivate = (): void => {
    if (onActivate) onActivate()
    else tray?.toggle(molId)
  }
</script>

{#if tray}
  {#if tray.headerEl}
    <BodyPortal target={tray.headerEl}
      ><div
        data-mol-id={molId}
        {...rootProps}
        style="display: inline-flex; align-items: center; gap: 6px; max-width: 100%"
      >
        <div
          role="button"
          tabindex="0"
          data-mol-id={toggleMolId}
          aria-expanded={onActivate ? undefined : open ? 'true' : 'false'}
          aria-label={rowAriaLabel}
          title={chipHoverText}
          class={rowClasses}
          data-state={open ? 'open' : 'closed'}
          onclick={() => trayActivate()}
          onkeydown={(event) => onRowKeydown(event, trayActivate)}
          style={`display: inline-flex; align-items: center; gap: 6px; min-width: 0px${open ? '; box-shadow: inset 0 0 0 1px currentColor' : ''}`}
        >
          {#if icon != null}{#if isSnippet(icon)}{@render icon()}{:else}{textOf(icon)}{/if}{/if}
          {#if hideLabel}
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16">
              <path
                d={open ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'}
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              />
            </svg>
          {:else}
            <span
              class={labelClasses}
              style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis"
            >
              {#if chipLabel != null}
                {#if isSnippet(chipLabel)}{@render chipLabel()}{:else}{textOf(chipLabel)}{/if}
              {:else}
                {#if isSnippet(label)}{@render label()}{:else}{textOf(label)}{/if}
              {/if}
            </span>
          {/if}
        </div>
        {#if actions != null}
          {#if isSnippet(actions)}{@render actions()}{:else}{textOf(actions)}{/if}
        {/if}
      </div></BodyPortal
    >
  {/if}
  {#if open && (children || detailActions != null) && tray.detailEl}
    <BodyPortal target={tray.detailEl}
      ><div data-mol-id={`${molId}-detail`} style="padding: 2px 10px 8px">
        {#if detailActions != null}
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px">
            {#if isSnippet(detailActions)}{@render detailActions()}{:else}{textOf(
                detailActions,
              )}{/if}
          </div>
        {/if}
        {#if children}{@render children()}{/if}
      </div></BodyPortal
    >
  {/if}
{:else}
  <div
    data-mol-id={molId}
    {...rootProps}
    style="border-top: 1px solid rgba(128,128,128,0.15); padding: 8px 8px 8px 10px"
  >
    <div
      class={cm.cn(rowClasses, cm.position('relative'))}
      style="display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer"
    >
      <!-- A `hideLabel` toggle whose label is a NODE (not plain text) has no
           text to name it, so the node renders inside in a visually hidden
           wrapper — its text names the button without changing the row's
           pixels. -->
      <button
        type="button"
        data-mol-id={toggleMolId}
        aria-expanded={onActivate ? undefined : expanded ? 'true' : 'false'}
        aria-labelledby={hideLabel ? undefined : labelId}
        aria-label={rowAriaLabel}
        onclick={onActivate ?? onToggle}
        class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
        style="background: transparent; border: medium; padding: 0px"
      >
        {#if hideLabel && isSnippet(label)}<span class={cm.srOnly}>{@render label()}</span>{/if}
      </button>
      <div style="display: flex; align-items: center; gap: 6px; min-width: 0px">
        {#if !onActivate}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            aria-hidden="true"
            style={`transform: ${expanded ? 'rotate(90deg)' : 'rotate(0deg)'}; transition: transform 120ms; opacity: 0.5; flex-shrink: 0`}
          >
            <path
              d="M6 4l4 4-4 4"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {/if}
        {#if icon != null}
          {#if isSnippet(icon)}{@render icon()}{:else}{textOf(icon)}{/if}
        {/if}
        {#if !hideLabel}
          <span
            id={labelId}
            class={labelClasses}
            style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis"
          >
            {#if isSnippet(label)}{@render label()}{:else}{textOf(label)}{/if}
          </span>
        {/if}
        {#if hint != null}
          <span
            class={labelClasses}
            style="opacity: 0.75; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0px"
          >
            {#if isSnippet(hint)}{@render hint()}{:else}{textOf(hint)}{/if}
          </span>
        {/if}
      </div>
      {#if actions != null || detailActions != null}
        <div
          class={cm.position('relative')}
          style="display: flex; align-items: center; gap: 6px; flex-shrink: 0"
        >
          {#if actions != null}
            {#if isSnippet(actions)}{@render actions()}{:else}{textOf(actions)}{/if}
          {/if}
          {#if detailActions != null}
            {#if isSnippet(detailActions)}{@render detailActions()}{:else}{textOf(
                detailActions,
              )}{/if}
          {/if}
        </div>
      {/if}
    </div>
    {#if !onActivate && expanded && children}
      <div style="margin-top: 6px; padding-left: 18px">{@render children()}</div>
    {/if}
  </div>
{/if}
