import { useMemo } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface DiffViewerProps {
  /** Original text. */
  before: string
  /** New text. */
  after: string
  /** Display mode. Defaults to `'unified'`. */
  mode?: 'unified' | 'split'
  /** Show line numbers. Defaults to true. */
  showLineNumbers?: boolean
  /** Optional filename / context label. */
  filename?: string
  /** Extra classes. */
  className?: string
}

interface DiffLine {
  type: 'add' | 'remove' | 'context'
  text: string
}

/**
 *
 * @param a
 * @param b
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

const COLOR = {
  add: 'rgba(34,197,94,0.15)',
  remove: 'rgba(239,68,68,0.15)',
  context: 'transparent',
} as const
const SIGN = { add: '+', remove: '-', context: ' ' } as const

/**
 * Text diff viewer — unified or split layout with line-by-line
 * add/remove highlighting. Pure JS (no library) so apps don't pull
 * in megabytes for simple diffs.
 *
 * For large diffs (10k+ lines), wrap with virtualization upstream.
 * @param root0
 * @param root0.before
 * @param root0.after
 * @param root0.mode
 * @param root0.showLineNumbers
 * @param root0.filename
 * @param root0.className
 */
export function DiffViewer({
  before,
  after,
  mode = 'unified',
  showLineNumbers = true,
  filename,
  className,
}: DiffViewerProps) {
  const cm = getClassMap()
  const lines = useMemo(() => diffLines(before, after), [before, after])

  /**
   *
   * @param text
   * @param type
   * @param n
   */
  function row(text: string, type: DiffLine['type'], n: number) {
    return (
      <div
        style={{ background: COLOR[type], display: 'flex', fontFamily: 'monospace', fontSize: 12 }}
      >
        {showLineNumbers && (
          <span style={{ width: 36, textAlign: 'right', opacity: 0.5, paddingRight: 6 }}>{n}</span>
        )}
        <span style={{ width: 16 }}>{SIGN[type]}</span>
        <span style={{ whiteSpace: 'pre' }}>{text}</span>
      </div>
    )
  }

  return (
    <div className={cm.cn(cm.stack(0 as const), className)}>
      {filename && (
        <header
          className={cm.cn(
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
          )}
        >
          {filename}
        </header>
      )}
      {mode === 'unified' ? (
        <div>
          {lines.map((l, i) => (
            <div key={i}>{row(l.text, l.type, i + 1)}</div>
          ))}
        </div>
      ) : (
        <div className={cm.grid({ cols: 2, gap: 'xs' })}>
          <div>
            {lines
              .filter((l) => l.type !== 'add')
              .map((l, i) => row(l.text, l.type === 'remove' ? 'remove' : 'context', i + 1))}
          </div>
          <div>
            {lines
              .filter((l) => l.type !== 'remove')
              .map((l, i) => row(l.text, l.type === 'add' ? 'add' : 'context', i + 1))}
          </div>
        </div>
      )}
    </div>
  )
}
