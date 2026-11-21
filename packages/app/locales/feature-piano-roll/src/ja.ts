import type { PianoRollTranslations } from './types.js'

/** FeaturePianoRoll translations for ja. */
export const ja: Partial<PianoRollTranslations> = {
  'pianoRoll.aria.roll': 'ピアノロール',
  'pianoRoll.aria.keys': 'ピアノの鍵盤',
  'pianoRoll.aria.grid': 'ノートグリッド',
  'pianoRoll.aria.resize': 'サイズ変更に関する注記',
  'pianoRoll.aria.note': '注記{{pitch}}ビートから{{startBeat}}のために{{durationBeats}}ビート',
  'pianoRoll.aria.cursor': '{{pitch}} のビート {{beat}} にカーソル',
  'pianoRoll.aria.gridHelp':
    '矢印キーでセルカーソルを移動し、Enterまたはスペースでその位置に音符を描きます。',
}
