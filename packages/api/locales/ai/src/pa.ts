import type { AiTranslations } from './types.js'

/** Ai translations for Punjabi. */
export const pa: AiTranslations = {
  'ai.error.noProvider': 'AI ਪ੍ਰਦਾਤਾ ਕੌਂਫਿਗਰ ਨਹੀਂ ਕੀਤਾ ਗਿਆ। ਪਹਿਲਾਂ AI ਪ੍ਰਦਾਤਾ ਨੂੰ ਬੌਂਡ ਕਰੋ।',
  'ai.error.ambiguousProvider':
    'ਕਈ ਨਾਮਿਤ AI ਪ੍ਰਦਾਤਾ ਬੌਂਡ ਕੀਤੇ ਗਏ ਹਨ ਅਤੇ ਕੋਈ ਡਿਫੌਲਟ ਸੈੱਟ ਨਹੀਂ ਕੀਤਾ ਗਿਆ। ਇੱਕ ਚੁਣਨ ਲਈ getProviderByName(name) ਵਰਤੋ।',
  'ai.error.responseIncomplete':
    'AI ਜਵਾਬ ਪੂਰਾ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਹੀ ਖਤਮ ਹੋ ਗਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  'ai.error.responseTokenLimit': "AI ਜਵਾਬ ਪੂਰਾ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ ਆਉਟਪੁੱਟ ਟੋਕਨ ਸੀਮਾ 'ਤੇ ਪਹੁੰਚ ਗਿਆ।",
  'ai.error.apiError': 'AI ਸੇਵਾ ਗਲਤੀ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।',
  'ai.error.noResponseBody': 'AI ਸੇਵਾ ਤੋਂ ਕੋਈ ਜਵਾਬ ਨਹੀਂ।',
}
