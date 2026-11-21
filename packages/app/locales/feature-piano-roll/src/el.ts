import type { PianoRollTranslations } from './types.js'

/** FeaturePianoRoll translations for el. */
export const el: Partial<PianoRollTranslations> = {
  'pianoRoll.aria.roll': 'Ρόλος πιάνου',
  'pianoRoll.aria.keys': 'Πλήκτρα πιάνου',
  'pianoRoll.aria.grid': 'Πλέγμα σημειώσεων',
  'pianoRoll.aria.resize': 'Αλλαγή μεγέθους σημείωσης',
  'pianoRoll.aria.note':
    'Σημείωμα {{pitch}} ξεκινώντας από τον ρυθμό {{startBeat}} για {{durationBeats}} ρυθμοί',
  'pianoRoll.aria.cursor': 'Δρομέας στο {{pitch}} στον ρυθμό {{beat}}',
  'pianoRoll.aria.gridHelp':
    'Τα βέλη μετακινούν τον κέρσορα του κελιού, το Enter ή το Space ζωγραφίζει εκεί μια νότα.',
}
