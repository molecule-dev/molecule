import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for pt. */
export const pt: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'Reprodutor de vídeo',
  'videoScrubber.aria.strip':
    'Tira de filme — cabeça de reprodução em<x> {{tempo}}</x> s (quadro)<x> {{quadro}}</x> )',
  'videoScrubber.aria.playhead': 'Playhead em<x> {{tempo}}</x> s',
  'videoScrubber.aria.frameReadout': 'Quadro<x> {{quadro}}</x> de<x> {{total}}</x>',
  'videoScrubber.aria.thumbnail': 'Pré-visualização do quadro',
  'videoScrubber.thumbnails.empty': 'Sem pré-visualização',
  'videoScrubber.frameReadout.total': '/<x> {{total}}</x> quadros',
}
