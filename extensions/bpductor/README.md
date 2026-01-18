# bpductor Extension for Gemini CLI

**Measure twice, code once.**

bpductor is a Gemini CLI extension that enables **Context-Driven Development**. It turns the Gemini CLI into a proactive project manager that follows a strict protocol to specify, plan, and implement software features and bug fixes.

Instead of just writing code, bpductor ensures a consistent, high-quality lifecycle for every task: **Context -> Spec & Plan -> Implement**.

The philosophy behind bpductor is simple: control your code. By treating context as a managed artifact alongside your code, you transform your repository into a single source of truth that drives every agent interaction with deep, persistent project awareness.

## Features

- **Plan before you build**: Create specs and plans that guide the agent for new and existing codebases.
- **Maintain context**: Ensure AI follows style guides, tech stack choices, and product goals.
- **Iterate safely**: Review plans before code is written, keeping you firmly in the loop.
- **Work as a team**: Set project-level context for your product, tech stack, and workflow preferences that become a shared foundation for your team.
- **Build on existing projects**: Intelligent initialization for both new (Greenfield) and existing (Brownfield) projects.
- **Smart revert**: A git-aware revert command that understands logical units of work (tracks, phases, tasks) rather than just commit hashes.

## Installation

Install the bpductor extension by running the following command from your terminal:

```bash
gemini extensions install https://github.com/gemini-cli-extensions/bpductor --auto-update
```

The `--auto-update` is optional: if specified, it will update to new versions as they are released.

## Usage

bpductor is designed to manage the entire lifecycle of your development tasks.

**Note on Token Consumption:** bpductor's context-driven approach involves reading and analyzing your project's context, specifications, and plans. This can lead to increased token consumption, especially in larger projects or during extensive planning and implementation phases. You can check the token consumption in the current session by running `/stats model`.

### 1. Set Up the Project (Run Once)

When you run `/bpductor:setup`, bpductor helps you define the core components of your project context. This context is then used for building new components or features by you or anyone on your team.

- **Product**: Define project context (e.g. users, product goals, high-level features).
- **Product guidelines**: Define standards (e.g. prose style, brand messaging, visual identity).
- **Tech stack**: Configure technical preferences (e.g. language, database, frameworks).
- **Workflow**: Set team preferences (e.g. TDD, commit strategy). Uses [workflow.md](templates/workflow.md) as a customizable template.

**Generated Artifacts:**
- `bpductor/product.md`
- `bpductor/product-guidelines.md`
- `bpductor/tech-stack.md`
- `bpductor/workflow.md`
- `bpductor/code_styleguides/`
- `bpductor/tracks.md`

```bash
/bpductor:setup
```

### 2. Start a New Track (Feature or Bug)

When you’re ready to take on a new feature or bug fix, run `/bpductor:newTrack`. This initializes a **track** — a high-level unit of work. bpductor helps you generate two critical artifacts:

- **Specs**: The detailed requirements for the specific job. What are we building and why?
- **Plan**: An actionable to-do list containing phases, tasks, and sub-tasks.

**Generated Artifacts:**
- `bpductor/tracks/<track_id>/spec.md`
- `bpductor/tracks/<track_id>/plan.md`
- `bpductor/tracks/<track_id>/metadata.json`

```bash
/bpductor:newTrack
# OR with a description
/bpductor:newTrack "Add a dark mode toggle to the settings page"
```

### 3. Implement the Track

Once you approve the plan, run `/bpductor:implement`. Your coding agent then works through the `plan.md` file, checking off tasks as it completes them.

**Updated Artifacts:**
- `bpductor/tracks.md` (Status updates)
- `bpductor/tracks/<track_id>/plan.md` (Status updates)
- Project context files (Synchronized on completion)

```bash
/bpductor:implement
```

bpductor will:
1.  Select the next pending task.
2.  Follow the defined workflow (e.g., TDD: Write Test -> Fail -> Implement -> Pass).
3.  Update the status in the plan as it progresses.
4.  **Verify Progress**: Guide you through a manual verification step at the end of each phase to ensure everything works as expected.

During implementation, you can also:

- **Check status**: Get a high-level overview of your project's progress.
  ```bash
  /bpductor:status
  ```
- **Revert work**: Undo a feature or a specific task if needed.
  ```bash
  /bpductor:revert
  ```

## Commands Reference

| Command | Description | Artifacts |
| :--- | :--- | :--- |
| `/bpductor:setup` | Scaffolds the project and sets up the bpductor environment. Run this once per project. | `bpductor/product.md`<br>`bpductor/product-guidelines.md`<br>`bpductor/tech-stack.md`<br>`bpductor/workflow.md`<br>`bpductor/tracks.md` |
| `/bpductor:newTrack` | Starts a new feature or bug track. Generates `spec.md` and `plan.md`. | `bpductor/tracks/<id>/spec.md`<br>`bpductor/tracks/<id>/plan.md`<br>`bpductor/tracks.md` |
| `/bpductor:implement` | Executes the tasks defined in the current track's plan. | `bpductor/tracks.md`<br>`bpductor/tracks/<id>/plan.md` |
| `/bpductor:status` | Displays the current progress of the tracks file and active tracks. | Reads `bpductor/tracks.md` |
| `/bpductor:revert` | Reverts a track, phase, or task by analyzing git history. | Reverts git history |

## Resources

- [Gemini CLI extensions](https://geminicli.com/docs/extensions/): Documentation about using extensions in Gemini CLI
- [GitHub issues](https://github.com/gemini-cli-extensions/bpductor/issues): Report bugs or request features

## Legal

- License: [Apache License 2.0](LICENSE)
