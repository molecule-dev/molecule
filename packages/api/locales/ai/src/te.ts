import type { AiTranslations } from './types.js'

/** Ai translations for Telugu. */
export const te: AiTranslations = {
  'ai.error.noProvider': 'AI ప్రొవైడర్ కాన్ఫిగర్ చేయబడలేదు. ముందుగా AI ప్రొవైడర్‌ను బాండ్ చేయండి.',
  'ai.error.ambiguousProvider':
    'బహుళ పేరు గల AI ప్రొవైడర్‌లు బాండ్ చేయబడ్డాయి మరియు డిఫాల్ట్ సెట్ చేయబడలేదు. ఒకదాన్ని ఎంచుకోవడానికి getProviderByName(name) ఉపయోగించండి.',
  'ai.error.responseIncomplete':
    'AI ప్రతిస్పందన పూర్తికాకముందే ముగిసింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  'ai.error.responseTokenLimit':
    'పూర్తికాకముందే AI ప్రతిస్పందన అవుట్‌పుట్ టోకెన్ పరిమితికి చేరుకుంది.',
  'ai.error.apiError': 'AI సేవలో లోపం. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  'ai.error.noResponseBody': 'AI సేవ నుండి ఎటువంటి స్పందన లేదు.',
}
