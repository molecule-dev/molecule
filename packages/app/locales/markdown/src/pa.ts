import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Punjabi. */
export const pa: MarkdownTranslations = {
  'markdown.components.invalid':
    'components ਵਿੱਚ ਇੱਕ ਐਂਟਰੀ ਹੈ ਜੋ React ਕੰਪੋਨੈਂਟ ਜਾਂ ਐਲੀਮੈਂਟ ਨਾਮ ਨਹੀਂ ਹੈ।',
  'markdown.components.unsupported':
    'marked ਪ੍ਰੋਵਾਈਡਰ components ਦੀ ਵਰਤੋਂ ਨਹੀਂ ਕਰ ਸਕਦਾ, ਕਿਉਂਕਿ ਇਹ HTML ਸਟ੍ਰਿੰਗ ਵਾਪਸ ਕਰਦਾ ਹੈ। ਐਟਰੀਬਿਊਟ ਸ਼ਾਮਲ ਕਰਨ ਲਈ elementAttributes ਵਰਤੋ।',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" ਐਟਰੀਬਿਊਟ ਦਾ ਨਾਮ ਨਹੀਂ ਹੈ (<{{element}}> ਉੱਤੇ)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}> ਉੱਤੇ "{{name}}" ਸੈੱਟ ਨਹੀਂ ਕਰ ਸਕਦਾ: ਇਹ ਰੈਂਡਰਰ ਦਾ ਹੈ',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> ਦਾ ਨਾਮ ਲੈਂਦਾ ਹੈ, ਜੋ markdown ਨਹੀਂ ਬਣਾਉਂਦਾ',
  'markdown.footnotes.backToReference': 'ਹਵਾਲਾ {{reference}} ਉੱਤੇ ਵਾਪਸ ਜਾਓ',
  'markdown.footnotes.label': 'ਫੁਟਨੋਟ',
}
