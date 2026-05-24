import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for ja. */
export const ja: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'ビデオスクラバー',
  'videoScrubber.aria.strip':
    'フィルムストリップ — 再生ヘッド{{時間}} s（フレーム）<x> {{フレーム}}</x> ）',
  'videoScrubber.aria.playhead': 'プレイヘッド{{時間}} s',
  'videoScrubber.aria.frameReadout': 'フレーム{{フレーム}}の{{合計}}',
  'videoScrubber.aria.thumbnail': 'フレームプレビュー',
  'videoScrubber.thumbnails.empty': 'プレビューなし',
  'videoScrubber.frameReadout.total': '/<x> {{合計}}</x>フレーム',
}
