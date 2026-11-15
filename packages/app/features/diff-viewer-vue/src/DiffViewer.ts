/**
 * Vue text/code diff viewer — the Vue counterpart of
 * `@molecule/app-diff-viewer-react`'s `DiffViewer`: the same props (React
 * names), the same ClassMap tokens, the same DOM and the same inline styles
 * for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/** One diff row: unchanged context, a removed line, or an added line. */
interface DiffLine {
  type: 'add' | 'remove' | 'context'
  text: string
}

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

/**
 * Text diff viewer — unified or split layout with line-by-line
 * add/remove highlighting.
 *
 * @param props - Component props (see {@link DiffViewerProps}).
 * @returns The diff viewer component.
 */
export const DiffViewer = defineComponent({
  name: 'DiffViewer',
  props: {
    before: { type: String, required: true },
    after: { type: String, required: true },
    mode: { type: String as PropType<'unified' | 'split'>, default: 'unified' },
    showLineNumbers: { type: Boolean, default: true },
    filename: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()

    /**
     * Render a single diff row with background highlight, sign, and optional
     * line number.
     * @param text - The line's text.
     * @param type - The row kind.
     * @param n - The line number to show.
     * @returns The row element.
     */
    const row = (text: string, type: DiffLine['type'], n: number): VNode =>
      h(
        'div',
        {
          style: {
            background: COLOR[type],
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: '12px',
          },
        },
        [
          props.showLineNumbers
            ? h(
                'span',
                {
                  style: {
                    width: '36px',
                    textAlign: 'right',
                    opacity: 0.5,
                    paddingRight: '6px',
                  },
                },
                String(n),
              )
            : null,
          h('span', { style: { width: '16px' } }, SIGN[type]),
          h('span', { style: { whiteSpace: 'pre' } }, text),
        ],
      )

    return (): VNode => {
      const lines = diffLines(props.before, props.after)
      return h('div', { class: cm.cn(cm.stack(0), props.className) }, [
        props.filename
          ? h(
              'header',
              {
                class: cm.cn(
                  cm.sp('px', 3),
                  cm.sp('py', 1),
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                ),
              },
              props.filename,
            )
          : null,
        props.mode === 'unified'
          ? h(
              'div',
              null,
              lines.map((l, i) => h('div', { key: i }, [row(l.text, l.type, i + 1)])),
            )
          : h('div', { class: cm.grid({ cols: 2, gap: 'xs' }) }, [
              h(
                'div',
                null,
                lines
                  .filter((l) => l.type !== 'add')
                  .map((l, i) => row(l.text, l.type === 'remove' ? 'remove' : 'context', i + 1)),
              ),
              h(
                'div',
                null,
                lines
                  .filter((l) => l.type !== 'remove')
                  .map((l, i) => row(l.text, l.type === 'add' ? 'add' : 'context', i + 1)),
              ),
            ]),
      ])
    }
  },
})
