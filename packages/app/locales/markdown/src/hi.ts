import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Hindi. */
export const hi: MarkdownTranslations = {
  'markdown.components.invalid':
    'components में एक प्रविष्टि है जो React कंपोनेंट या एलिमेंट का नाम नहीं है।',
  'markdown.components.unsupported':
    'marked प्रोवाइडर components का उपयोग नहीं कर सकता, क्योंकि यह HTML स्ट्रिंग लौटाता है। एट्रिब्यूट जोड़ने के लिए elementAttributes का उपयोग करें।',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" एट्रिब्यूट का नाम नहीं है (<{{element}}> पर)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> पर "{{name}}" सेट नहीं कर सकता: यह रेंडरर का है',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> का नाम लेता है, जिसे markdown नहीं बनाता',
  'markdown.footnotes.backToReference': 'संदर्भ {{reference}} पर वापस जाएँ',
  'markdown.footnotes.label': 'फ़ुटनोट',
}
