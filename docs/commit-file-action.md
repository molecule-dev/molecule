# Combined commit action

- [ ] C1: instead of 2 separate things "2 uncommitted files" and a "Commit" button, it should just be a single "Commit 2 files"
- [ ] C2: and when auto commit is enabled, its status should also be treated as the same combined button/info (i.e. similarly nothing separate there)
- [ ] C3: all of these info buttons should also have a hover effect so that it's clear they're clickable

The existing IDE commit handler and auto-commit reducer own the behavior.
The commit action carries its file count and countdown. The file disclosure
keeps an icon-only toggle beside it; it repeats no count or status.
All work-tray disclosures use the design system's hover and keyboard-focus treatment.

Implementation ownership: one editor for ChatPanel, AutoCommitBadge, DockStrip,
their regression cases and companion IDE locale messages. Manual and automatic
commit actions share the counted label; a held countdown stays disabled.

Verification: render the actual ChatPanel in manual, automatic, held, viewer and
clean-tree states; exercise commit clicks and file disclosure separately; inspect
the shared hover recipe and review the result against C1–C3 independently.
