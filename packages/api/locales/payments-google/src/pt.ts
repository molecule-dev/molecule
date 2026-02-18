import type { PaymentsGoogleTranslations } from './types.js'

/** Payments Google translations for Portuguese. */
export const pt: PaymentsGoogleTranslations = {
  'payments.google.warn.missingPackageName':
    'Nome do pacote do Google Play ausente (process.env.GOOGLE_PLAY_PACKAGE_NAME).',
  'payments.google.warn.missingServiceKey':
    'Objeto de chave de serviço da API do Google ausente (process.env.GOOGLE_API_SERVICE_KEY_OBJECT).',
  'payments.google.error.serviceKeyNotConfigured':
    'Objeto de chave de serviço da API do Google não configurado',
  'payments.google.error.parseServiceKey':
    'Erro ao analisar o objeto de chave de serviço da API do Google:',
}
