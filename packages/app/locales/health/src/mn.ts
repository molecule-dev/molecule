import type { HealthTranslations } from './types.js'

/** Health translations for Mongolian. */
export const mn: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ц {{minutes}}м',
  'health.durationMinutes': '{{minutes}}м',
  'health.error.noProvider':
    '`@molecule/app-health`: Эрүүл мэндийн үйлчилгээ үзүүлэгч холбогдоогүй — өөрийн ажиллах цаг дээр (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` интерфэйсийг хэрэгжүүлээд эхлүүлэх үед `setProvider()`-тэй холбогдоно уу. Molecule нь ямар ч үйлчилгээ үзүүлэгч илгээдэггүй. Дуудлага хийхээс өмнө `hasProvider()` эсвэл `getCapabilities().supported` ашиглан функц илрүүлнэ — эрүүл мэндийн уншлага нь үнэн зөв анхдагч утгагүй тул хуурамч өгөгдөл буцаахын оронд шиднэ.',
}
