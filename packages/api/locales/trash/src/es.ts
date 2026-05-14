import type { TrashTranslations } from './types.js'

/** Trash translations for Spanish. */
export const es: TrashTranslations = {
  'trash.error.alreadyResolved': 'El elemento eliminado ya se ha restaurado o purgado',
  'trash.error.countFailed': 'No se pudieron contar los elementos eliminados',
  'trash.error.listFailed': 'No se pudieron listar los elementos eliminados',
  'trash.error.missingId': 'Se requiere el ID de la papelera',
  'trash.error.missingResource': 'Se requieren el tipo y el ID del recurso',
  'trash.error.notFound': 'Elemento eliminado no encontrado',
  'trash.error.noRestoreHandler':
    'No hay ningún controlador de restauración registrado para este tipo de recurso',
  'trash.error.purgeFailed': 'No se pudo purgar el elemento eliminado',
  'trash.error.readFailed': 'No se pudo leer el elemento eliminado',
  'trash.error.restoreFailed': 'No se pudo restaurar el elemento eliminado',
  'trash.error.trashFailed': 'No se pudo mover el elemento a la papelera',
  'trash.error.validationFailed': 'La validación falló',
}
