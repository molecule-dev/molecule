import type { HealthTranslations } from './types.js'

/** Health translations for Kannada. */
export const kn: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ಗಂ {{minutes}}ನಿ',
  'health.durationMinutes': '{{minutes}}ನಿ',
  'health.error.noProvider':
    '`@molecule/app-health`: ಯಾವುದೇ ಆರೋಗ್ಯ ಪೂರೈಕೆದಾರರು ಬಂಧಿತರಾಗಿಲ್ಲ — ನಿಮ್ಮ ಸ್ಥಳೀಯ ರನ್‌ಟೈಮ್‌ನಲ್ಲಿ (Apple HealthKit / Android Health Connect / Google Fit) `HealthProvider` ಇಂಟರ್ಫೇಸ್ ಅನ್ನು ಕಾರ್ಯಗತಗೊಳಿಸಿ ಮತ್ತು ಅದನ್ನು ಪ್ರಾರಂಭದಲ್ಲಿ `setProvider()` ನೊಂದಿಗೆ ಬಂಧಿಸಿ. ಯಾವುದೇ ಪೂರೈಕೆದಾರರು ಫ್ಲೀಟ್‌ನೊಂದಿಗೆ ರವಾನಿಸುವುದಿಲ್ಲ. ಕರೆ ಮಾಡುವ ಮೊದಲು `hasProvider()` ಅಥವಾ `getCapabilities().supported` ನೊಂದಿಗೆ ವೈಶಿಷ್ಟ್ಯ-ಪತ್ತೆಹಚ್ಚುವಿಕೆ — ಆರೋಗ್ಯ ಓದುವಿಕೆಗೆ ಯಾವುದೇ ಪ್ರಾಮಾಣಿಕ ಡೀಫಾಲ್ಟ್ ಇಲ್ಲ, ಆದ್ದರಿಂದ ಇದು ನಕಲಿ ಡೇಟಾವನ್ನು ಹಿಂತಿರುಗಿಸುವ ಬದಲು ಎಸೆಯುತ್ತದೆ.',
}
