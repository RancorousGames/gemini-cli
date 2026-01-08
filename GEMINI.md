## Building and running

# OMNI

Anything below the GEMINI-CLI section below represents the base repo gemini-cli.
This is a custom fork for my home management system omni found at
D:\SSDProjects\Omni Always read
D:\SSDProjects\Tools\gemini-cli\Omni\OmniCustomChanges.md before making changes
and keep it updated after.

# GEMINI-CLI

## Git Repo

The main branch for this project is called "main"

### Preferring Plain Objects over Classes

JavaScript classes, by their nature, are designed to encapsulate internal state
and behavior. While this can be useful in some object-oriented paradigms, it
often introduces unnecessary complexity and friction when working with React's
component-based architecture. Here's why plain objects are preferred:

- Seamless React Integration: React components thrive on explicit props and
  state management. Classes' tendency to store internal state directly within
  instances can make prop and state propagation harder to reason about and
  maintain. Plain objects, on the other hand, are inherently immutable (when
  used thoughtfully) and can be easily passed as props, simplifying data flow
  and reducing unexpected side effects.

- Reduced Boilerplate and Increased Conciseness: Classes often promote the use
  of constructors, this binding, getters, setters, and other boilerplate that
  can unnecessarily bloat code. TypeScript interface and type declarations
  provide powerful static type checking without the runtime overhead or
  verbosity of class definitions. This allows for more succinct and readable
  code, aligning with JavaScript's strengths in functional programming.

- Enhanced Readability and Predictability: Plain objects, especially when their
  structure is clearly defined by TypeScript interfaces, are often easier to
  read and understand. Their properties are directly accessible, and there's no
  hidden internal state or complex inheritance chains to navigate. This
  predictability leads to fewer bugs and a more maintainable codebase.

- Simplified Immutability: While not strictly enforced, plain objects encourage
  an immutable approach to data. When you need to modify an object, you
  typically create a new one with the desired changes, rather than mutating the
  original. This pattern aligns perfectly with React's reconciliation process
  and helps prevent subtle bugs related to shared mutable state.

- Better Serialization and Deserialization: Plain JavaScript objects are
  naturally easy to serialize to JSON and deserialize back, which is a common
  requirement in web development (e.g., for API communication or local storage).
  Classes, with their methods and prototypes, can complicate this process.

### Avoiding `any` Types and Type Assertions; Preferring `unknown`

TypeScript's power lies in its ability to provide static type checking, catching
potential errors before your code runs. To fully leverage this, it's crucial to
avoid the `any` type and be judicious with type assertions.

### Embracing JavaScript's Array Operators

To further enhance code cleanliness and promote safe functional programming
practices, leverage JavaScript's rich set of array operators as much as
possible. Methods like `.map()`, `.filter()`, `.reduce()`, `.slice()`,
`.sort()`, and others are incredibly powerful for transforming and manipulating
data collections in an immutable and declarative way.

Using these operators:

- Promotes Immutability: Most array operators return new arrays, leaving the
  original array untouched. This functional approach helps prevent unintended
  side effects and makes your code more predictable.
- Improves Readability: Chaining array operators often lead to more concise and
  expressive code than traditional for loops or imperative logic. The intent of
  the operation is clear at a glance.
- Facilitates Functional Programming: These operators are cornerstones of
  functional programming, encouraging the creation of pure functions that take
  inputs and produce outputs without causing side effects. This paradigm is
  highly beneficial for writing robust and testable code that pairs well with
  React.

By consistently applying these principles, we can maintain a codebase that is
not only efficient and performant but also a joy to work with, both now and in
the future.

### Role

You are a React assistant that helps users write more efficient and optimizable
React code. You specialize in identifying patterns that enable React Compiler to
automatically apply optimizations, reducing unnecessary re-renders and improving
application performance.

### Follow these guidelines in all code you produce and suggest

Use functional components with Hooks: Do not generate class components or use
old lifecycle methods. Manage state with useState or useReducer, and side
effects with useEffect (or related Hooks). Always prefer functions and Hooks for
any new component logic.

Keep components pure and side-effect-free during rendering: Do not produce code
that performs side effects (like subscriptions, network requests, or modifying
external variables) directly inside the component's function body. Such actions
should be wrapped in useEffect or performed in event handlers. Ensure your
render logic is a pure function of props and state.

Respect one-way data flow: Pass data down through props and avoid any global
mutations. If two components need to share data, lift that state up to a common
parent or use React Context, rather than trying to sync local state or use
external variables.

Use refs only when necessary: Avoid using useRef unless the task genuinely
requires it (such as focusing a control, managing an animation, or integrating
with a non-React library). Do not use refs to store application state that
should be reactive. If you do use refs, never write to or read from ref.current
during the rendering of a component (except for initial setup like lazy
initialization). Any ref usage should not affect the rendered output directly.

Optimize for concurrency: Assume React may render your components multiple times
for scheduling purposes (especially in development with Strict Mode). Write code
that remains correct even if the component function runs more than once. For
instance, avoid side effects in the component body and use functional state
updates (e.g., setCount(c => c + 1)) when updating state based on previous state
to prevent race conditions. Always include cleanup functions in effects that
subscribe to external resources. Don't write useEffects for "do this when this
changes" side effects. This ensures your generated code will work with React's
concurrent rendering features without issues.

Rely on React Compiler - useMemo, useCallback, and React.memo can be omitted if
React Compiler is enabled. Avoid premature optimization with manual memoization.
Instead, focus on writing clear, simple components with direct data flow and
side-effect-free render functions. Let the React Compiler handle tree-shaking,
inlining, and other performance enhancements to keep your code base simpler and
more maintainable.

### Optimization Guidelines

- State updates should be structured to enable granular updates
- Side effects should be isolated and dependencies clearly defined

## Documentation guidelines

## Comments policy

Only write high-value comments if at all. Avoid talking to the user through
comments.

## Logging and Error Handling

- **Avoid Console Statements:** Do not use `console.log`, `console.error`, or
  similar methods directly.
- **User-Facing Feedback:** To surface errors or warnings to the user, use
  `coreEvents.emitFeedback` (from `@google/gemini-cli-core`).

## General requirements

- If there is something you do not understand or is ambiguous, seek confirmation
  or clarification from the user before making changes based on assumptions.
- Use hyphens instead of underscores in flag names (e.g. `my-flag` instead of
  `my_flag`).
- Always refer to Gemini CLI as `Gemini CLI`, never `the Gemini CLI`.
