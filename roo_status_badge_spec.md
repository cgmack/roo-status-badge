# Roo Status Badge – Functional & Technical Specification

Version 0.3 — 2025‑06‑11

---

## 1 Purpose

Provide a lightweight, real‑time visual indicator (badge, favicon overlay, optional sound) per Chrome tab that shows whether the Roo agent inside a VS Code‑in‑browser session is waiting for user input, enabling developers to multitask efficiently.

## 2 Scope

**In scope**

- Chrome extension that adds per‑tab badge, colour‑coded favicon overlay, and optional audio cue.
- Optional helper VS Code extension to emit Roo state events via `postMessage`.
- Desktop notification **and audio cue (default‑on, user‑configurable)**.

**Out of scope (v1)**

- Support for non‑Chromium browsers (Firefox, Safari) — **TBD**.
- Mobile browsers on iOS / Android — **TBD**.
- Modifying Roo plugin source.

## 3 Stakeholders

| Role                | Interest                               |
| ------------------- | -------------------------------------- |
| End‑user developer  | Faster response to waiting agents      |
| Team / pair partner | Reduced idle time during collaboration |
| Tooling owner       | Minimal maintenance overhead           |

## 4 Definitions

| Term        | Meaning                                            |
| ----------- | -------------------------------------------------- |
| **Waiting** | Roo is paused for user input (`waiting_for_user`). |
| **Running** | Roo is executing a task (`running_task`).          |
| **Idle**    | No active task or wait state.                      |

### 4.1 Colour & Icon Scheme

| Badge Colour       | Roo State                    | Badge Text/Icon    | User Action                    |
| ------------------ | ---------------------------- | ------------------ | ------------------------------ |
| **Red #d44**       | Waiting (`waiting_for_user`) | `👋` (waving‑hand) | Switch to the tab and respond. |
| **Yellow #f6c20b** | Running (`running_task`)     | blank              | Optional: monitor progress.    |
| **Green #2ea44f**  | Idle / finished (`idle`)     | blank              | No action required.            |

## 5 User Stories

1. **Status at a glance** — As a developer with multiple VS Code tabs, I want each tab badge or favicon to show red when Roo is waiting so I can prioritise which tab to open.
2. **Background alert** — As a developer who has navigated away from the tab, I want a desktop notification and audio cue when Roo becomes waiting so I do not forget to respond.
3. **Zero‑config install** — As a developer, I want the extension to work without changes to Roo or VS Code, but allow an improved path if I also install the helper VSIX.
4. **Low overhead** — As a laptop user, I need negligible CPU and battery impact.

## 6 Acceptance Criteria

| AC ID | Given                            | When                                           | Then                                                            |
| ----- | -------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| AC‑1  | VS Code web tab with Roo is open | Roo state switches to `waiting_for_user`       | Tab badge background becomes **red** and shows `👋` within 1 s. |
| AC‑2  | VS Code web tab with Roo is open | Roo state switches to `running_task`           | Tab badge background becomes **yellow** (no text) within 1 s.   |
| AC‑3  | VS Code web tab with Roo is open | Roo state switches to `idle`                   | Tab badge background becomes **green** (no text) within 1 s.    |
| AC‑4  | Tab is in background             | Transition `running_task` → `waiting_for_user` | Desktop notification **and** default‑on audio cue play once.    |
| AC‑5  | Helper VSIX installed            | Roo state changes                              | Badge updates via `postMessage`, not DOM observer.              |
| AC‑6  | Extension disabled               | —                                              | No listeners or DOM observers remain active.                    |

Performance budget: content script must average <2 ms CPU per second of tab life.

## 7 Technical Design

### 7.1 Component Diagram

```
Roo (VS Code ext) ⇄ Helper VSIX (optional) → window.postMessage()
             ↓ (DOM)
      Content Script → Service Worker → chrome.action.setBadgeText / setBadgeBackgroundColor
                                               ↑
                                  chrome.notifications + Audio (<audio>)
```

### 7.2 Key Technology Choices

