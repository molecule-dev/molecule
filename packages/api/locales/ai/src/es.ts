import type { AiTranslations } from './types.js'

/** Ai translations for Spanish. */
export const es: AiTranslations = {
  'ai.error.noProvider': 'Proveedor de IA no configurado. Vincule primero un proveedor de IA.',
  'ai.error.ambiguousProvider':
    'Se han vinculado varios proveedores de IA con nombre y no se estableció ninguno predeterminado. Use getProviderByName(name) para seleccionar uno.',
  'ai.error.responseIncomplete':
    'La respuesta de la IA finalizó antes de completarse. Inténtelo de nuevo.',
  'ai.error.responseTokenLimit':
    'La respuesta de la IA alcanzó el límite de tokens de salida antes de completarse.',
  'ai.error.apiError': 'Error del servicio de IA. Por favor, inténtelo de nuevo.',
  'ai.error.noResponseBody': 'El servicio de IA no ha respondido.',
}
