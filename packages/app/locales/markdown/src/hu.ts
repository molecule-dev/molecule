import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Hungarian. */
export const hu: MarkdownTranslations = {
  'markdown.components.invalid':
    'A components olyan bejegyzést tartalmaz, amely nem React-komponens és nem elemnév.',
  'markdown.components.unsupported':
    'A marked szolgáltató nem használhatja a components beállítást, mert HTML-karakterláncot ad vissza. Az attribútumok hozzáadásához használja az elementAttributes beállítást.',
  'markdown.elementAttributes.invalidName': '"{{name}}" nem attribútumnév (<{{element}}> elemen)',
  'markdown.elementAttributes.refused':
    'Az elementAttributes nem állíthatja be a(z) "{{name}}" értéket a(z) <{{element}}> elemen: a renderer birtokolja',
  'markdown.elementAttributes.unknownElement':
    'Az elementAttributes a(z) <{{element}}> elemet nevezi meg, amelyet a markdown nem állít elő',
  'markdown.footnotes.backToReference': 'Vissza a(z) {{reference}} hivatkozáshoz',
  'markdown.footnotes.label': 'Lábjegyzetek',
}
