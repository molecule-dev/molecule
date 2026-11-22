/**
 * Every React feature package's own text goes through i18n.
 *
 * Each component's first case also runs with a switch to the pseudo-locale
 * `en-XA` at the end (`withLocaleSwitch`), whose provider renders every
 * translated string as `⟦text⟧`. So in React's recorded snapshot after that
 * switch, user-visible text outside `⟦…⟧` — a text node, or an attribute a screen
 * reader announces or a user reads — is text the component wrote in English
 * itself: a JSX literal, a prop default, a fallback. Text the case passed in (its
 * props, slots and translations) is the caller's and is left out.
 *
 * Found 2026-11-15: hardcoded defaults such as `ariaLabel = 'Typing…'` that no lint
 * rule sees, because the English sits in a parameter default, not in the JSX.
 * Every framework's port is held to React's goldens, so React is where the text has
 * to be right.
 *
 * Reads the committed goldens; renders nothing.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { getProvider } from '@molecule/app-i18n'

import { featureCaseSet, loadFeatureGoldens } from '../features/index.js'
import { featureCaseFileNames, loadFeatureCases } from '../features/load.js'
import { installSharedBonds } from '../ui/environment.js'

/** The attributes whose text a user reads or a screen reader announces. */
const VISIBLE_ATTRIBUTES = [
  'aria-label',
  'aria-description',
  'aria-roledescription',
  'aria-placeholder',
  'aria-valuetext',
  'alt',
  'title',
  'placeholder',
  'label',
]

/**
 * Every string a case supplies, through its props, slots, context and steps.
 *
 * @param value - Any part of a case.
 * @param out - Collects the strings.
 * @returns `out`.
 */
function suppliedStrings(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof value === 'string') out.add(value)
  else if (Array.isArray(value)) for (const item of value) suppliedStrings(item, out)
  else if (value && typeof value === 'object')
    for (const [key, item] of Object.entries(value)) {
      out.add(key)
      suppliedStrings(item, out)
    }
  return out
}

/**
 * The user-visible text of a recorded snapshot: each text node and each visible
 * attribute, outside `<style>`, `<script>` and `aria-hidden` subtrees (an icon
 * font's ligature name such as `expand_more` sits in one and paints a glyph).
 *
 * @param snapshot - One recorded snapshot: serialized HTML, then the recorder's
 *   own `@route …` / `@scroll …` lines.
 * @returns Each text.
 */
function visibleTexts(snapshot: string): string[] {
  const html = snapshot
    .split('\n')
    .filter((line) => !/^@(route|scroll|focus|selection)\b/.test(line))
    .join('\n')
  const template = document.createElement('template')
  template.innerHTML = html
  const texts: string[] = []
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) texts.push(text)
      return
    }
    if (!(node instanceof Element) && node !== template.content) return
    if (node instanceof Element) {
      const tag = node.tagName.toLowerCase()
      if (
        tag === 'style' ||
        tag === 'script' ||
        node.getAttribute('aria-hidden') === 'true' ||
        // HTML's own marker for text that stays as written in every language: a brand
        // name, a protocol token such as `POST`, an example URL.
        node.getAttribute('translate') === 'no'
      )
        return
      for (const name of VISIBLE_ATTRIBUTES) {
        const value = node.getAttribute(name)?.trim()
        if (value) texts.push(value)
      }
    }
    for (const child of node.childNodes) walk(child)
  }
  walk(template.content)
  return texts
}

