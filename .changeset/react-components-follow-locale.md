---
'@molecule/app-achievement-card-react': patch
'@molecule/app-amount-input-react': patch
'@molecule/app-auth-modal-react': patch
'@molecule/app-hero-metric-card-react': patch
'@molecule/app-ide-react': patch
'@molecule/app-inbox-row-react': patch
'@molecule/app-nps-distribution-react': patch
'@molecule/app-password-strength-meter-react': patch
'@molecule/app-root-error-boundary-react': patch
'@molecule/app-routing-react-router': patch
'@molecule/app-slide-thumbnail-react': patch
'@molecule/app-ui-react': patch
'@molecule/app-ui-react-native': patch
'@molecule/app-webhook-inspector-react': patch
---

Components read translations through `useTranslation()`, so their text changes language the moment the locale switches instead of on their next unrelated re-render.
