import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for pt. */
export const pt: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Reprodutor de vídeo',
  'videoScrubber.aria.strip':
    'Tira de filme — cabeça de reprodução em {{time}} s (quadro) {{frame}} )',
  'videoScrubber.aria.playhead': 'Playhead em {{time}} s',
  'videoScrubber.aria.frameReadout': 'Quadro {{frame}} de {{total}}',
  'videoScrubber.aria.thumbnail': 'Pré-visualização do quadro',
  'videoScrubber.thumbnails.empty': 'Sem pré-visualização',
  'videoScrubber.frameReadout.total': '/ {{total}} quadros',
}
