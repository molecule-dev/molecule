import type { VersionTranslations } from './types.js'

/** Version translations for Korean. */
export const ko: VersionTranslations = {
  'version.error.fetchFailed': '버전을 가져오지 못했습니다: {{status}}',
  'version.summary.performance': '성능 개선',
  'version.summary.minor': '사소한 개선',
  'version.summary.performanceShort': '속도 개선',
  'version.summary.features_one': '{{count}} 개의 새로운 기능',
  'version.summary.features_other': '{{count}} 개의 새로운 기능',
  'version.summary.fixes_one': '{{count}} 버그 수정됨',
  'version.summary.fixes_other': '{{count}} 개의 버그가 수정되었습니다.',
  'version.summary.featuresShort_one': '{{count}} 기능',
  'version.summary.featuresShort_other': '{{count}} 개의 특징',
  'version.summary.fixesShort_one': '{{count}} 수정',
  'version.summary.fixesShort_other': '{{count}} 수정',
}
