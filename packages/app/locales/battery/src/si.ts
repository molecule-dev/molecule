import type { BatteryTranslations } from './types.js'

/** Battery translations for Sinhala. */
export const si: BatteryTranslations = {
  'battery.charging': 'ආරෝපණය වෙමින්',
  'battery.discharging': 'බැටරියෙන්',
  'battery.full': 'සම්පූර්ණයෙන් ආරෝපිතයි',
  'battery.not-charging': 'ආරෝපණය නොවේ',
  'battery.unknown': 'නොදන්නා',
  'battery.remainingUnknown': 'නොදන්නා',
  'battery.remainingTime': '{{hours}}පැ {{minutes}}මි',
  'battery.remainingMinutes': '{{minutes}}මි',
  'battery.error.noProvider':
    '`@molecule/app-battery`: සැපයුම්කරු සකසා නැත. `BatteryProvider` ක්‍රියාත්මක කිරීමක් සමඟ `setProvider()` අමතන්න — අණුව ඒ සඳහා සැපයුම්කරුවෙකු නොයවයි; ඔබේ ස්වදේශීය ධාවන වේලාවේ අතුරු මුහුණත ක්‍රියාත්මක කර එය බැඳ තබන්න.',
}