/**
 * Escapes a string for use inside a regular expression.
 *
 * @param text - Any text.
 * @returns The pattern that matches it literally.
 */
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Whether a piece of text came from the case: a supplied string contains it, or it is
 * the initials of one (an avatar's `JD` for `Jane Doe`).
 *
 * @param piece - Text left between translated parts.
 * @param supplied - The case's own strings.
 * @param initials - The initials of each supplied string.
 * @returns Whether the case supplied it.
 */
function fromCase(piece: string, supplied: string[], initials: Set<string>): boolean {
  if (initials.has(piece) || supplied.some((s) => s.includes(piece))) return true
  // A piece built from several supplied strings and punctuation (`Springfield, IL 62704`,
  // `Welcome → ada@example.test`): take each supplied string out as a whole word.
  let rest = piece
  for (const s of supplied)
    if (s.length > 1 && rest.includes(s))
      rest = rest.replace(new RegExp(`(?<!\\p{L})${escapeRegExp(s)}(?!\\p{L})`, 'gu'), ' ')
  return !/\p{L}{2}/u.test(rest)
}

/**
 * The initials an avatar draws from a name: the first letter of its first one, two
 * and three words, upper-cased, and its first two letters.
 *
 * @param text - A supplied string.
 * @returns Its initials.
 */
function initialsOf(text: string): string[] {
  const words = text.split(/[^\p{L}]+/u).filter(Boolean)
  const firsts = words.map((word) => word[0]!.toUpperCase()).join('')
  return [
    firsts.slice(0, 1),
    firsts.slice(0, 2),
    firsts.slice(0, 3),
    text.slice(0, 2).toUpperCase(),
  ]
}

/**
 * The parts of each visible text that are neither translated (`⟦…⟧`) nor from
 * the case and still contain two letters in a row.
 *
 * The `⟦…⟧` brackets wrap one TRANSLATED STRING, but a component may render that
 * string SPLIT across sibling nodes (a tip sentence whose `/` and `@` tokens
 * become `<code>` elements): the opening bracket then lands in one text node and
 * the closing bracket in another, so pairing PER NODE would read a translated
 * fragment as plain English. The brackets therefore pair across the snapshot's
 * whole visible-text stream (document order — the order {@link visibleTexts}
 * collects, attributes included, each attribute being one balanced `t()` output
 * of its own). Text an untranslated node wrote outside a bracket span is still
 * flagged, so the widened pairing cannot hide English; and a `⟦` left unmatched
 * at the end of the stream hides nothing (every character after it counts as
 * outside).
 *
 * @param texts - The visible texts, in document order.
 * @param supplied - The case's own strings.
 * @param initials - The initials of each supplied string.
 * @returns For each text with untranslated parts, its index and those parts.
 */
function untranslatedParts(
  texts: string[],
  supplied: string[],
  initials: Set<string>,
): Map<number, string[]> {
  // Bracket depth per character of the joined stream; a character is OUTSIDE
  // when its depth is 0. An unmatched `⟦` fails safe: everything after it is
  // outside (flagged) until its `⟧` finally arrives. The stream is walked by
  // UTF-16 unit, as each text is below, so an emoji (two units) cannot shift
  // the flags of every character after it; both brackets are single units.
  const stream = texts.join('')
  const outside: boolean[] = []
  const openBrackets: number[] = []
  for (let at = 0; at < stream.length; at++) {
    const ch = stream[at]
    if (ch === '⟦') {
      openBrackets.push(outside.length)
      outside.push(false)
    } else if (ch === '⟧') {
      openBrackets.pop()
      outside.push(false)
    } else {
      outside.push(openBrackets.length === 0)
    }
  }
  for (const start of openBrackets) for (let i = start; i < outside.length; i++) outside[i] = true

  const found = new Map<number, string[]>()
  let cursor = 0
  texts.forEach((text, index) => {
    const pieces: string[] = []
    let buffer = ''
    for (let i = 0; i < text.length; i++) {
      if (outside[cursor + i]) buffer += text[i]
      else if (buffer !== '') {
        pieces.push(buffer)
        buffer = ''
      }
    }
    cursor += text.length
    if (buffer !== '') pieces.push(buffer)
    const untranslated = pieces
      .map((piece) => piece.trim())
      .filter((piece) => /\p{L}{2}/u.test(piece) && !fromCase(piece, supplied, initials))
    if (untranslated.length > 0) found.set(index, untranslated)
  })
  return found
}

describe('feature text goes through i18n (React, after a switch to en-XA)', () => {
  installSharedBonds()
  // A language picker lists the provider's locales by name; those names are its data.
  const localeNames = getProvider()
    .getLocales()
    .map((locale) => locale.name)
  for (const name of featureCaseFileNames()) {
    it(name, async () => {
      const feature = featureCaseSet(await loadFeatureCases(name))
      const goldens = loadFeatureGoldens(feature.package)
      if (!goldens) return
      const problems: string[] = []
      for (const family of feature.families) {
        const switched = family.cases.find((c) => c.name.endsWith(', then a locale switch'))
        const result = switched && goldens.cases[family.component]?.[switched.name]
        const snapshot = result?.snapshots?.at(-1)
        if (!switched || typeof snapshot !== 'string') continue
        // Longest first, so a whole supplied string goes before any shorter one inside it.
        const supplied = [...suppliedStrings(switched), ...localeNames].sort(
          (x, y) => y.length - x.length,
        )
        const initials = new Set(supplied.flatMap(initialsOf))
        const texts = visibleTexts(snapshot)
        for (const [index] of untranslatedParts(texts, supplied, initials))
          problems.push(`${family.component}: ${JSON.stringify(texts[index])}`)
      }
      const found = [...new Set(problems)]
      expect(
        found,
        `${feature.package} renders its own text without t(); pass each string through ` +
          "t('<namespace>.<key>', values, { defaultValue }) and add the key to its locale bond:\n" +
          found.join('\n'),
      ).toEqual([])
    })
  }
})
