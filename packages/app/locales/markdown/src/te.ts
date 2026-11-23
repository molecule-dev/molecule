import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Telugu. */
export const te: MarkdownTranslations = {
  'markdown.components.invalid':
    'components లో React కాంపోనెంట్ లేదా ఎలిమెంట్ పేరు కాని ఎంట్రీ ఉంది.',
  'markdown.components.unsupported':
    'marked ప్రొవైడర్ components ఉపయోగించలేదు, ఎందుకంటే అది HTML స్ట్రింగ్‌ను తిరిగి ఇస్తుంది. లక్షణాలను జోడించడానికి elementAttributes ఉపయోగించండి.',
  'markdown.elementAttributes.invalidName': '"{{name}}" లక్షణం పేరు కాదు (<{{element}}> పై)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> పై "{{name}}" సెట్ చేయలేదు: అది రెండరర్ సొంతం',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> పేరును సూచిస్తుంది, దాన్ని markdown ఉత్పత్తి చేయదు',
  'markdown.footnotes.backToReference': 'సూచన {{reference}} కు తిరిగి వెళ్లండి',
  'markdown.footnotes.label': 'పాదసూచికలు',
}
