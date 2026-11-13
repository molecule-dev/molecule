import type { HealthTranslations } from './types.js'

/** Health translations for tr. */
export const tr: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}}dk',
  'health.durationHoursMinutes': '{{hours}} H {{minutes}} M',
  'health.error.noProvider':
    '`@molecule/app-health`: Bağlı bir sağlık hizmeti sağlayıcısı yok — yerel çalışma ortamınızda (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` arayüzünü uygulayın ve başlangıçta `setProvider()` ile bağlayın. Filoda hiçbir sağlayıcı bulunmuyor. Çağırmadan önce `hasProvider()` veya `getCapabilities().supported` ile özellik algılama yapın — bir sağlık okumasının dürüst bir varsayılan değeri yoktur, bu nedenle sahte veri döndürmek yerine hata fırlatır.',
}
