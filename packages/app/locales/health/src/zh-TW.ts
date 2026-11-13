import type { HealthTranslations } from './types.js'

/** Health translations for Chinese (Traditional). */
export const zhTW: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}小時{{minutes}}分鐘',
  'health.durationMinutes': '{{minutes}}分鐘',
  'health.error.noProvider':
    '`@molecule/app-health`：未綁定任何健康資訊提供者－請在您的原生運行時（Apple HealthKit / Android Health Connect / Google Fit）中實作`HealthProvider`接口，並在啟動時使用`setProvider()`將其綁定。該應用程式自帶健康資訊提供者。請在呼叫前使用`hasProvider()`或`getCapabilities().supported`進行功能偵測－健康資訊讀取沒有真實預設值，因此會拋出異常而不是傳回虛假資料。',
}
