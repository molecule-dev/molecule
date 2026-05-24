import type { VideoScrubberTranslations } from './types.js'

/** FeatureVideoScrubber translations for th. */
export const th: Partial<VideoScrubberTranslations> = {
  'videoScrubber.aria.root': 'ตัวกรองวิดีโอ',
  'videoScrubber.aria.strip':
    'ฟิล์มสตริป — จุดเริ่มต้นการเล่นที่<x> {{เวลา}}</x> ส (เฟรม)<x> {{เฟรม}}</x> )',
  'videoScrubber.aria.playhead': 'Playhead ที่<x> {{เวลา}}</x> ส',
  'videoScrubber.aria.frameReadout': 'เฟรม<x> {{เฟรม}}</x> ของ<x> {{ทั้งหมด}}</x>',
  'videoScrubber.aria.thumbnail': 'ภาพตัวอย่างเฟรม',
  'videoScrubber.thumbnails.empty': 'ไม่มีตัวอย่าง',
  'videoScrubber.frameReadout.total': '/<x> {{ทั้งหมด}}</x> เฟรม',
}
