# Combined commit action

- [x] C1: instead of 2 separate things "2 uncommitted files" and a "Commit" button, it should just be a single "Commit 2 files"
- [x] C2: and when auto commit is enabled, its status should also be treated as the same combined button/info (i.e. similarly nothing separate there)
- [x] C3: all of these info buttons should also have a hover effect so that it's clear they're clickable
- [x] C4: in this same little bar of info buttons there is a "tests not run yet" button and it needs some serious UX improvements. there is a pointless extra click step between clicking "tests not run yet" and then a dumb "Tests" button to actually open the tests view, get rid of the extra "Tests" button step

The existing IDE commit handler and auto-commit reducer own the behavior.
The commit action carries its file count and countdown. The file disclosure
keeps an icon-only toggle beside it; it repeats no count or status.
All work-tray disclosures use the design system's hover treatment and retain keyboard activation.

Implementation ownership: one editor for ChatPanel, AutoCommitBadge, DockStrip,
their regression cases and companion IDE locale messages. Manual and automatic
commit actions share the counted label; a held countdown stays disabled.
The test summary opens the existing tests view directly from the work tray.

Verification: render the actual ChatPanel in manual, automatic, held, viewer and
clean-tree states; exercise commit clicks and file disclosure separately; inspect
the shared hover recipe and review the result against C1–C3 independently.

Verification completed on the actual React caller:

- Count/action integration covers one and two files, manual and automatic mode,
  live countdown, file-diff disclosure, and clean-tree/viewer counterexamples.
- The tests summary opens the real tests card in one click without starting a run.
  Idle, running and finished summaries retain keyboard activation and Stop isolation.
- Five focused test files passed 48 cases; the earlier full IDE run passed
  1,022 cases in 91 files. The locale suite passed 480 cases in two files.
  Package and frontend production builds passed.
- The original controls fail 13 of 35 cases in a private control. Reintroducing
  only the two accessibility defects fails five of 20 cases. Both controls
  reached the intended assertions with the same React dependency graph.
- Native Kimi source review found two duplicated accessible labels. The corrected
  disclosure uses only “Show changed files”; the counted countdown's accessible
  name matches its visible label. Lasting assertions cover both, and Kimi's
  source recheck closed both findings. Native GLM independently passed direct
  test navigation. Reviews are bounded source checks; deterministic runners
  supply execution evidence.
- GLM's stale module comment was corrected. Its observation about required
  DockStrip disclosure props is an intentional compatible API: onActivate
  overrides them for direct navigation, so it is not a behavioral defect.

These checks cover IDE controls; they make no model-performance or benchmark claim.
