import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ja. */
export const ja: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'シーク',
  'audio.play': '遊ぶ',
  'audio.pause': '一時停止',
  'audio.mute': 'ミュート',
  'audio.unmute': 'ミュートを解除',
  'audio.captions': '字幕',
  'audio.error.missingProvider':
    'オーディオプロバイダーが設定されていません。{{bond}} から `provider` をインポートし、`setupProviders()` 内で {{core}} の `setProvider(provider)` を呼び出してください。',
}
