import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for ko. */
export const ko: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': '비디오 스크러버',
  'videoScrubber.aria.strip':
    '필름 스트립 — 재생 헤드<x> {{시간}}</x> s (프레임)<x> {{액자}}</x> )',
  'videoScrubber.aria.playhead': 'Playhead에서<x> {{시간}}</x> 에스',
  'videoScrubber.aria.frameReadout': '액자<x> {{액자}}</x> ~의<x> {{총}}</x>',
  'videoScrubber.aria.thumbnail': '프레임 미리보기',
  'videoScrubber.thumbnails.empty': '미리보기 없음',
  'videoScrubber.frameReadout.total': '/<x> {{총}}</x> 프레임',
}
