import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for es. */
export const es: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'depurador de vídeo',
  'videoScrubber.aria.strip':
    'Tira de película: cabezal de reproducción en {{time}} s (marco) {{frame}} )',
  'videoScrubber.aria.playhead': 'Encabezado de reproducción en {{time}} s',
  'videoScrubber.aria.frameReadout': 'Marco {{frame}} de {{total}}',
  'videoScrubber.aria.thumbnail': 'Vista previa del fotograma',
  'videoScrubber.thumbnails.empty': 'Sin vista previa',
  'videoScrubber.frameReadout.total': '/ {{total}} marcos',
}
