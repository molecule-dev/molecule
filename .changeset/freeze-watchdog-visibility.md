---
'@molecule/app-ide-react': patch
---

The preview freeze watchdog is visibility-aware: a hidden tab's throttled timers no longer read as an 18–58s "app stopped responding" freeze (banner + alert once per throttle wake, ~every minute, for as long as the tab stayed backgrounded). Checks pause while hidden and re-baseline on return to the foreground.
