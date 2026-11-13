import type { AiTranslations } from './types.js'

/** Ai translations for Belarusian. */
export const be: AiTranslations = {
  'ai.error.noProvider': 'Пастаўшчык ШІ не наладжаны. Спачатку злучыце пастаўшчыка ШІ.',
  'ai.error.ambiguousProvider':
    'Злучана некалькі найменаваных пастаўшчыкоў ШІ, прадвызначаны не ўстаноўлены. Выкарыстайце getProviderByName(name), каб выбраць аднаго.',
  'ai.error.responseIncomplete':
    'Адказ штучнага інтэлекту скончыўся раней за завяршэнне. Паўтарыце спробу.',
  'ai.error.responseTokenLimit':
    'Адказ штучнага інтэлекту дасягнуў ліміту выходных токенаў да завяршэння.',
  'ai.error.apiError': 'Памылка службы штучнага інтэлекту. Паўтарыце спробу.',
  'ai.error.noResponseBody': 'Няма адказу ад службы штучнага інтэлекту.',
}
