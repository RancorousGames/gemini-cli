# Specification - Track: api_resilience_20260117

## Overview
This track addresses recurring and unrecoverable 400/500 API errors (specifically "mismatched function parts" and related state-breaking errors) in the Gemini CLI. The goal is to move from a basic, often insufficient single-turn rollback to a robust, user-informed recovery system supported by high-fidelity logging. This is a long-running track that will remain open until the user confirms a week of error-free operation.

## User Stories
- As a developer, I want the CLI to capture the exact state of a failing API call so that the issue can be diagnosed without me having to manually reproduce it.
- As a developer, when an API error occurs that isn't fixed by a simple retry, I want to be presented with options (like deep rollback or turn clearing) so I can maintain control over my session.

## Functional Requirements
- **High-Fidelity Logging System:**
    - Implementation of `OmniLogger` to record to `Omni/api_errors.log`.
    - Capture full JSON conversation history (snapshots) sent during failing requests.
    - Record raw API response bodies and relevant headers for 400/500 errors.
    - Log internal thought streams and tool results leading up to the failure.
    - Automatic log rotation/organization by session/date.
- **Interactive Recovery Mechanism:**
    - Detect when a basic rollback (current logic) fails to resolve a 400 error.
    - Halt execution and prompt the user in the CLI/Remote UI with recovery options:
        1. **Deep Rollback:** Remove the entire current turn (User message + subsequent parts).
        2. **Clear Current Turn:** Specifically target the offending parts if identifiable.
        3. **Export Diagnostic Log:** Provide a direct reference to the saved log file for analysis.
- **Persistence:** Logging must occur before the error is thrown or any state is modified to ensure data integrity.

## Non-Functional Requirements
- **Reliability:** The logging mechanism itself must not introduce new points of failure (e.g., using `fs.appendFileSync` or robust error handling for I/O).
- **Modularity:** Recovery logic should be centralized in `GeminiChat.ts` to ensure consistency across all tool-use loops.

## Acceptance Criteria
- [ ] Every 400/500 error results in a detailed entry in `Omni/api_errors.log`.
- [ ] Users are presented with a recovery menu when unrecoverable errors occur.
- [ ] No unrecoverable 400 errors are observed by the user for 7 consecutive days.

## Out of Scope
- Fixing the underlying Gemini API logic (we are mitigating the client-side impact).
- Redesigning the core history management system beyond the recovery hooks.
