import type { ConfigTranslations } from './types.js'

/** Config translations for Greek. */
export const el: ConfigTranslations = {
  'config.error.required': "Η απαιτούμενη διαμόρφωση '{{key}}' δεν έχει οριστεί.",
  'config.error.mustBeNumber': "Η διαμόρφωση '{{key}}' πρέπει να είναι αριθμός.",
  'config.error.minValue': "Η διαμόρφωση '{{key}}' πρέπει να είναι τουλάχιστον {{min}}.",
  'config.error.maxValue': "Η διαμόρφωση '{{key}}' πρέπει να είναι το πολύ {{max}}.",
  'config.error.mustBeBoolean': "Η διαμόρφωση '{{key}}' πρέπει να είναι boolean (true/false/1/0).",
  'config.error.mustBeJson': "Η διαμόρφωση '{{key}}' πρέπει να είναι έγκυρο JSON.",
  'config.error.patternMismatch':
    "Η διαμόρφωση '{{key}}' δεν ταιριάζει με το μοτίβο '{{pattern}}'.",
  'config.error.invalidEnum': "Η διαμόρφωση '{{key}}' πρέπει να είναι ένα από: {{values}}.",
  'config.error.validationNotSupported': 'Ο τρέχων πάροχος διαμόρφωσης δεν υποστηρίζει επικύρωση.',
}
