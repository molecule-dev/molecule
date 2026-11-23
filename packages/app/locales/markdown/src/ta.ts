import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Tamil. */
export const ta: MarkdownTranslations = {
  'markdown.components.invalid':
    'components இல் React கூறு அல்லது element பெயர் இல்லாத ஒரு உள்ளீடு உள்ளது.',
  'markdown.components.unsupported':
    'marked வழங்குநர் components-ஐப் பயன்படுத்த முடியாது, ஏனெனில் அது HTML சரத்தைத் திருப்பித் தருகிறது. பண்புகளைச் சேர்க்க elementAttributes-ஐப் பயன்படுத்தவும்.',
  'markdown.elementAttributes.invalidName':
    '"{{name}}" என்பது பண்பின் பெயர் அல்ல (<{{element}}>-இல்)',
  'markdown.elementAttributes.refused':
    'elementAttributes <{{element}}>-இல் "{{name}}"-ஐ அமைக்க முடியாது: அது ரெண்டரருக்குச் சொந்தம்',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}>-ஐப் பெயரிடுகிறது, அதை markdown உருவாக்காது',
  'markdown.footnotes.backToReference': 'மேற்கோள் {{reference}}-க்குத் திரும்பு',
  'markdown.footnotes.label': 'அடிக்குறிப்புகள்',
}
