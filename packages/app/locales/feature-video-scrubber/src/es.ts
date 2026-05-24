import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for es. */
export const es: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'depurador de vídeo',
  'videoScrubber.aria.strip':
    'Tira de película: cabezal de reproducción en<x> {{tiempo}}</x> s (marco)<x> {{marco}}</x> )',
  'videoScrubber.aria.playhead': 'Encabezado de reproducción en<x> {{tiempo}}</x> s',
  'videoScrubber.aria.frameReadout': 'Marco<x> {{marco}}</x> de<x> {{total}}</x>',
  'videoScrubber.aria.thumbnail': 'Vista previa del fotograma',
  'videoScrubber.thumbnails.empty': 'Sin vista previa',
  'videoScrubber.frameReadout.total': '/<x> {{total}}</x> marcos',
}
