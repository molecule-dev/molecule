import type { AiTranslations } from './types.js'

/** Ai translations for Russian. */
export const ru: AiTranslations = {
  'ai.error.noProvider': 'Провайдер ИИ не настроен. Сначала привяжите провайдера ИИ.',
  'ai.error.ambiguousProvider':
    'Привязано несколько именованных провайдеров ИИ, и провайдер по умолчанию не задан. Используйте getProviderByName(name), чтобы выбрать один.',
  'ai.error.responseIncomplete': 'Ответ ИИ завершился досрочно. Пожалуйста, попробуйте еще раз.',
  'ai.error.responseTokenLimit': 'Ответ ИИ достиг лимита выходных токенов до завершения.',
  'ai.error.apiError': 'Ошибка сервиса ИИ. Пожалуйста, попробуйте еще раз.',
  'ai.error.noResponseBody': 'От службы искусственного интеллекта ответа нет.',
}
