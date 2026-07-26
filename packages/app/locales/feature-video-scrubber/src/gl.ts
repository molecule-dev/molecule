import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for gl. */
export const gl: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Depurador de vídeo',
  'videoScrubber.aria.strip':
    'Tira de película: cabezal de reprodución en {{time}} s (marco {{frame}} )',
  'videoScrubber.aria.playhead': 'Cabeza de reprodución en {{time}} s',
  'videoScrubber.aria.frameReadout': 'Marco {{frame}} de {{total}}',
  'videoScrubber.aria.thumbnail': 'Vista previa do fotograma',
  'videoScrubber.thumbnails.empty': 'Sen vista previa',
  'videoScrubber.frameReadout.total': '/ {{total}} cadros',
}
