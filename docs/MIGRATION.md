# Migration from vanilla JavaScript to React

## What changed

Version 1 generated screen markup as HTML strings and coordinated events through document-level action attributes. Version 2 renders pages and reusable UI as React components with JSX. Inputs, events, dialogs, routes, and shared state are connected through React rather than a legacy renderer mounted inside React.

The new project is separate from the original. Its browser data uses `peopleflow.react.v2`, with schema version 1. This isolation prevents ordinary use of the React demo from overwriting the original demo's saved snapshot. Version 1 JSON exports are not automatically imported.

## What was preserved

`src/domain.js` retains the meaning of task prerequisites, role ownership, safe reopening, equipment assignment/return, employee creation, notes, and lifecycle completion. `src/seed.js` retains the fictional stories. The persistence adapter still validates saved data and exposes warnings. Existing CSS supplies the visual foundation, with React-specific refinements in `src/react.css`.

Preserving domain behavior matters more than preserving the previous DOM implementation. Progress still includes optional tasks; closure still checks required work and exit equipment. HR still cannot complete IT/Manager-owned tasks. A blocked task may also be overdue.

## Rendering and state boundaries

`main.jsx` mounts React, wraps the application in `HashRouter`, and supplies `PeopleFlowProvider`. `App.jsx` declares page routes. The shell, pages, shared rows, forms, and dialogs render JSX. Ordinary user strings are text children rather than interpolated executable markup.

The provider owns shared business data and feedback/dialog state. `usePeopleFlow` is the custom hook that reads its Context. Individual pages/forms keep local interface state or route search parameters. Filtered lists and progress are derived rather than independently saved copies.

The session reducer is deliberately pure: it applies an already prepared session or a conflict status. Domain commands run before dispatch and may create IDs/timestamps. Saving also happens outside the reducer. This avoids pretending nondeterministic operations are pure reducer calculations.

## Tests and verification

The preserved Node tests exercise the domain and storage boundary. Vitest and React Testing Library add interaction-level checks for the React rendering boundary using jsdom and user-event. Formatting is checked by Prettier; the production build checks that the JSX/module graph can be compiled.

Read actual test output for current results. Simulated DOM tests do not establish real-browser layout, screen-reader behavior, all-device support, backend security, or performance at scale. Real-browser checks should cover creation, dependency unlocking, equipment returns, closure, persistence, and responsive keyboard behavior.

## What still needs a backend

React changes the interface architecture; it does not make browser data shared or trusted. A later service would need authenticated identities, server/database authorization, relational journey instances, uniqueness constraints, transactions, conflict handling, and authoritative audit events. Browser validation can remain for fast feedback but cannot become the permission boundary.

The older vanilla JavaScript handbook remains useful for the business workflow, but its HTML-string rendering and file map describe version 1. Use [the React guide](REACT-GUIDE.md) for the current implementation.
