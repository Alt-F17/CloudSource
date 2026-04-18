# Prompt Directory

This directory centralizes editable AI prompts used by CloudSource.

## Files

- `models.ts`: shared default model selection.
- `nimbus.ts`: Nimbus system prompt and context-builder prompt.
- `trip.ts`: trip generation system/user prompts for both trip APIs.
- `todo.ts`: Todo panel model prompts for organize and did-I-forget flows.

## Editing Flow

1. Edit prompt text in this directory.
2. Save and refresh the app.
3. Re-test the relevant panel/API route.

Environment overrides still work:

- `GOOGLE_NIMBUS_MODEL`
- `GOOGLE_TRIP_MODEL`

If unset, APIs use `DEFAULT_GOOGLE_INFERENCE_MODEL` from `models.ts`.
