import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Marathi. */
export const mr: MarkdownTranslations = {
  'markdown.components.invalid':
    'components मध्ये React कंपोनेंट किंवा एलिमेंटचे नाव नसलेली नोंद आहे.',
  'markdown.components.unsupported':
    'marked प्रदाता components वापरू शकत नाही, कारण तो HTML स्ट्रिंग परत करतो. गुणधर्म जोडण्यासाठी elementAttributes वापरा.',
  'markdown.elementAttributes.invalidName': '"{{name}}" गुणधर्माचे नाव नाही (<{{element}}> वर)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> वर "{{name}}" सेट करू शकत नाही: ते रेंडररचे आहे',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> चे नाव घेते, जे markdown तयार करत नाही',
  'markdown.footnotes.backToReference': 'संदर्भ {{reference}} वर परत जा',
  'markdown.footnotes.label': 'तळटीपा',
}
