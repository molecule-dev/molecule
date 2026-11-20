// The package ships the .woff2 itself — `exports: { "./fonts/*": "./fonts/*" }` points at the
// binary — so TypeScript has no declaration for the bundler's asset-URL form the README
// documents. `?url` is Vite's suffix for "the emitted asset URL": the default export is the URL
// string. That is the shape `vite/client` declares for every `*?url` import; declared here for
// the one specifier the test imports. Ambient (not an augmentation): the `?url` specifier has no
// module to augment, so it lives in this importless declaration file next to its import.
declare module '@molecule/app-fonts-ionicons/fonts/ionicons.woff2?url' {
  const ioniconsWoffUrl: string
  export default ioniconsWoffUrl
}
