import type { ConfigTranslations } from './types.js'

/** Config translations for Mongolian. */
export const mn: ConfigTranslations = {
  'config.error.required': "Шаардлагатай тохиргоо '{{key}}' тохируулаагүй байна.",
  'config.error.mustBeNumber': "Тохиргоо '{{key}}' тоо байх ёстой.",
  'config.error.minValue': "Тохиргоо '{{key}}' дор хаяж {{min}} байх ёстой.",
  'config.error.maxValue': "Тохиргоо '{{key}}' хамгийн ихдээ {{max}} байх ёстой.",
  'config.error.mustBeBoolean': "Тохиргоо '{{key}}' boolean утга байх ёстой (true/false/1/0).",
  'config.error.mustBeJson': "Тохиргоо '{{key}}' зөв JSON байх ёстой.",
  'config.error.patternMismatch': "Тохиргоо '{{key}}' загварт '{{pattern}}' таарахгүй байна.",
  'config.error.invalidEnum': "Тохиргоо '{{key}}' дараахын аль нэг байх ёстой: {{values}}.",
  'config.error.validationNotSupported':
    'Одоогийн тохиргооны нийлүүлэгч баталгаажуулалтыг дэмждэггүй.',
}
