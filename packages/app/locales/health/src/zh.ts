import type { HealthTranslations } from './types.js'

/** Health translations for zh. */
export const zh: Partial<HealthTranslations> = {
  'health.durationMinutes': '{{minutes}}分钟',
  'health.durationHoursMinutes': '{{hours}} h {{minutes}}米',
  'health.error.noProvider':
    '`@molecule/app-health`：未绑定健康信息提供程序——请在您的原生运行时（Apple HealthKit / Android Health Connect / Google Fit）中实现`HealthProvider`接口，并在启动时使用`setProvider()`将其绑定。Molecule 未提供此提供程序。调用前请使用`hasProvider()`或`getCapabilities().supported`进行功能检测——健康信息读取没有真实默认值，因此会抛出异常而不是返回虚假数据。',
}
