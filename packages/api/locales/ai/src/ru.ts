import type { AiTranslations } from './types.js'

/** Ai translations for Russian. */
export const ru: AiTranslations = {
  'ai.error.noProvider': 'Провайдер ИИ не настроен. Сначала привяжите провайдера ИИ.',
  'ai.error.apiError': 'Запрос к API ИИ не удался.',
  'ai.error.noResponseBody': 'Тело ответа ИИ пустое.',
  'ai.error.ambiguousProvider':
    'Привязано несколько именованных провайдеров ИИ, и провайдер по умолчанию не задан. Используйте getProviderByName(name), чтобы выбрать один.',
}
