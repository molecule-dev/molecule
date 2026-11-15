<!--
  DiffViewer: the Svelte counterpart of `@molecule/app-diff-viewer-react`'s
  `DiffViewer` — text diff viewer with unified or split layout, line-by-line
  add/remove highlighting, optional line numbers and an optional filename
  header. Same props, same ClassMap tokens, same DOM and same inline styles for
  the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { DiffViewerProps } from './types.js'

  /** One diff row: unchanged context, a removed line, or an added line. */
  interface DiffLine {
    type: 'add' | 'remove' | 'context'
    text: string
  }

  let {
    before,
    after,
    mode = 'unified',
    showLineNumbers = true,
    filename,
    className,
  }: DiffViewerProps = $props()

  /**
   * Compute a line-by-line diff between two strings using an LCS DP algorithm.
   * @param a - The original text.
   * @param b - The new text.
   * @returns The diff rows, in order.
   */
  function diffLines(a: string, b: string): DiffLine[] {
    const al = a.split('\n')
    const bl = b.split('\n')
    // Use a tiny LCS-ish O(n*m) DP — fine for small/medium diffs typical of UI use.
    const n = al.length,
      m = bl.length
    const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = al[i] === bl[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
    const out: DiffLine[] = []
    let i = 0,
      j = 0
    while (i < n && j < m) {
      if (al[i] === bl[j]) {
        out.push({ type: 'context', text: al[i] })
        i++
        j++
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        out.push({ type: 'remove', text: al[i] })
        i++
      } else {
        out.push({ type: 'add', text: bl[j] })
        j++
      }
    }
    while (i < n) {
      out.push({ type: 'remove', text: al[i] })
      i++
    }
    while (j < m) {
      out.push({ type: 'add', text: bl[j] })
      j++
    }
    return out
  }

  /** Row background colors (fixed translucent green/red, as React's). */
  const COLOR = {
    add: 'rgba(34,197,94,0.15)',
    remove: 'rgba(239,68,68,0.15)',
    context: 'transparent',
  } as const
  /** Leading sign glyphs. */
  const SIGN = { add: '+', remove: '-', context: ' ' } as const

  const cm = $derived(getClassMap())
  const lines = $derived(diffLines(before, after))
</script>

{#snippet row(text: string, type: DiffLine['type'], n: number)}
  <!--
    `background` is a style directive and the rest a static attribute: Svelte
    writes the attribute's declarations first, so jsdom's cssText parse keeps
    the `transparent` shorthand (it drops a `background` shorthand that is not
    the last declaration). Same declarations as React's style object.
  -->
  <div
    style="display: flex; font-family: monospace; font-size: 12px"
    style:background={COLOR[type]}
  >
    {#if showLineNumbers}
      <span style="width: 36px; text-align: right; opacity: 0.5; padding-right: 6px">{n}</span>
    {/if}
    <span style="width: 16px">{SIGN[type]}</span>
    <span style="white-space: pre">{text}</span>
  </div>
{/snippet}

<div class={cm.cn(cm.stack(0), className)}>
  {#if filename}
    <header
      class={cm.cn(cm.sp('px', 3), cm.sp('py', 1), cm.textSize('xs'), cm.fontWeight('semibold'))}
    >
      {filename}
    </header>
  {/if}
  {#if mode === 'unified'}
    <div>
      {#each lines as l, i (i)}
        <div>{@render row(l.text, l.type, i + 1)}</div>
      {/each}
    </div>
  {:else}
    <div class={cm.grid({ cols: 2, gap: 'xs' })}>
      <div>
        {#each lines.filter((l) => l.type !== 'add') as l, i (i)}
          {@render row(l.text, l.type === 'remove' ? 'remove' : 'context', i + 1)}
        {/each}
      </div>
      <div>
        {#each lines.filter((l) => l.type !== 'remove') as l, i (i)}
          {@render row(l.text, l.type === 'add' ? 'add' : 'context', i + 1)}
        {/each}
      </div>
    </div>
  {/if}
</div>
