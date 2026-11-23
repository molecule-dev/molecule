---
'@molecule/app-avatar-stack-angular': patch
'@molecule/app-file-card-angular': patch
'@molecule/app-listing-card-angular': patch
'@molecule/app-now-playing-bar-angular': patch
'@molecule/app-quiz-card-angular': patch
'@molecule/app-status-badge-angular': patch
'@molecule/app-ui-angular': patch
---

Slot content a consumer adds after the first render now shows with its wrapper (FileCard actions, StatusBadge icon, ListingCardBody rows, ListingCardMedia children and overlay, NowPlayingBar trailing, QuizCard progress and explanation, UserChip subtitle), ListingCardMedia sets no image source while children replace the image, and `hasNodes` is deprecated.
