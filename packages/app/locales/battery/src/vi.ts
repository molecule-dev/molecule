import type { BatteryTranslations } from './types.js'

/** Battery translations for vi. */
export const vi: Partial<BatteryTranslations> = {
  'battery.unknown': 'Không xác định',
  'battery.remainingUnknown': 'Không xác định',
  'battery.remainingMinutes': '{{minutes}}p',
  'battery.charging': 'Đang sạc',
  'battery.discharging': 'Khi đang dùng pin',
  'battery.full': 'Đã sạc đầy',
  'battery.not-charging': 'Không sạc',
  'battery.remainingTime': '{{hours}} h {{minutes}} m',
  'battery.error.noProvider':
    '`@molecule/app-battery`: Chưa thiết lập nhà cung cấp. Hãy gọi `setProvider()` với một triển khai `BatteryProvider` — Molecule không cung cấp nhà cung cấp nào cho nó; hãy triển khai giao diện trên môi trường chạy gốc của bạn và liên kết nó.',
}
