---
'@molecule/app-chatbot-tester-react': patch
---

The bot picker label, composer placeholder and Send button label come from `chatbotTester.*` translation keys, so the locale bond translates them in every language; an explicit prop still overrides each.
