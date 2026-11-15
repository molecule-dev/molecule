/**
 * DiffViewer component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { DiffViewerProps } from './types.js'

/** One diff row: unchanged context, a removed line, or an added line. */
interface DiffLine {
  type: 'add' | 'remove' | 'context'
  text: string
}

/** One rendered row: its text, its kind, and the line number shown. */
interface DiffRow {
  type: DiffLine['type']
  text: string
  n: number
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
 * DiffViewer component.
 *
 * Text diff viewer — unified or split layout with line-by-line add/remove
 * highlighting, optional line numbers, and an optional filename header. The
 * host IS the outer `<div>` (`div[mol-diff-viewer]`), so its ClassMap classes
 * match React's root exactly.
 *
 * This is the Angular counterpart of `@molecule/app-diff-viewer-react`: the
 * same props (React names), the same ClassMap tokens, the same DOM and the
 * same inline styles for the same input.
 *
 * @remarks
 * The diff is recomputed only when `before` or `after` changes, the way React's
 * `useMemo` holds it across unrelated re-renders.
 */
@Component({
  selector: 'div[mol-diff-viewer]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['before', 'after', 'mode', 'showLineNumbers', 'filename', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<ng-template #rowTpl let-r><div [style]="rowStyle(r.type)">@if (lineNumbers()) {<span style="width: 36px; text-align: right; opacity: 0.5; padding-right: 6px">{{ r.n }}</span>}<span style="width: 16px">{{ sign(r.type) }}</span><span style="white-space: pre">{{ r.text }}</span></div></ng-template>@if (filename) {<header [class]="headerClasses()">{{ filename }}</header>}@if (unified()) {<div>@for (r of rows(); track $index) {<div><ng-container [ngTemplateOutlet]="rowTpl" [ngTemplateOutletContext]="{ $implicit: r }"></ng-container></div>}</div>} @else {<div [class]="gridClasses()"><div>@for (r of leftRows(); track $index) {<ng-container [ngTemplateOutlet]="rowTpl" [ngTemplateOutletContext]="{ $implicit: r }"></ng-container>}</div><div>@for (r of rightRows(); track $index) {<ng-container [ngTemplateOutlet]="rowTpl" [ngTemplateOutletContext]="{ $implicit: r }"></ng-container>}</div></div>}`,
})
export class DiffViewer {
  /** Original text. */
  before!: DiffViewerProps['before']
  /** New text. */
  after!: DiffViewerProps['after']
  /** Display mode (React's default `'unified'` applies while undefined). */
  mode?: DiffViewerProps['mode']
  /** Show line numbers (React's default `true` applies while undefined). */
  showLineNumbers?: DiffViewerProps['showLineNumbers']
  /** Optional filename / context label. */
  filename?: DiffViewerProps['filename']
  /** Extra classes. */
  className?: DiffViewerProps['className']

  /** The inputs the cached diff was computed from. */
  private cachedBefore?: string
  /** The inputs the cached diff was computed from. */
  private cachedAfter?: string
  /** The cached diff rows, recomputed only when the inputs change. */
  private cachedLines?: DiffLine[]

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The diff rows for `before`/`after`, memoized like React's `useMemo`.
   * @returns The diff rows, in order.
   */
  lines(): DiffLine[] {
    if (
      this.cachedLines === undefined ||
      this.cachedBefore !== this.before ||
      this.cachedAfter !== this.after
    ) {
      this.cachedBefore = this.before
      this.cachedAfter = this.after
      this.cachedLines = diffLines(this.before, this.after)
    }
    return this.cachedLines
  }

  /**
   * Whether the unified layout renders (React's `mode === 'unified'` with the
   * `'unified'` default parameter).
   * @returns True for the unified layout.
   */
  unified(): boolean {
    return this.mode === undefined ? true : this.mode === 'unified'
  }

  /**
   * Whether line numbers render (React's `showLineNumbers = true` default
   * parameter).
   * @returns True when line numbers show.
   */
  lineNumbers(): boolean {
    return this.showLineNumbers === undefined ? true : this.showLineNumbers
  }

  /**
   * The unified layout's rows, numbered from 1.
   * @returns The rows.
   */
  rows(): DiffRow[] {
    return this.lines().map((l, i) => ({ type: l.type, text: l.text, n: i + 1 }))
  }

  /**
   * The split layout's left column: every row that is not an addition.
   * @returns The left rows, numbered from 1.
   */
  leftRows(): DiffRow[] {
    return this.lines()
      .filter((l) => l.type !== 'add')
      .map((l, i) => ({
        type: l.type === 'remove' ? 'remove' : 'context',
        text: l.text,
        n: i + 1,
      }))
  }

  /**
   * The split layout's right column: every row that is not a removal.
   * @returns The right rows, numbered from 1.
   */
  rightRows(): DiffRow[] {
    return this.lines()
      .filter((l) => l.type !== 'remove')
      .map((l, i) => ({
        type: l.type === 'add' ? 'add' : 'context',
        text: l.text,
        n: i + 1,
      }))
  }

  /**
   * A row's background color.
   * @param type - The row kind.
   * @returns The CSS background value.
   */
  color(type: DiffLine['type']): string {
    return COLOR[type]
  }

  /**
   * A row's leading sign glyph.
   * @param type - The row kind.
   * @returns The sign.
   */
  sign(type: DiffLine['type']): string {
    return SIGN[type]
  }

  /**
   * A row's inline style (React's style object).
   * @param type - The row kind.
   * @returns The style declarations.
   */
  rowStyle(type: DiffLine['type']): Record<string, string> {
    return {
      background: COLOR[type],
      display: 'flex',
      'font-family': 'monospace',
      'font-size': '12px',
    }
  }

  /**
   * The host's class list (React's outer `<div>`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.stack(0), this.className)
  }

  /**
   * The filename header's class list.
   * @returns The class string.
   */
  headerClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('px', 3), cm.sp('py', 1), cm.textSize('xs'), cm.fontWeight('semibold'))
  }

  /**
   * The split layout's grid class list.
   * @returns The class string.
   */
  gridClasses(): string {
    return this.cm().grid({ cols: 2, gap: 'xs' })
  }
}
