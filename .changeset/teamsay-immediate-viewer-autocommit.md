---
'@molecule/app-ide-react': patch
---

Team notes (/teamsay) now send immediately even while a response is streaming, instead of silently queuing until the turn ends; and read-only viewers no longer arm the auto-commit countdown, which fired /commit on their behalf and surfaced a spurious "view-only access, so this command is unavailable" notice.
