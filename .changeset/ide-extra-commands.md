---
'@molecule/app-ide-react': minor
---

Add an `extraCommands` prop to `ChatPanel` so a host can merge its own slash commands into the command menu, `/help`, and the keyboard dispatcher alongside the shared registry. Selecting one fills the input with `/<id> ` for the host's own handler to run; ids must not collide with a built-in command.
