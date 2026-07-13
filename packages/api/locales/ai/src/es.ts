import type { AiTranslations } from './types.js'

/** Ai translations for Spanish. */
export const es: AiTranslations = {
  'ai.error.noProvider': 'Proveedor de IA no configurado. Vincule primero un proveedor de IA.',
  'ai.error.apiError': 'La solicitud a la API de IA falló.',
  'ai.error.noResponseBody': 'El cuerpo de la respuesta de IA está vacío.',
  'ai.error.ambiguousProvider':
    'Se han vinculado varios proveedores de IA con nombre y no se estableció ninguno predeterminado. Use getProviderByName(name) para seleccionar uno.',
}
