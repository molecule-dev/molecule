import type { TrackLaneTranslations } from './types.js'

/** FeatureTrackLane translations for fr. */
export const fr: Partial<TrackLaneTranslations> = {
  'trackLane.header': 'Suivre',
  'trackLane.aria.lane': 'Voie de piste<x> {{nom}}</x>',
  'trackLane.aria.clip':
    'Agrafe<x> {{étiquette}}</x> à partir de<x> {{startTime}}</x> s pour<x> {{durée}}</x> s',
  'trackLane.aria.resize': 'Redimensionner le clip',
}
