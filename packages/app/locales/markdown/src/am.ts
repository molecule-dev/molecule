import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Amharic. */
export const am: MarkdownTranslations = {
  'markdown.components.invalid': 'components የReact አካል ወይም የኤለመንት ስም ያልሆነ ግቤት ይዟል።',
  'markdown.components.unsupported':
    'marked አቅራቢው components መጠቀም አይችልም፣ ምክንያቱም የHTML ሕብረቁምፊ ይመልሳል። ባህሪያትን ለመጨመር elementAttributes ይጠቀሙ።',
  'markdown.elementAttributes.invalidName': '"{{name}}" የባህሪ ስም አይደለም (በ<{{element}}> ላይ)',
  'markdown.elementAttributes.refused':
    'elementAttributes በ<{{element}}> ላይ "{{name}}" ማዘጋጀት አይችልም፦ አሳዳሪው ይዞታል',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> ይሰይማል፣ እሱም markdown አያመነጭም',
  'markdown.footnotes.backToReference': 'ወደ ማጣቀሻ {{reference}} ተመለስ',
  'markdown.footnotes.label': 'የግርጌ ማስታወሻዎች',
}
