import type { FileCardTranslations } from './types.js'

/** FileCard translations for fi. */
export const fi: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Dokumentti',
  'file-card.kind.archive': 'Arkistoi',
  'file-card.kind.other': 'Tiedosto',
  'file-card.modified.just-now': 'juuri nyt',
  'file-card.modified.minute-other': '{{count}} min sitten',
  'file-card.kind.image': 'Kuvatiedosto',
  'file-card.kind.video': 'Videotiedosto',
  'file-card.kind.audio': 'Äänitiedosto',
  'file-card.kind.code': 'Kooditiedosto',
  'file-card.kind.folder': 'Kansio',
  'file-card.aria.root': '{{nimi}} ,<x> {{laji}}</x>',
  'file-card.aria.size': 'Koko<x> {{koko}}</x>',
  'file-card.aria.modified': 'Muokattu<x> {{kun}}</x>',
  'file-card.modified.minute-one': '1 minuutti sitten',
  'file-card.modified.hour-one': '1 tunti sitten',
  'file-card.modified.hour-other': '{{laskea}} tunti sitten',
  'file-card.modified.day-one': 'eilen',
  'file-card.modified.day-other': '{{laskea}} päivää sitten',
  'file-card.modified.week-one': '1 viikko sitten',
  'file-card.modified.week-other': '{{laskea}} viikko sitten',
  'file-card.modified.month-one': '1 kk sitten',
  'file-card.modified.month-other': '{{laskea}} kuukausi sitten',
}
