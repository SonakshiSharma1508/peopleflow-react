# PeopleFlow React guide

This guide describes **version 2**, the separate React project. Begin here after running it from the folder containing package.json. The original vanilla JavaScript handbook describes version 1's rendering and file structure; its business stories still help, but this guide explains the React code.

## 1. The project in plain language

PeopleFlow is a digital checklist for employees joining or leaving the fictional Northstar Studio. HR checks documents and manages journeys. IT prepares accounts/equipment and records returns. A manager handles orientation, work plans, and handover.

The employee stages are `onboarding â†’ active â†’ offboarding â†’ departed`. A task has its own condition: completed, blocked, overdue, or pending. Those are different ideas: an onboarding employee can have one completed task and another blocked task.

The role dropdown is a demonstration. Completing an account task records that the work was done; it does not create a real account. Browser storage is local, not a shared database.

## 2. What React adds

React builds the interface from **components**: functions that describe pieces of the screen using JSX. JSX looks similar to HTML but belongs inside JavaScript and supports values, conditions, loops, and event callbacks.

An employee table, a task row, a dialog, and a page are components. React connects the displayed result to state. When state changes, React reconciles the interface with the next description rather than the old application replacing its entire page with an HTML string.

HTML still supplies meaningful elements. CSS still controls appearance and layout. JavaScript still calculates rules and handles data. React organizes and updates that interface; it does not replace every other technology.

## 3. Read the files in this order

| File                                                                    | Responsibility                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [index.html](../index.html)                                             | Starting document and the root/portal containers.                   |
| [src/main.jsx](../src/main.jsx)                                         | Mount React, load styles, and supply the router/provider.           |
| [src/App.jsx](../src/App.jsx)                                           | Declare the page routes and top-level rendering boundary.           |
| [src/state/PeopleFlowProvider.jsx](../src/state/PeopleFlowProvider.jsx) | Shared session, actions, dialogs, and feedback.                     |
| [src/state/sessionReducer.js](../src/state/sessionReducer.js)           | Pure application-session transitions.                               |
| [src/domain.js](../src/domain.js)                                       | Framework-independent workflow rules and record changes.            |
| [src/storage.js](../src/storage.js)                                     | Validated load/save and recovery warnings.                          |
| [src/seed.js](../src/seed.js)                                           | Fictional starting employees, tasks, equipment, and dates.          |
| `src/pages/*.jsx`                                                       | The eight routed screens.                                           |
| [src/components/Common.jsx](../src/components/Common.jsx)               | Shared rows, tables, labels, progress, and activity pieces.         |
| [src/components/AppShell.jsx](../src/components/AppShell.jsx)           | Navigation, top bar, mobile drawer, warnings, and feedback display. |
| [src/components/Dialogs.jsx](../src/components/Dialogs.jsx)             | Controlled forms and other native-dialog content.                   |
| [src/components/Icon.jsx](../src/components/Icon.jsx)                   | Static SVG drawings as React elements.                              |
| [src/components/ErrorBoundary.jsx](../src/components/ErrorBoundary.jsx) | Fallback when a rendering error is caught.                          |
| [src/utils/format.js](../src/utils/format.js)                           | Shared date/display formatting.                                     |
| [src/utils/download.js](../src/utils/download.js)                       | CSV generation and file downloads.                                  |
| `src/styles.css`, `src/react.css`                                       | Original visual foundation plus React-specific refinements.         |

Configuration and supporting files include package.json/lock, Vite config, Prettier config, tests, docs, the public favicon, and the GitHub Pages workflow. node_modules is installed dependencies; dist is generated production output. Edit source rather than those generated files.

## 4. What happens when the app opens

`main.jsx` calls React DOM's `createRoot` and renders the app inside StrictMode, HashRouter, and PeopleFlowProvider. StrictMode adds development checks; it does not mean two different user sessions exist.

The provider initializes from `loadState`. App.jsx declares which component belongs to each route. AppShell surrounds those pages with the same workspace navigation and top bar. The current page reads state and describes what should be displayed.

Example routes are `#/`, `#/people`, `#/journeys`, `#/tasks`, and `#/people/EMP-1045`. The fragment after `#` is handled in the browser, fitting static hosting. The older person-style route is also accommodated. Relevant filter choices use route search parameters rather than a second saved employee list.

## 5. Props are information passed into a component

A component can receive **props**, meaning values supplied by its parent. For example:

```jsx
<TaskRow person={person} task={task} />
```

The row receives the employee and task it should display. The same component can therefore appear on a profile and in the cross-employee queue. Avatar, Badge, Progress, EmployeeTable, and ActivityList are other shared pieces.

When rendering a list, stable IDs are used as React keys. A key helps React identify the same item after a filter, sort, or change. A row's array position is not a reliable identity when its order can change.

## 6. State is information that can change

Application state contains employees, their tasks/assets/notes, recent activity, the selected demo role, and a schema version. Interface choices have different scopes: a form's draft, the current profile tab, or an open drawer can live locally in the component that owns them.

`useState` provides local state and its update function. A controlled input displays a state value and updates it through `onChange`. In the employee dialog, typing changes the React draft. Review validates that draft without adding an employee; final creation commits it. Closing review before confirmation creates no record.

State updates should preserve the original object when creating a new result. The domain operations clone before applying their returned change, though validation can happen before cloning in some operations. An object spread is only a shallow copy; it does not automatically copy every nested task.

## 7. Context and the custom hook

Many screens need the same employee data and actions. PeopleFlowProvider exposes them through **Context**. The custom hook `usePeopleFlow()` is the shared entry point for components that need that context.

