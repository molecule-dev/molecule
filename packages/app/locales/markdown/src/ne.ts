import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Nepali. */
export const ne: MarkdownTranslations = {
  'markdown.components.invalid':
    'components मा React कम्पोनेन्ट वा एलिमेन्टको नाम नभएको प्रविष्टि छ।',
  'markdown.components.unsupported':
    'marked प्रदायकले components प्रयोग गर्न सक्दैन, किनकि यसले HTML स्ट्रिङ फर्काउँछ। एट्रिब्युट थप्न elementAttributes प्रयोग गर्नुहोस्।',
  'markdown.elementAttributes.invalidName': '"{{name}}" एट्रिब्युटको नाम होइन (<{{element}}> मा)',
  'markdown.elementAttributes.refused':
    'elementAttributes ले <{{element}}> मा "{{name}}" सेट गर्न सक्दैन: यो रेन्डररको हो',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes ले <{{element}}> नाम दिन्छ, जुन markdown बनाउँदैन',
  'markdown.footnotes.backToReference': 'सन्दर्भ {{reference}} मा फर्कनुहोस्',
  'markdown.footnotes.label': 'पादटिप्पणीहरू',
}
