# OmniSync Integration & Remote Control Enhancements

This document outlines all custom modifications applied to `gemini-cli` to
enable deep integration with **OmniSync Hub**. These changes focus on
modularity, non-invasive IPC, and modernizing the startup sequence to support
remote control without sacrificing the core CLI experience.

## Core Architecture Changes

### 1. IPC (Inter-Process Communication) Layer

The CLI now features a robust, PID-specific Named Pipe server that allows
external applications (like OmniSync Hub) to monitor and control the CLI session
in real-time.

- **Named Pipe Server:** Starts automatically upon launch at
  `\\.\pipe\gemini-cli-<PID>`.
- **Bidirectional Communication:**
  - **Inbound:** Supports `prompt` (submit query) and `getHistory` (retrieve
    conversation).
  - **Outbound:** Streams `response` (text), `thought` (reasoning via
    `ReceiveAiThought`), `toolCall` (progress), and `codeDiff` (git-style
    diffs).

### 2. Modernized Startup Sequence

The initialization flow was refactored from synchronous to asynchronous to
support better workspace detection and modular service loading.

- **Workspace Service:** Centralized logic for project root detection, allowing
  the CLI to operate reliably in nested directories.
- **Asynchronous Loading:** `loadSettings`, `loadEnvironment`, and
  `validateAuthMethod` are now async, improving startup responsiveness and
  allowing for cleaner integration of remote control hooks.

---

## Maintenance & Rebasing Strategy

Rebasing a heavily modified fork requires strict adherence to initialization
order and emission discipline. Below are the key lessons learned from the 2026
refactor and rebase.

### 1. The Async Dependency Chain

Converting `loadSettings` to `async` is the most disruptive change.

- **Rule:** Any function calling `loadSettings` (directly or indirectly) must be
  `async` and use `await`.
- **Impact:** This often breaks existing unit tests and core service
  initializers. When rebasing, check every new upstream call to `loadSettings`
  to ensure it hasn't reverted to synchronous usage.

### 2. Workspace Synchronization

The `--workspace` argument is critical for OmniSync Hub.

- **Rule:** `workspaceService.setWorkspaceRoot(effectiveWorkspaceRoot)` must be
  called immediately after `parseArguments`.
- **Reason:** Services like `Config` and `ExtensionManager` rely on the
  singleton `workspaceService` to know where to look for files. If initialized
  too late, the CLI will default to its own installation directory.

### 3. IPC Emission Discipline

To prevent "ghost" messages and duplication in the Hub:

- **Centralize:** Emit `AppEvent.RemoteResponse` primarily from
  `useHistoryManager.ts` inside `addItem`. This ensures that every message
  visible in the CLI is also sent to the Hub.
- **Deduplicate:** Remove manual `RemoteResponse` emissions from
  `useGeminiStream.ts` or `slashCommandProcessor.ts` unless they represent
  transient state (like streaming chunks) that isn't yet in history.
- **Markers:** Always emit `[TURN_FINISHED]` via `RemoteResponse` when a command
  (slash or shell) completes. This is the only way the remote UI knows to stop
  its "Thinking" or "Executing" indicators.

### 4. Rebase Survival Tips

- **Untracked Conflicts:** `git rebase` may fail if a file like `convo.txt` is
  untracked in your branch but tracked in an incoming commit. **Always move
  untracked logs/data files to a backup folder before rebasing.**
- **Process Locks:** If `npm run clean` fails with `EPERM`, use
  `Get-Process -Name node` to kill zombie CLI processes holding locks on
  `node_modules`.
- **Argument Alignment:** Upstream often changes hook signatures (e.g.,
  `useGeminiStream`). When conflicts occur in `gemini.tsx`, verify that you
  aren't missing new arguments (like `terminalHeight`) added by the Google team.

---

## Reflection on Invasiveness

Our custom changes are **high-impact and invasive** because they modify the
**core lifecycle** of the application.

1.  **Entry Point Modification:** By turning `main()` into an async function and
    injecting `startRemoteControl()` at the absolute top of the stack, we create
    a permanent conflict point with any upstream changes to startup logic or
    telemetry initialization.
2.  **State Hook Coupling:** Injecting IPC logic into `useHistoryManager` and
    `useGeminiStream` couples the UI state directly to the network layer. This
    makes the code idiomatic for our needs but brittle during rebases, as
    upstream optimizations to these hooks frequently overwrite our emission
    points.
3.  **Global Singleton Dependency:** The `WorkspaceService` is a new "source of
    truth" that upstream doesn't know about. This requires us to manually patch
    every new upstream service that performs file I/O.

**Verdict:** The difficulty of rebasing is directly proportional to the "depth"
of the refactor. Because we chose to modernize the CLI's foundation (Async/Await

- Workspace Detection) rather than just adding a surface-level plugin, we must
  accept that every major rebase will require a manual "re-alignment" of the
  core service stack.

---

## Comprehensive List of Modified Files

### New Files (Omni-Specific)

- **`packages/cli/src/omni/WorkspaceService.ts`**: Implements centralized
  workspace root management and detection.
- **`packages/cli/src/omni/openDirectoryCommand.ts`**: Implements the `/od`
  command to open the workspace root in the default file manager.-
  **`packages/cli/src/omni/remoteControl.ts`**: The core IPC server
  implementation using Node.js Named Pipes.
- **`Omni/OmniCustomChanges.md`**: This documentation.
- **`Omni/refactor_plan.md`**: Tracking the refactor progress and architectural
  goals.

### Modified Core Files

- **`packages/cli/src/gemini.tsx`**:
  - Refactored `main()` to be `async`.
  - Moves `startRemoteControl()` to the early startup sequence (immediately
    after `patchStdio`).
  - Integrates `WorkspaceService` for reliable directory handling.
