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
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { TypingIndicatorProps } from './types.js'

  let {
    visible = true,
    dotSize = 6,
    durationMs = 1200,
    ariaLabel,
    className,
  }: TypingIndicatorProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())

  const keyName = 'molecule-typing-pulse'

  /**
   * The label: the prop when given, else the translated default (read in the
   * template, so a locale switch re-renders it).
   * @returns The label text.
   */
  const label = (): string =>
    ariaLabel ?? t('typingIndicator.aria.label', undefined, { defaultValue: 'Typing…' })

  /**
   * Inserts the `<style>` element with the keyframes and the reduced-motion
   * opt-out as the span's first child.
   *
   * The host stylesheet's global 0.01ms collapse still leaves the per-dot
   * stagger delay, so the dots flash in sequence for a reduced-motion user and
   * the rendered frame depends on when it is painted; the component's own rule
   * turns the pulse off entirely instead.
   *
   * @param el - The indicator span.
   */
  const injectKeyframes = (el: HTMLElement): void => {
    const style = document.createElement('style')
    style.textContent = `@keyframes ${keyName} { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } } @media (prefers-reduced-motion: reduce) { [data-typing-dot] { animation: none !important; } }`
    el.insertBefore(style, el.firstChild)
  }

  const styleAttr = (i: number): string =>
    `display:inline-block;width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:currentColor;animation:${keyName} ${durationMs}ms ease-in-out ${(i * durationMs) / 6}ms infinite`
</script>

{#if visible}
  <span
    use:injectKeyframes
    role="status"
    aria-label={label()}
    class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
  >
    {#each [0, 1, 2] as i (i)}
      <span aria-hidden="true" data-typing-dot style={styleAttr(i)}></span>
    {/each}
  </span>
{/if}