| Area        | Choice             | Rationale                   |
| ----------- | ------------------ | --------------------------- |
| Browser API | Chrome Manifest V3 | Per‑tab badge; future‑proof |
| Language    | TypeScript 5.x     | Type safety                 |
| Build       | esbuild            | Fast incremental build      |
| Testing     | Jest + puppeteer   | Headless integration        |
| CI          | GitHub Actions     | Free runner                 |

### 7.3 Content Script

- Injected on `vscode.dev`, `github.dev`, and self‑hosted code‑server URLs.
- Primary pathway: listen for `window.postMessage` containing `rooStatus`.
- Fallback: `MutationObserver` on elements with `aria-label="Roo"` containing the text *waiting*.
- Debounce state changes with 200 ms throttle to avoid badge flicker.

### 7.4 Service Worker

- Maintains `statesByTab: { [tabId]: 'waiting' | 'running' | 'idle' }`.
- Calls `chrome.action.setBadgeBackgroundColor` and `setBadgeText` per mapping:
  ```js
  const COLORS = { waiting: '#d44', running: '#f6c20b', idle: '#2ea44f' };
  const TEXT   = { waiting: '👋',    running: '',        idle: ''       };
  ```
- Fires a single `chrome.notifications.create` **and plays a short audio cue (default‑on, toggleable in Options)** the first time a tab enters *waiting*; resets when it leaves.

### 7.5 VS Code Helper Extension (optional)

```ts
agent.on('stateChange', s =>
  window.postMessage({ rooStatus: mapState(s) }, '*');
);
```

Packaged as `roo-status-bridge-0.0.1.vsix`.

### 7.6 Security & Privacy

- No external network I/O.
- In‑memory only; no persistent storage or telemetry.
- Chrome permissions limited to `tabs`, `scripting`, `notifications`, and `activeTab`.
- Content script injected only on trusted VS Code origins.

### 7.7 Accessibility

- Users may switch badge shape to text‑only mode ("WAIT" / "RUN" / "OK") or solid‑shape overlays for colour‑blind accessibility.
- Audio cue default‑on; user can toggle and set volume slider in Options.
- Notifications respect OS do‑not‑disturb settings.

## 8 Non‑Functional Requirements

| Attribute          | Target                                          |
| ------------------ | ----------------------------------------------- |
| Performance        | Badge update <1 s                               |
| Battery            | No DOM polling; observer only                   |
| Reliability        | 99 % accurate state reflection over 8 h session |
| Install size       | <100 kB zipped                                  |
| Compatibility (v1) | Chrome 123+, Edge 123+, macOS 12+               |
| Road‑map TBD       | Firefox, Safari, iOS, Android                   |

## 9 Risks & Mitigations

| Risk                      | Impact                  | Mitigation                                  |
| ------------------------- | ----------------------- | ------------------------------------------- |
| Roo DOM changes           | Badge stops updating    | Helper VSIX path; selector list in settings |
| Service worker suspension | Delayed badge           | Keep logic minimal; rely on event wake‑up   |
| Notification fatigue      | Users disable extension | Granular mute; audio & desktop toggle       |

## 10 Priorities & Tasks

| Priority                                                   | Work Item                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| **P1 – Core**                                              | ‑ Content script with DOM observer & badge update (colour scheme) |
| ‑ Service worker per‑tab badge (red/yellow/green)          |                                                                   |
| **P2 – Quality**                                           | ‑ Helper VSIX bridge                                              |
| ‑ Desktop notification                                     |                                                                   |
| ‑ **Audio cue default‑on, options UI for on/off + volume** |                                                                   |
| **P3 – Future**                                            | ‑ Favicon overlay                                                 |
| ‑ Cross‑browser support (Firefox, Safari)                  |                                                                   |
| ‑ Mobile browsers (iOS, Android)                           |                                                                   |
| ‑ Advanced UI customisation                                |                                                                   |

## 11 Open Questions

1. Exact wording / icon for desktop notifications?
2. Best UX pattern for options page (switches, volume slider)?
3. Implementation strategy and test matrix for Firefox & Safari?
4. Feasibility / limitations for audio & notifications on mobile (iOS, Android)?

