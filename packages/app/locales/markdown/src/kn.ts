import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Kannada. */
export const kn: MarkdownTranslations = {
  'markdown.components.invalid': 'components ನಲ್ಲಿ React ಘಟಕ ಅಥವಾ ಎಲಿಮೆಂಟ್ ಹೆಸರು ಅಲ್ಲದ ನಮೂದು ಇದೆ.',
  'markdown.components.unsupported':
    'marked ಪೂರೈಕೆದಾರರು components ಬಳಸಲಾಗುವುದಿಲ್ಲ, ಏಕೆಂದರೆ ಅದು HTML ಸ್ಟ್ರಿಂಗ್ ಹಿಂತಿರುಗಿಸುತ್ತದೆ. ಗುಣಲಕ್ಷಣಗಳನ್ನು ಸೇರಿಸಲು elementAttributes ಬಳಸಿ.',
  'markdown.elementAttributes.invalidName': '"{{name}}" ಗುಣಲಕ್ಷಣದ ಹೆಸರಲ್ಲ (<{{element}}> ಮೇಲೆ)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> ಮೇಲೆ "{{name}}" ಹೊಂದಿಸಲಾಗುವುದಿಲ್ಲ: ಅದು ರೆಂಡರರ್‌ನದು',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> ಅನ್ನು ಹೆಸರಿಸುತ್ತದೆ, ಅದನ್ನು markdown ಉತ್ಪಾದಿಸುವುದಿಲ್ಲ',
  'markdown.footnotes.backToReference': 'ಉಲ್ಲೇಖ {{reference}} ಗೆ ಹಿಂತಿರುಗಿ',
  'markdown.footnotes.label': 'ಅಡಿಟಿಪ್ಪಣಿಗಳು',
}