The hook does not create another database or duplicate employee list. It reads the provider's current value. Components can obtain state, actions, warning/recovery information, feedback helpers, and dialog controls without passing all of them through every intermediate component.

The provider also keeps a reference to the latest command snapshot. Commands update that reference and dispatch a prepared session, allowing closely spaced operations to use the latest data while React manages the rendered session state.

## 8. Reducer and actions have separate jobs

A **reducer** takes a current value and an action and returns the next value. `sessionReducer` is pure: it applies a prepared replacement session or a storage-conflict status.

The workflow commands run outside the reducer. For example, the provider calls domain.toggleTask, receives the next data, attempts saving through commit, and dispatches the prepared session. The domain may create timestamps and IDs, so it would be inaccurate to call every domain function strictly pure.

```text
TaskRow click
  -> provider action
  -> domain rule and next data
  -> commit and save attempt
  -> reducer receives the prepared session
  -> React renders components from that session
```

Invalid domain actions throw useful errors. Event handling catches them and displays feedback instead of applying a valid next state. A disabled control improves the interface, but the domain still checks the rule independently.

## 9. Effects connect React to the browser

An **effect** synchronizes a component with something outside its rendering calculation. This project uses effects for browser storage events, keyboard/media listeners, dialog focus, document title, scrolling, timers, and cleanup.

Saving is performed by the provider's commit path, outside the reducer. The storage-event effect listens for another tab's changes; it does not make local storage a shared transactional database. Listeners/timers need cleanup so component changes and development checks do not leave duplicate background work behind.

A calculated progress value or filtered array does not need an effect merely to copy its result into another state variable. It can be derived from the existing data and criteria when rendering.

## 10. The screens and interactions

Overview derives open-journey counts, progress, attention items, and recent events. People searches and combines filters, sorts, counts matches, then selects eight rows. Journeys filters the open joining/exit collection. Tasks collects work from open employee journeys. Employee profile combines one person's checklist, notes, activity, details, and equipment. Activity displays recent operations; Templates is read-only; Settings contains the tour, exports, and deliberate reset.

Search/filter values are controlled inputs or router search parameters. Filtering is not deletion. An employee hidden by a department filter still exists in state. CSV export includes the whole directory, not just the visible page.

The dialogs are real React content rendered through a portal into the dialog container. Controlled forms collect employee details, equipment, and an exit date. A native dialog manages modal behavior; code sets focus and returns it to the trigger when possible. The shell also handles the mobile drawer, keyboard Escape, focus wrapping, and hidden/inert navigation.

React renders ordinary user strings as text. The component interface does not use legacy HTML strings or dangerouslySetInnerHTML. CSV still needs its own quoting and formula-prefix handling; React text rendering does not solve spreadsheet interpretation.

## 11. The rules that remain unchanged

Onboarding has seven tasks: six required and an optional buddy introduction. Offboarding has six tasks: five required and an optional exit interview. All listed tasks contribute to progress; required work and exit equipment determine closure.

HR verifies documents before the IT account task can proceed. Orientation requires employee-record setup and accounts, not equipment preparation. Equipment preparation separately requires an actual assigned outstanding item. An outstanding serial cannot be reused across non-departed employees. IT records returns during an exit. HR closes journeys but cannot tick another team's tasks.

Reopening checks completed downstream dependencies, including indirect chains. Dependents must be reopened first. Due today is not overdue. A task can be blocked and past its deadline; the overdue count includes that work while its badge preserves the blocking explanation.

Closing onboarding makes the employee Active. Starting an exit is allowed for Active employees. Closing it makes the employee Departed. Closed checklists are read-only. Starting offboarding replaces the current checklist rather than creating an independent historical journey instance.

## 12. Persistence and honest limits

The React demo saves JSON under `peopleflow.react.v2`; schemaVersion remains 1. Version 1's saved data is separate. Different hosts, ports, browser profiles, and devices may have different local storage.

A fresh seed may initially exist only in memory until a normal commit such as a role change saves it. Saved milestone dates remain fixed. Reset creates fresh relative dates and replaces React-demo changes after confirmation.

Invalid saved structure triggers a fresh temporary sample and warning while retaining the unreadable snapshot. Recovery mode allows edits but pauses saving. A write failure also leaves working changes in memory with a warning. Refresh can lose unsaved changes. Export captures the current working session, and there is no import/restore function.

Another-tab changes trigger a warning and suspend this tab's later saves. That is not conflict merging or a transaction guarantee. Activity keeps at most 250 local events and is not a secure audit log. Real identities, shared data, enforced permissions, integrations, and PWA installation remain later work.

## 13. Testing and explanation in an interview

Use `npm test` for both preserved Node rule tests and the React tests. `npm run test:react` runs Vitest with jsdom; React Testing Library and user-event exercise component behavior. jsdom is a simulated document, not a complete browser layout engine. The current command output is the authority for results and counts.

`npm run build` verifies the production module/JSX graph and emits dist. Prettier checks formatting, not business correctness. Real-browser walkthroughs still matter for layout, focus, navigation, downloads, and persistence.

An interview explanation should connect a component, an action, a rule, and the resulting state. Useful examples are Omar's dependency, Maya's outstanding laptop, and Noah's final HR closure. The [demo walkthrough](DEMO-GUIDE.md) gives the navigation order. The [migration notes](MIGRATION.md) explain what moved from vanilla JavaScript.

Accurately say that this release uses React components, JSX, props, local state, Context, a reducer, effects, routing, controlled forms, and tests. Describe backend and authentication work as planned. Explain AI assistance truthfully and demonstrate parts you understand rather than claiming independent authorship or measured production impact.
