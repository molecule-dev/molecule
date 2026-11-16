---
'@molecule/app-state-redux': patch
---

`createSlice` takes reducers typed as in Redux Toolkit (`(state, action: PayloadAction<number>) => …`), its action creators take each reducer's payload or no argument, and `createReduxStore({ slices })` accepts the slices it returns.
