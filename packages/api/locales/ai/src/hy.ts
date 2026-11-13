import type { AiTranslations } from './types.js'

/** Ai translations for Armenian. */
export const hy: AiTranslations = {
  'ai.error.noProvider': 'AI մատակարարը կազմաձևված չէ։ Նախ կապեք AI մատակարարը։',
  'ai.error.ambiguousProvider':
    'Կապակցված են մի քանի անվանված AI մատակարարներ, և լռելյայն մատակարար սահմանված չէ։ Օգտագործեք getProviderByName(name)՝ մեկը ընտրելու համար։',
  'ai.error.responseIncomplete':
    'Արհեստական բանականության պատասխանն ավարտվեց ավարտից առաջ։ Խնդրում ենք կրկին փորձել։',
  'ai.error.responseTokenLimit':
    'Արհեստական բանականության պատասխանը հասավ ելքային տոկենների սահմանաչափին՝ ավարտից առաջ։',
  'ai.error.apiError': 'Արհեստական բանականության ծառայության սխալ։ Խնդրում ենք կրկին փորձել։',
  'ai.error.noResponseBody': 'Արհեստական բանականության ծառայությունից պատասխան չկա։',
}
