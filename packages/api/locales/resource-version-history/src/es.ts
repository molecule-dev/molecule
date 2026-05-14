import type { VersionHistoryTranslations } from './types.js'

/** Version-history resource translations for Spanish. */
export const es: VersionHistoryTranslations = {
  'versionHistory.error.countFailed': 'No se pudieron contar las versiones',
  'versionHistory.error.createFailed': 'No se pudo crear la versión',
  'versionHistory.error.diffFailed': 'No se pudieron comparar las versiones',
  'versionHistory.error.diffNotFound':
    'No se encontró una o ambas versiones, o pertenecen a recursos diferentes',
  'versionHistory.error.invalidVersion': 'El número de versión debe ser un entero positivo',
  'versionHistory.error.listFailed': 'No se pudieron listar las versiones',
  'versionHistory.error.missingId': 'Se requiere el ID de la versión',
  'versionHistory.error.missingResource': 'Se requieren el tipo y el ID del recurso',
  'versionHistory.error.notFound': 'Versión no encontrada',
  'versionHistory.error.readFailed': 'No se pudo leer la versión',
  'versionHistory.error.restoreFailed': 'No se pudo restaurar la versión',
  'versionHistory.error.validationFailed': 'La validación falló',
}
