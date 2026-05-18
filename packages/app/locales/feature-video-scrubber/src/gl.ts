import type { FeatureVideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for gl. */
export const gl: Partial<FeatureVideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Depurador de vídeo',
  'videoScrubber.aria.strip':
    'Tira de película: cabezal de reprodución en<x> {{hora}}</x> s (marco<x> {{frame}}</x> )',
  'videoScrubber.aria.playhead': 'Cabeza de reprodución en<x> {{hora}}</x> s',
  'videoScrubber.aria.frameReadout': 'Marco<x> {{frame}}</x> de<x> {{total}}</x>',
  'videoScrubber.aria.thumbnail': 'Vista previa do fotograma',
  'videoScrubber.thumbnails.empty': 'Sen vista previa',
  'videoScrubber.frameReadout.total': '/<x> {{total}}</x> cadros',
}
