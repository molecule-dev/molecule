---
'@molecule/app-ui-tailwind': patch
'@molecule/app-ui': patch
'@molecule/app-activity-timeline-react': patch
'@molecule/app-admin-table-react': patch
'@molecule/app-auth-brand-header-react': patch
'@molecule/app-auth-shell-react': patch
'@molecule/app-chatbot-tester-react': patch
'@molecule/app-data-table-ui-react': patch
'@molecule/app-faceted-search-react': patch
'@molecule/app-hero-metric-card-react': patch
'@molecule/app-kpi-card-react': patch
'@molecule/app-legal-pages-react': patch
'@molecule/app-message-preview-react': patch
'@molecule/app-node-editor-panel-react': patch
'@molecule/app-notification-feed-react': patch
'@molecule/app-settings-panel-react': patch
'@molecule/app-sidebar-layout-react': patch
'@molecule/app-spreadsheet-grid-react': patch
'@molecule/app-status-timeline-react': patch
'@molecule/app-storefront-chrome-react': patch
'@molecule/app-top-nav-layout-react': patch
'@molecule/app-transactions-table-react': patch
'@molecule/app-weather-card-react': patch
---

Feature components style through ClassMap tokens instead of raw class names, so a styling bond swap restyles them too; the Tailwind bond renders the same classes as before.
