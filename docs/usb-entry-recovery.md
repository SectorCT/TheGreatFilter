# USB Entry Recovery Notes

Date: 2026-03-26
Branch: `frontend`
Source reference: `main`

## Goal

Restore the working USB import screen in `AddMeasurement` after merge conflict resolution accidentally replaced it with a placeholder panel.

## What was checked on `main`

- `client/src/renderer/src/pages/AddMeasurement.tsx`
- `client/src/preload/index.ts`
- `client/src/preload/index.d.ts`
- `client/src/main/index.ts`

## What was restored on this branch

- USB method now renders a functional workflow (not placeholder):
  - serial port listing + refresh
  - connect / disconnect
  - measurement request
  - dry/wet polling loop
  - parsed measurement preview cards/table
  - raw JSON toggle
  - save/import action + success/error state

## Branch-specific adaptations

- Kept the current branch's manual-entry and map sections intact.
- Reused existing `labApi` bridge exposed by preload/main.
- For saving imported USB measurement, used the frontend API helper `createMeasurement(...)`
  instead of direct `fetch(...)`, so it stays aligned with current `/api/` contracts and auth flow.

## Validation

- `npm run typecheck:web` passes after restore.
