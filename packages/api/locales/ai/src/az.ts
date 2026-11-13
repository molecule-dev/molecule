import type { AiTranslations } from './types.js'

/** Ai translations for Azerbaijani. */
export const az: AiTranslations = {
  'ai.error.noProvider': 'AI provayderi konfiqurasiya edilməyib. Əvvəlcə AI provayderi bağlayın.',
  'ai.error.ambiguousProvider':
    'Bir neçə adlandırılmış AI provayderi bağlanıb və defolt təyin edilməyib. Birini seçmək üçün getProviderByName(name) istifadə edin.',
  'ai.error.responseIncomplete':
    'Süni intellekt cavabı tamamlanmadan bitdi. Zəhmət olmasa, yenidən cəhd edin.',
  'ai.error.responseTokenLimit':
    'Süni intellekt cavabı tamamlanmadan əvvəl çıxış token həddinə çatdı.',
  'ai.error.apiError': 'Süni intellekt xidmət xətası. Zəhmət olmasa, yenidən cəhd edin.',
  'ai.error.noResponseBody': 'Süni intellekt xidmətindən cavab yoxdur.',
}
