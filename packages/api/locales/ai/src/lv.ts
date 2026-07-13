import type { AiTranslations } from './types.js'

/** Ai translations for Latvian. */
export const lv: AiTranslations = {
  'ai.error.noProvider':
    'AI pakalpojumu sniedzējs nav konfigurēts. Vispirms pievienojiet AI pakalpojumu sniedzēju.',
  'ai.error.apiError': 'AI API pieprasījums neizdevās.',
  'ai.error.noResponseBody': 'AI atbildes pamatteksts ir tukšs.',
  'ai.error.ambiguousProvider':
    'Ir pievienoti vairāki nosaukti AI pakalpojumu sniedzēji, un noklusējuma nav iestatīts. Izmantojiet getProviderByName(name), lai izvēlētos vienu.',
}
