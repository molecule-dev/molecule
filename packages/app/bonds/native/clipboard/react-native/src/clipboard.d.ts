/**
 * Minimal type declarations for `@react-native-clipboard/clipboard`.
 *
 * The real types ship with the peer package itself. However, installing
 * `@react-native-clipboard/clipboard` in a non-RN workspace breaks Vitest
 * across every package that mocks it. This stub provides the subset used by
 * this package for compilation; the real types take over when the package is
 * consumed in an actual React Native project.
 *
 * @module
 */

declare module '@react-native-clipboard/clipboard' {
  /** Minimal clipboard API surface used by this package. */
  interface ClipboardStatic {
    getString(): Promise<string>
    setString(content: string): void
    hasString(): Promise<boolean>
    getImage?(): Promise<string | null>
    setImage?(image: string): void
    hasImage?(): Promise<boolean>
    hasURL?(): Promise<boolean>
    getStringAsync?(): Promise<string>
    setStringAsync?(content: string): Promise<boolean>
  }

  const Clipboard: ClipboardStatic
  export default Clipboard
}
