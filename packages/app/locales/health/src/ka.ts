import type { HealthTranslations } from './types.js'

/** Health translations for Georgian. */
export const ka: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}სთ {{minutes}}წთ',
  'health.durationMinutes': '{{minutes}}წთ',
  'health.error.noProvider':
    '`@molecule/app-health`: ჯანდაცვის პროვაიდერი არ არის დაკავშირებული — იმპლემენტირეთ `HealthProvider` ინტერფეისი თქვენს მშობლიურ გაშვების დროს (Apple HealthKit / Android Health Connect / Google Fit) და დაუკავშირეთ ის `setProvider()` გაშვებისას. Molecule მისთვის პროვაიდერს არ აგზავნის. ფუნქციის აღმოჩენა გამოძახებამდე ხდება `hasProvider()` ან `getCapabilities().supported` გამოყენებით — ჯანმრთელობის წაკითხვას არ აქვს ნამდვილი ნაგულისხმევი მონაცემები, ამიტომ ის ყალბ მონაცემებს აბრუნებს და არა ყალბ მონაცემებს.',
}
