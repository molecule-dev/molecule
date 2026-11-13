import type { HealthTranslations } from './types.js'

/** Health translations for ja. */
export const ja: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}}分',
  'health.durationHoursMinutes': '{{hours}} h {{minutes}} m',
  'health.error.noProvider':
    '`@molecule/app-health`: ヘルス プロバイダーがバインドされていません。ネイティブ ランタイム (Apple HealthKit / Android Health Connect / Google Fit) で`HealthProvider`インターフェイスを実装し、起動時に`setProvider()`を使用してバインドしてください。Molecule には、これ用のプロバイダーが同梱されていません。呼び出し前に`hasProvider()`または`getCapabilities().supported`を使用して機能を検出してください。ヘルス リードには正直なデフォルト値がないため、偽のデータを返すのではなく、例外をスローします。',
}