- **`packages/cli/src/config/config.ts`**:
  - Added `--workspace` (`-w`) argument to force a specific working directory.
  - Refactored `loadCliConfig` to support async initialization and
    workspace-aware file discovery.
- **`packages/cli/src/config/settings.ts`**: Converted settings loading to
  `async` to support modern Node.js FS APIs and remote configuration.
- **`packages/cli/src/config/auth.ts`**: Updated `validateAuthMethod` to be
  `async`.
- **`packages/cli/src/config/extension-manager.ts`**: Integrated
  `WorkspaceService` to ensure extensions are loaded from the correct project
  root.
- **`packages/cli/src/services/BuiltinCommandLoader.ts`**: Registered the new
  `/od` (open directory) command.
- **`packages/cli/src/utils/events.ts`**: Added specialized application events:
  `RemotePrompt`, `RemoteResponse`, `RemoteThought`, `RemoteCodeDiff`, and
  `RemoteToolCall`.

### Android App Enhancements (Custom)

- **Real-Time Thought Streaming**: Android now listens for the
  `ReceiveAiThought` event, displaying the AI's internal reasoning within a
  dedicated "Thinking..." bubble at the end of the conversation.
- **Enhanced Markdown Rendering**: Improved `MarkdownText` component to properly
  render bullet points (with dot markers) and added support for bold (`**`),
  italic (`*`), and inline code (`` ` ``) text.
- **Visual Improvements**:
  - Added **message icons** (User, AI, Code, System) to bubbles for better
    visual distinction.
  - Added **timestamps** to every chat bubble.
  - Added **URL detection** with highlighting for clickable links.
  - Specialized **Title highlighting** for the `[Title] : ### filename` pattern.
- **Code Diff Visualization**: Added `DiffText` component to render git-style
  diffs with line-by-line color highlighting (green for additions, red for
  deletions). Now also supports pretty-printed JSON results for tools like
  `writeFile` even after history reloads.
- **Robust SignalR Handling**:
  - Updated `SignalRClient` to handle variable argument counts in Hub
    broadcasts.
  - Eliminated redundant 1-argument handlers on Android that were causing
    broadcasts to fire multiple times and incorrectly target active sessions.
  - Updated Hub (`HubEventSender.cs`) to ensure every broadcast includes a valid
    PID, defaulting to the target PID if none is provided.
  - Optimized view updates to only trigger for the currently selected PID,
    eliminating flickering and automatic session switching ("mixing up").
- **Stability Fixes**:
  - Resolved a major crash in `LazyColumn` by ensuring globally unique keys for
    message bubbles using UUIDs.
  - Improved **auto-scroll reliability** in `AiChatScreen.kt` by adding
    measurement delays and precise scroll-to-bottom logic.
  - Added turn-based deduplication in the Hub (`AiCliService.cs`) to filter
    redundant message chunks at the source.
- **Emission Deduplication**: Removed redundant event emissions in
  `AppContainer.tsx`, `shellCommandProcessor.ts`, and `slashCommandProcessor.ts`
  to ensure tool calls and AI responses only appear once in the remote UI.

### Modified UI & Hook Files (Non-Invasive Integration)

- **`packages/cli/src/ui/AppContainer.tsx`**:
  - Added listeners for `RemotePrompt` to trigger AI submissions from IPC.
  - Implemented `RequestRemoteHistory` handler to stream serialized state back
    to the Hub.
  - Emits `[TURN_FINISHED]` marker when the AI completes its cycle.
  - Dynamically calculates `availableModels` based on preview features and
    access.
- **`packages/cli/src/omni/OmniDialogManager.tsx`**:
  - Fixed an infinite recursion bug where `onRemoteResponse` would react to its own `[DIALOG_FINISHED]` signal, causing a "Maximum call stack size exceeded" crash.
  - Fixed TypeScript compilation errors related to
    `noPropertyAccessFromIndexSignature`.
  - Corrected mapping for `FolderTrustChoice` in auto-response handling.
  - Enhanced `model_dialog` to support view switching (Main/Manual) and dynamic
    model options.
  - Added `[DIALOG_FINISHED]` marker emission when a dialog is closed.
  - Improved remote response handling with `handleAutoResponseRef` to prevent
    stale closures.
- **`packages/cli/src/ui/hooks/useGeminiStream.ts`**:
  - Streams AI "thoughts" (reasoning) to the `RemoteThought` event.
  - Forwards raw tool call requests to the IPC layer for real-time progress
    tracking.
- **`packages/cli/src/ui/hooks/useHistoryManager.ts`**:
  - Automatically forwards all history updates (AI, User, and System messages)
    to the remote listeners.
- **`packages/cli/src/ui/hooks/useReactToolScheduler.ts`**:
  - Intercepts completed tool results.
  - Specialized detection for code diffs, emitting them via `RemoteCodeDiff`.
- **`packages/cli/src/ui/hooks/slashCommandProcessor.ts`**:
  - Forwards local command output (e.g., `/help`, `/clear`) to the remote IPC.
- **`packages/cli/src/ui/hooks/shellCommandProcessor.ts`**:
  - Reports shell execution status and raw queries to the remote listeners.
- **`packages/cli/src/ui/components/StatsDisplay.tsx`**:
  - Fixed locale-specific number formatting (`en-US`) to ensure consistent
    snapshot testing across different systems.

### Note on Tests

To minimize merge conflicts with the upstream repository, all modified core test
files have been **reverted** to their original state. As a result, many core
tests will currently fail due to the asynchronous startup refactor. Verification
of custom OmniSync features is handled via external roundtrip tests (e.g.,
`roundtrip_test.py`).
