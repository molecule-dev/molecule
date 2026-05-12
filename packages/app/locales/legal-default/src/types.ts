/**
 * Default legal content shipped by the molecule fleet — privacy policy
 * and terms of service.
 *
 * Values are raw HTML strings that get rendered via `dangerouslySetInnerHTML`
 * inside the Footer's Privacy and Terms modals. `{{appName}}` placeholders
 * are interpolated at render time by the i18n provider.
 */
export interface LegalContent {
  /** Privacy policy HTML (interpolates `{{appName}}`). */
  'content.privacyPolicy': string
  /** Terms of service HTML (interpolates `{{appName}}`). */
  'content.termsOfService': string
}
