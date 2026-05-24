import type { TrackLaneTranslations } from './types.js'

/** FeatureTrackLane translations for ko. */
export const ko: Partial<TrackLaneTranslations> = {
  'trackLane.header': '추적',
  'trackLane.aria.lane': '트랙 레인<x> {{이름}}</x>',
  'trackLane.aria.clip':
    '클립<x> {{상표}}</x> ~부터 시작<x> {{startTime}}</x> s를 위한<x> {{지속}}</x> 에스',
  'trackLane.aria.resize': '클립 크기 조정',
}
