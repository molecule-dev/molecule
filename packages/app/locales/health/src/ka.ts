import type { HealthTranslations } from './types.js'

/** Health translations for Georgian. */
export const ka: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}სთ {{minutes}}წთ',
  'health.durationMinutes': '{{minutes}}წთ',
  'health.error.noProvider':
    '`@molecule/app-health`: ჯანდაცვის პროვაიდერი არ არის დაკავშირებული — დანერგეთ `HealthProvider` ინტერფეისი თქვენს მშობლიურ გაშვების დროს (Apple HealthKit / Android Health Connect / Google Fit) და დაუკავშირეთ ის `setProvider()` ს გაშვებისას. არცერთი პროვაიდერი არ მოყვება ფლოტს. ფუნქციის აღმოჩენა გამოძახებამდე შესაძლებელია `hasProvider()` ან `getCapabilities().supported` გამოყენებით — ჯანმრთელობის წაკითხვას არ აქვს ნამდვილი ნაგულისხმევი მნიშვნელობა, ამიტომ ის ყალბ მონაცემებს აბრუნებს და არა ყალბ მონაცემებს.',
}
