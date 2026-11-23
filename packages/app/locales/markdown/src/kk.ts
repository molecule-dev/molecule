import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Kazakh. */
export const kk: MarkdownTranslations = {
  'markdown.components.invalid':
    'components құрамында React компоненті немесе элемент атауы болып табылмайтын жазба бар.',
  'markdown.components.unsupported':
    'marked провайдері components пайдалана алмайды, себебі ол HTML жолын қайтарады. Атрибуттарды қосу үшін elementAttributes пайдаланыңыз.',
  'markdown.elementAttributes.invalidName': '"{{name}}" атрибут атауы емес (<{{element}}> үстінде)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> үстінде "{{name}}" орната алмайды: оны рендерлеуші иемденеді',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> атайды, оны markdown жасамайды',
  'markdown.footnotes.backToReference': '{{reference}} сілтемесіне оралу',
  'markdown.footnotes.label': 'Ескертпелер',
}
