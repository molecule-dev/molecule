import type { HealthTranslations } from './types.js'

/** Health translations for Mongolian. */
export const mn: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ц {{minutes}}м',
  'health.durationMinutes': '{{minutes}}м',
  'health.error.noProvider':
    '`@molecule/app-health`: Эрүүл мэндийн үйлчилгээ үзүүлэгч холбогдоогүй — өөрийн ажиллах цаг дээр (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` интерфэйсийг хэрэгжүүлж, эхлүүлэх үед `setProvider()` -тэй холбоно уу. Ямар ч үйлчилгээ үзүүлэгч флоттой хамт ирдэггүй. Дуудлага хийхээс өмнө `hasProvider()` эсвэл `getCapabilities().supported` ашиглан функц илрүүлнэ үү — эрүүл мэндийн уншлага нь үнэн зөв анхдагч утгагүй тул хуурамч өгөгдөл буцаахын оронд шиднэ.',
}
