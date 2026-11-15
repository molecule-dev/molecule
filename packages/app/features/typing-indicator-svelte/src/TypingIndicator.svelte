<!--
  TypingIndicator: the Svelte counterpart of `@molecule/app-typing-indicator-react`'s
  `TypingIndicator` — three-dot CSS-only pulse animation. Same props, same DOM
  for the same input; the dots use `currentColor` so the indicator inherits the
  surrounding text color. Each instance injects its own `<style>` tag with the
  shared keyframes: a `<style>` element in Svelte markup is raw text (no
  expressions), so the `injectKeyframes` action inserts it on mount — it runs
  again on every re-mount, and the element leaves the DOM with the span.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { TypingIndicatorProps } from './types.js'

  let {
    visible = true,
    dotSize = 6,
    durationMs = 1200,
    ariaLabel = 'Typing…',
    className,
  }: TypingIndicatorProps = $props()

  const cm = $derived(getClassMap())

  const keyName = 'molecule-typing-pulse'

  /**
   * Inserts the keyframes `<style>` element as the span's first child.
   *
   * @param el - The indicator span.
   */
  const injectKeyframes = (el: HTMLElement): void => {
    const style = document.createElement('style')
    style.textContent = `@keyframes ${keyName} { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }`
    el.insertBefore(style, el.firstChild)
  }

  const styleAttr = (i: number): string =>
    `display:inline-block;width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:currentColor;animation:${keyName} ${durationMs}ms ease-in-out ${(i * durationMs) / 6}ms infinite`
</script>

{#if visible}
  <span
    use:injectKeyframes
    role="status"
    aria-label={ariaLabel}
    class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
  >
    {#each [0, 1, 2] as i (i)}
      <span aria-hidden="true" style={styleAttr(i)}></span>
    {/each}
  </span>
{/if}
