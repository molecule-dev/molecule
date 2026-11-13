import type { BatteryTranslations } from './types.js'

/** Battery translations for ja. */
export const ja: Partial<BatteryTranslations> = {
  'battery.unknown': '不明',
  'battery.remainingUnknown': '不明',
  'battery.remainingMinutes': '{{minutes}}分',
  'battery.charging': '充電',
  'battery.discharging': 'バッテリー駆動時',
  'battery.full': 'フル充電済み',
  'battery.not-charging': '充電していません',
  'battery.remainingTime': '{{hours}} h {{minutes}} m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: プロバイダーが設定されていません。`BatteryProvider` の実装を渡して `setProvider()` を呼び出してください。同梱のプロバイダーはありません。ネイティブランタイムでインターフェースを実装し、ボンドしてください。',
}
