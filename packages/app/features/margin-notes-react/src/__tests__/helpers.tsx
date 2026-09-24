import type { ReactNode } from 'react'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import type { MarginNote, MarginNoteKind, MarginNotesBlock } from '../types.js'

/**
 * A UIClassMap stub: `cn` joins truthy strings, every other member returns a
 * token naming itself and its first argument (`hiddenBelow:md`), so tests can
 * assert which member a node used without a real styling bond.
 */
export function installStubClassMap(): void {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn')
        return (...classes: unknown[]) =>
          classes
            .map((c) => (typeof c === 'function' ? String(c) : c))
            .filter((c) => typeof c === 'string' && c.length > 0)
            .join(' ')
      const token = String(prop)
      const fn = (...args: unknown[]): string =>
        typeof args[0] === 'string' ? `${token}:${args[0]}` : token
      return new Proxy(fn, {
        get: (_t, p) => (p === Symbol.toPrimitive || p === 'toString' ? () => token : undefined),
      })
    },
  }
  setClassMap(new Proxy({}, handler) as UIClassMap)
}

/**
 * Wrap a tree in an i18n provider with no translations (defaultValue shows).
 *
 * @param node - The tree.
 * @returns The wrapped tree.
 */
export function withI18n(node: ReactNode): ReactNode {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{node}</I18nProvider>
}

/** A small annotated document: a section summary over three paragraphs, two prompts. */
export const doc: { blocks: MarginNotesBlock[]; notes: MarginNote[]; kinds: MarginNoteKind[] } = {
  blocks: [
    { id: 'p1', content: <p>Human opening paragraph.</p>, noteIds: ['s1'] },
    { id: 'p2', content: <p>An AI-written paragraph.</p>, noteIds: ['s1', 'q1'], marked: true },
    {
      id: 'p3',
      content: <p>Another AI paragraph, same prompt.</p>,
      noteIds: ['s1', 'q1'],
      marked: true,
    },
    { id: 'p4', content: <p>Closing words.</p> },
  ],
  notes: [
    { id: 's1', kind: 'summary', content: <p>SUMMARY-ONE</p> },
    { id: 'q1', kind: 'prompt', content: <p>PROMPT-ONE</p> },
  ],
  kinds: [
    { id: 'summary', label: 'Summaries', defaultOn: true },
    { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
  ],
}
