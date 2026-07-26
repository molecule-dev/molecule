import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for ko. */
export const ko: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': '비디오 스크러버',
  'videoScrubber.aria.strip': '필름 스트립 — 재생 헤드 {{time}} s (프레임) {{frame}} )',
  'videoScrubber.aria.playhead': 'Playhead에서 {{time}} 에스',
  'videoScrubber.aria.frameReadout': '액자 {{frame}} ~의 {{total}}',
  'videoScrubber.aria.thumbnail': '프레임 미리보기',
  'videoScrubber.thumbnails.empty': '미리보기 없음',
  'videoScrubber.frameReadout.total': '/ {{total}} 프레임',
}
