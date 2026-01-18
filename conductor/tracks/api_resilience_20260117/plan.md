# Implementation Plan - Track: api_resilience_20260117

## Phase 1: High-Fidelity Logging System
- [x] Task: Create `OmniLogger` module in `packages/core`. c8cecfc
    - [x] Create `OmniLogger` class with methods for structured error logging.
    - [x] Implement log rotation/organization (e.g., append to `Omni/api_errors.log` with timestamp).
    - [x] Ensure robust file I/O (synchronous write or queue) to guarantee capture before crash.
    - [x] Test `OmniLogger` with mock data.
- [x] Task: Integrate Logging into `GeminiChat.ts` error handling. 9c9f4b5
    - [x] Locate API request execution points in `GeminiChat.ts`.
    - [x] Implement `try-catch` blocks around API calls to capture 400/500 errors.
    - [x] Extract full request context (conversation history, tool results) and raw response headers/body.
    - [x] Call `OmniLogger` within the catch block before any error propagation.
- [ ] Task: Conductor - User Manual Verification 'High-Fidelity Logging System' (Protocol in workflow.md)

## Phase 2: Interactive Recovery Mechanism
- [ ] Task: Implement Recovery Options Logic in `GeminiChat.ts`.
    - [ ] Define recovery strategies: `Deep Rollback` (pop last user message + response), `Clear Turn` (reset current partial turn).
    - [ ] Create functions to manipulate the `history` object safely for each strategy.
- [ ] Task: Implement Interactive CLI Prompt.
    - [ ] Use `prompts` or `ink` (depending on current CLI UI stack) to display the error and options.
    - [ ] Present menu: "Deep Rollback", "Clear Current Turn", "Export Diagnostic Log".
    - [ ] Wire user selection to the recovery strategies.
- [ ] Task: Refine Error Detection.
    - [ ] Differentiate between transient network errors (retryable) and 400 Bad Request (requires intervention).
    - [ ] Only trigger Interactive Recovery for 400s or repeated 500s.
- [ ] Task: Conductor - User Manual Verification 'Interactive Recovery Mechanism' (Protocol in workflow.md)

## Phase 3: Final Verification & Observation
- [ ] Task: End-to-End Simulation.
    - [ ] Simulate a 400 error (e.g., by artificially corrupting a request).
    - [ ] Verify log file content matches expectations (JSON snapshots, headers).
    - [ ] Verify Recovery Menu appears and functions correctly (Rollback works).
- [ ] Task: Observation Period (7 Days).
    - [ ] Confirm stability over one week of usage.
- [ ] Task: Conductor - User Manual Verification 'Final Verification & Observation' (Protocol in workflow.md)
