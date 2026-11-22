<!--
  One segment of a composable card body.

  Svelte counterpart of `@molecule/app-ide-react`'s `renderCardSegment` (see
  that file for the design notes): the same node for the same segment — a plain
  string inside a `<span>`, an inline monospace `<code>`, or an action rendered
  as a link or a plain-link `<button>`. Shared by the notice card (here, above)
  and the timeline's plain system cards, so both render a body the same way.
  Svelte has no render-a-node API, so the function React exports is this
  component: a component boundary adds no element, so the DOM is unchanged.

  A body-segment link ALWAYS opens in a new tab (`_blank` +
  `noopener noreferrer`) — it sits inside a sentence, so it must never navigate
  the IDE away. An unapproved scheme (`javascript:`, `data:` …) renders as
  inert text, the same policy as markdown links.

  Styles are hand-written CSS strings (React's camelCase style objects, whose
  unitless radii become pixels) applied through the CSSOM, so their serialized
  form matches React's.
-->
<script module lang="ts">
  import type { ChatEventCardAction, ChatEventCardSegment } from '@molecule/app-ide-panel-logic'
  import { CHAT_CARD_CODE_STYLE, CHAT_CARD_LINK_STYLE } from '@molecule/app-ide-panel-logic'

  import { isAllowedLinkHref } from './markdown-content.js'

  /** One segment, resolved to what the template renders. */
  export type CardSegmentNode =
    | { kind: 'text'; text: string }
    | { kind: 'code'; code: string }
    | { kind: 'link'; label: string; href: string; allowed: boolean; code: boolean }
    | { kind: 'button'; label: string; action: ChatEventCardAction; code: boolean }

  /**
   * Resolves one segment into the node the template renders. Mirrors React's
   * branches exactly: a string, then a code-only object (`code` without
   * `label`), then anything else is an action.
   *
   * @param segment - The segment to resolve.
   * @returns The node to render.
   */
  export function resolveCardSegment(segment: ChatEventCardSegment): CardSegmentNode {
    if (typeof segment === 'string') return { kind: 'text', text: segment }
    if ('code' in segment && !('label' in segment)) {
      return { kind: 'code', code: segment.code }
    }
    const action = segment as ChatEventCardAction
    if (action.href) {
      return {
        kind: 'link',
        label: action.label,
        href: action.href,
        allowed: isAllowedLinkHref(action.href),
        code: !!action.code,
      }
    }
    return { kind: 'button', label: action.label, action, code: !!action.code }
  }

  /** The inline code chip's style, as React's `CHAT_CARD_CODE_STYLE` serializes. */
  const CODE_STYLE = [
    `font-family: ${CHAT_CARD_CODE_STYLE.fontFamily}`,
    `font-size: ${CHAT_CARD_CODE_STYLE.fontSize}`,
    `padding: ${CHAT_CARD_CODE_STYLE.padding}`,
    `border-radius: ${CHAT_CARD_CODE_STYLE.borderRadius}px`,
    `background: ${CHAT_CARD_CODE_STYLE.background}`,
    `border: ${CHAT_CARD_CODE_STYLE.border}`,
    `white-space: ${CHAT_CARD_CODE_STYLE.whiteSpace}`,
  ].join('; ')

  /** The inline link's style, as React's `CHAT_CARD_LINK_STYLE` serializes. */
  const LINK_STYLE = [
    `color: ${CHAT_CARD_LINK_STYLE.color}`,
    `text-decoration: ${CHAT_CARD_LINK_STYLE.textDecoration}`,
    `cursor: ${CHAT_CARD_LINK_STYLE.cursor}`,
  ].join('; ')

  /**
   * The style of a clickable command: the code chip plus the link's colour and
   * pointer cursor (React spreads `CHAT_CARD_CODE_STYLE` and overrides those
   * two, so it carries no underline).
   */
  const CODE_LINK_STYLE = `${CODE_STYLE}; color: ${CHAT_CARD_LINK_STYLE.color}; cursor: pointer`

  /** The plain-link reset an inline action `<button>` wears under its link style. */
  const BUTTON_RESET_STYLE = 'background: none; border: none; padding: 0px; font: inherit'
</script>

<script lang="ts">
  import { styleText } from './inline-style.js'

  /** The segment to render (React's first `renderCardSegment` argument). */
  let { seg }: { seg: ChatEventCardSegment } = $props()

  const node = $derived(resolveCardSegment(seg))

  /** Whether the node's element wears the code-chip link style. */
  const codeLink = $derived((node.kind === 'link' || node.kind === 'button') && node.code === true)

  /** The link style the node's element wears (a clickable command reads as code). */
  const linkStyle = $derived(codeLink ? CODE_LINK_STYLE : LINK_STYLE)
</script>

{#if node.kind === 'text'}
  <span>{node.text}</span>
{:else if node.kind === 'code'}
  <code use:styleText={CODE_STYLE}>{node.code}</code>
{:else if node.kind === 'link'}
  {#if node.allowed}
    <a href={node.href} target="_blank" rel="noopener noreferrer" use:styleText={linkStyle}
      >{node.label}</a
    >
  {:else}
    <span use:styleText={linkStyle}>{node.label}</span>
  {/if}
{:else}
  <!-- mol-bespoke-button: inline mid-sentence card link — a <button> reset to plain link text so an action can sit inside a sentence, not a standalone CTA -->
  <button
    type="button"
    onclick={node.action.onClick}
    use:styleText={`${BUTTON_RESET_STYLE}; ${linkStyle}`}>{node.label}</button
  >
{/if}
