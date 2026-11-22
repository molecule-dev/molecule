<!--
  One status icon for every strip row: the landing page's green check circle
  when done, the platform's molecule spinner while active, a red crossed circle
  when failed, an empty ring when still to do. Svelte counterpart of the
  `StatusMark` in `@molecule/app-ide-react`'s DockStrip (see that file for the
  design notes) — the same props, the same DOM for the same input.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express.
-->
<script module lang="ts">
  /** The states a strip row can be in. */
  export type StatusMarkState = 'done' | 'active' | 'todo' | 'failed' | 'waiting' | 'stopped'

  /** Props for `StatusMark` — the React prop names, React's own contract. */
  export interface StatusMarkProps {
    /** The row's state. */
    state: StatusMarkState
    /** Pixel size (default 16). */
    size?: number
  }
</script>

<script lang="ts">
  import { useThemeMode } from '@molecule/app-svelte'
  import { moleculeSpinnerMarkSvg } from '@molecule/app-ui'

  import Markup from './Markup.svelte'

  let { state, size = 16 }: StatusMarkProps = $props()
  // Unique per rendered instance on a page: two svgs sharing one gradient id
  // cross-reference each other's gradients.
  let instanceId = $props.id()
  const mode = useThemeMode()
  const gradientId = `mol-mark-spinner-${instanceId.replace(/[:]/g, '')}`

  const isLight = $derived($mode === 'light')
  // Not running: a still ring that says why — a question mark when the person
  // has to answer (amber), a dash when the work simply stopped (muted).
  const waitingInk = $derived(isLight ? '#9a6700' : '#e3b341')
  const stoppedInk = $derived(isLight ? '#6e7781' : '#8b949e')
  const idleInk = $derived(state === 'waiting' ? waitingInk : stoppedInk)
  const markInk = $derived(
    state === 'failed' ? (isLight ? '#cf222e' : '#f47067') : isLight ? '#1e7a00' : '#5bb98c',
  )
  const markTint = $derived(
    state === 'failed'
      ? isLight
        ? 'rgba(207, 34, 46, 0.1)'
        : 'rgba(244, 112, 103, 0.16)'
      : isLight
        ? 'rgba(30, 122, 0, 0.12)'
        : 'rgba(91, 185, 140, 0.16)',
  )
</script>

{#if state === 'active'}
  <span aria-hidden="true" style="display: inline-flex; flex-shrink: 0"
    ><Markup markup={moleculeSpinnerMarkSvg({ size, gradientId })} /></span
  >
{:else if state === 'todo'}
  <span
    aria-hidden="true"
    style={`display: inline-block; flex-shrink: 0; box-sizing: border-box; width: ${size}px; height: ${size}px; border-radius: 50%; border: 1.5px solid ${isLight ? '#afb8c1' : '#6e7681'}`}
  ></span>
{:else if state === 'waiting' || state === 'stopped'}
  <span
    aria-hidden="true"
    style={`display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; box-sizing: border-box; width: ${size}px; height: ${size}px; border-radius: 50%; border: 1px solid ${idleInk}; color: ${idleInk}; font-size: ${size * 0.7}px; font-weight: 700; line-height: 1`}
    >{state === 'waiting' ? '?' : '–'}</span
  >
{:else}
  <span
    aria-hidden="true"
    style={`display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; box-sizing: border-box; width: ${size}px; height: ${size}px; border-radius: 50%; border: 1px solid ${markInk}; color: ${markInk}; background: ${markTint}`}
  >
    <svg
      width={size * 0.56}
      height={size * 0.56}
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d={state === 'failed' ? 'M2.5 2.5 7.5 7.5M7.5 2.5 2.5 7.5' : 'M2 5.2 4 7.2 8 3'} />
    </svg>
  </span>
{/if}
