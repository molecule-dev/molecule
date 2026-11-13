import type { AiTranslations } from './types.js'

/** Ai translations for Greek. */
export const el: AiTranslations = {
  'ai.error.noProvider': 'Ο πάροχος AI δεν έχει ρυθμιστεί. Συνδέστε πρώτα έναν πάροχο AI.',
  'ai.error.ambiguousProvider':
    'Έχουν συνδεθεί πολλοί κατονομασμένοι πάροχοι AI και δεν έχει οριστεί προεπιλογή. Χρησιμοποιήστε το getProviderByName(name) για να επιλέξετε έναν.',
  'ai.error.responseIncomplete':
    'Η απόκριση της τεχνητής νοημοσύνης έληξε πριν ολοκληρωθεί. Δοκιμάστε ξανά.',
  'ai.error.responseTokenLimit':
    'Η απόκριση της τεχνητής νοημοσύνης έφτασε το όριο διακριτικών εξόδου πριν από την ολοκλήρωσή της.',
  'ai.error.apiError': 'Σφάλμα υπηρεσίας τεχνητής νοημοσύνης. Δοκιμάστε ξανά.',
  'ai.error.noResponseBody': 'Δεν υπάρχει απάντηση από την υπηρεσία τεχνητής νοημοσύνης.',
}
