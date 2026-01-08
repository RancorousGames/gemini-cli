# Gemini CLI Dialog System Architecture

The Gemini CLI dialog system provides a consistent, keyboard-navigable interface
for interactive multiple-choice prompts. It is built using **Ink** (React for
CLI) and leverages a modular architecture that separates state management,
navigation logic, and visual rendering.

## Core Components

### 1. `DialogManager.tsx` (The Router)

Located in `packages/cli/src/ui/components/DialogManager.tsx`, this component
acts as the central coordinator. It monitors the application's global UI state
and determines which dialog (if any) should be rendered on top of the main
interface.

**Responsibilities:**

- Observes `UIStateContext` for flags like `isThemeDialogOpen` or
  `isSettingsDialogOpen`.
- Renders specific dialog implementations (e.g., `ThemeDialog`,
  `SettingsDialog`, `ConsentPrompt`).
- Handles the conditional display of errors within dialogs.

### 2. `useSelectionList.ts` (The Logic Engine)

The `useSelectionList` hook (`packages/cli/src/ui/hooks/useSelectionList.ts`) is
a headless hook that manages the interactive state of any list-based selection.

**Key Features:**

- **State Management**: Uses a React reducer to track the `activeIndex`
  (currently highlighted item).
- **Navigation Logic**:
  - Implements `MOVE_UP` and `MOVE_DOWN` with automatic wrapping (first item to
    last and vice-versa).
  - Automatically skips items marked as `disabled`.
- **Keyboard Handling**: Uses `useKeypress` to listen for global terminal input.
- **Quick Numeric Selection**:
  - Users can type the index number of an item to jump to it.
  - If a number is unique (e.g., typing '5' in a list of 5 items), it selects
    immediately.
  - If ambiguous (e.g., typing '1' in a list of 15), it waits for a second digit
    or a 1000ms timeout before selecting.

### 3. `BaseSelectionList.tsx` (The UI Framework)

This component (`packages/cli/src/ui/components/shared/BaseSelectionList.tsx`)
provides the visual structure for lists.

**Features:**

- **Theming**: Integrates with the CLI's semantic color palette
  (`theme.status.success` for highlights).
- **Radio Buttons**: Renders the `●` indicator for the active selection.
- **Scrolling**: Manages a `scrollOffset` to handle lists that exceed the
  terminal height or the `maxItemsToShow` limit.
- **Render Props**: Accepts a `renderItem` function, allowing sub-components to
  customize how each option looks (e.g., adding descriptions or secondary
  labels).

---

## Keyboard Interaction Model

The system maps physical keys to logical commands defined in `keyBindings.ts`:

| Action          | Keys      | Command                  |
| :-------------- | :-------- | :----------------------- |
| **Move Up**     | `↑`, `k`  | `DIALOG_NAVIGATION_UP`   |
| **Move Down**   | `↓`, `j`  | `DIALOG_NAVIGATION_DOWN` |
| **Confirm**     | `Enter`   | `RETURN`                 |
| **Cancel**      | `Escape`  | `ESCAPE`                 |
| **Jump/Select** | `1` - `9` | Numeric Input            |

---

## Implementation Example: Creating a New Dialog

To implement a custom selection dialog, you typically use the
`RadioButtonSelect` wrapper, which simplifies the usage of `BaseSelectionList`.

### 1. Define the Items

```typescript
const fruitOptions = [
  { key: 'apple', value: 'apple', label: 'Apple' },
  { key: 'banana', value: 'banana', label: 'Banana' },
  { key: 'cherry', value: 'cherry', label: 'Cherry', disabled: true },
];
```

### 2. Create the Component

```tsx
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';

export const FruitSelector = ({ onSelect }) => {
  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      <Text bold>Select your favorite fruit:</Text>
      <RadioButtonSelect
        items={fruitOptions}
        onSelect={(value) => onSelect(value)}
        showNumbers={true}
      />
    </Box>
  );
};
```

---

## Workflow Lifecycle

1. **Trigger**: An action (like a command or menu click) sets
   `uiState.isDialogOpen = true`.
2. **Mount**: `DialogManager` detects the state change and mounts the specific
   dialog component.
3. **Focus**: `useSelectionList` starts capturing `stdin`.
4. **Navigate**:
   - User presses `j`.
   - Reducer calculates `(currentIndex + 1) % length`.
   - Component re-renders with the new `activeIndex`.
5. **Selection**:
   - User presses `Enter`.
   - `onSelect(value)` is triggered.
   - The action handler updates the global state/config and sets
     `uiState.isDialogOpen = false`.
6. **Unmount**: `DialogManager` stops rendering the dialog, returning focus to
   the main input prompt.
