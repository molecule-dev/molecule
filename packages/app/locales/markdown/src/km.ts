import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Khmer. */
export const km: MarkdownTranslations = {
  'markdown.components.invalid': 'components មានធាតុដែលមិនមែនជា React component ឬឈ្មោះ element។',
  'markdown.components.unsupported':
    'អ្នកផ្តល់ marked មិនអាចប្រើ components បានទេ ព្រោះវាត្រឡប់ជា HTML string។ ប្រើ elementAttributes ដើម្បីបន្ថែម attributes។',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" មិនមែនជាឈ្មោះ attribute ទេ (នៅលើ <{{element}}>)',
  'markdown.elementAttributes.refused':
    'elementAttributes មិនអាចកំណត់ "{{name}}" នៅលើ <{{element}}> បានទេ៖ renderer គឺជាម្ចាស់វា',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes ដាក់ឈ្មោះ <{{element}}> ដែល markdown មិនបង្កើត',
  'markdown.footnotes.backToReference': 'ត្រឡប់ទៅកាន់ឯកសារយោង {{reference}}',
  'markdown.footnotes.label': 'កំណត់សម្គាល់ជើងទំព័រ',
}
