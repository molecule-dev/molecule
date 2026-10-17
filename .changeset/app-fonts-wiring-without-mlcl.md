---
'@molecule/app-fonts-arimo': patch
'@molecule/app-fonts-dm-sans': patch
'@molecule/app-fonts-dm-serif-display': patch
'@molecule/app-fonts-ibm-plex-mono': patch
'@molecule/app-fonts-ibm-plex-sans': patch
'@molecule/app-fonts-inter': patch
'@molecule/app-fonts-ionicons': patch
'@molecule/app-fonts-jetbrains-mono': patch
'@molecule/app-fonts-lato': patch
'@molecule/app-fonts-lora': patch
'@molecule/app-fonts-manrope': patch
'@molecule/app-fonts-material-symbols': patch
'@molecule/app-fonts-merriweather': patch
'@molecule/app-fonts-newsreader': patch
'@molecule/app-fonts-playfair-display': patch
'@molecule/app-fonts-plus-jakarta-sans': patch
'@molecule/app-fonts-source-sans-3': patch
'@molecule/app-fonts-source-serif-4': patch
'@molecule/app-fonts-space-grotesk': patch
---

The README now documents bonding the font without `mlcl`: import the packaged webfont from `./fonts/*` as a bundler asset URL and pass it as the face, or copy `fonts/` into the app's `public/fonts/`.
