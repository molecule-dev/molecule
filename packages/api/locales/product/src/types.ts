/** Translation keys for the product locale package. */
export type ProductTranslationKey =
  | 'product.error.nameRequired'
  | 'product.error.invalidName'
  | 'product.error.invalidPrice'
  | 'product.error.createFailed'
  | 'product.error.notFound'
  | 'product.error.readFailed'
  | 'product.error.listFailed'
  | 'product.error.updateFailed'
  | 'product.error.deleteFailed'
  | 'product.error.listVariantsFailed'
  | 'product.error.variantNameRequired'
  | 'product.error.createVariantFailed'

/** Translation record mapping product keys to translated strings. */
export type ProductTranslations = Record<ProductTranslationKey, string>
