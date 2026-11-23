import type { MarkdownTranslations } from './types.js'

/** Markdown translations for Malayalam. */
export const ml: MarkdownTranslations = {
  'markdown.components.invalid':
    'components-ൽ React കമ്പോണന്റോ എലിമെന്റ് നാമമോ അല്ലാത്ത ഒരു എൻട്രി ഉണ്ട്.',
  'markdown.components.unsupported':
    'marked ദാതാവിന് components ഉപയോഗിക്കാൻ കഴിയില്ല, കാരണം അത് HTML സ്ട്രിംഗ് നൽകുന്നു. ആട്രിബ്യൂട്ടുകൾ ചേർക്കാൻ elementAttributes ഉപയോഗിക്കുക.',
  'markdown.elementAttributes.invalidName': '"{{name}}" ആട്രിബ്യൂട്ട് നാമമല്ല (<{{element}}>-ൽ)',
  'markdown.elementAttributes.refused':
    'elementAttributes-ന് <{{element}}>-ൽ "{{name}}" സജ്ജമാക്കാൻ കഴിയില്ല: അത് റെൻഡററുടേതാണ്',
  'markdown.elementAttributes.unknownElement':
    'elementAttributes <{{element}}> എന്ന് പേരിടുന്നു, അത് markdown നിർമ്മിക്കുന്നില്ല',
  'markdown.footnotes.backToReference': 'റഫറൻസ് {{reference}}-ലേക്ക് മടങ്ങുക',
  'markdown.footnotes.label': 'അടിക്കുറിപ്പുകൾ',
}
