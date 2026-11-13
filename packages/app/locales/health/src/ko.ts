import type { HealthTranslations } from './types.js'

/** Health translations for ko. */
export const ko: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}}분',
  'health.durationHoursMinutes': '{{hours}} 시간 {{minutes}} 중',
  'health.error.noProvider':
    '`@molecule/app-health`: 헬스 프로바이더가 연결되지 않았습니다. 네이티브 런타임(Apple HealthKit/Android Health Connect/Google Fit)에서 `HealthProvider` 인터페이스를 구현하고 시작 시 `setProvider()` 를 사용하여 연결하세요. 기본적으로 제공되는 프로바이더가 없습니다. 호출하기 전에 `hasProvider()` 또는 `getCapabilities().supported` 사용하여 기능을 감지하세요. 헬스 읽기에는 정직한 기본값이 없으므로 가짜 데이터를 반환하는 대신 예외를 발생시킵니다.',
}
