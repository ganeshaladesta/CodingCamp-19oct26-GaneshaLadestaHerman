# Life Dashboard

A clean, responsive, single-page personal productivity homepage built with pure HTML5, CSS3, and Vanilla JavaScript (ES6+). Runs entirely client-side in the browser with no build step, no external frameworks, and no backend.

---

## Features

- **Live Clock & Contextual Greeting**
  - Live digital time and localized date updating every second.
  - Context-aware greeting based on the hour of the day (Morning, Afternoon, Evening, Late Night).
  - Editable personal display name with inline edit affordance, persisted to local storage.

- **Pomodoro Focus Timer**
  - 25-minute focus intervals with Start, Pause, and Reset controls.
  - Target-timestamp countdown calculation to prevent drift during tab inactivity or background throttling.
  - Visual circular SVG progress ring updating with elapsed session time.
  - Non-intrusive completion status and optional desktop notifications (only if already granted).
  - Preserves countdown state across theme toggling and tab switching.

- **Task Manager (Full CRUD)**
  - Fast task creation with title, priority (Low, Medium, High), category (Personal, Work, Health, Learning, Other), and due dates.
  - Automatic duplicate prevention with trimmed, case-insensitive title checks.
  - Inline title editing with keyboard shortcuts (`Enter` to save, `Escape` to cancel).
  - Safe DOM rendering via `textContent` preventing markup and script injection.
  - Real-time filtering (All, Active, Completed, Today including overdue items).
  - Multiple sorting options (Manual, Newest, Oldest, Priority, Due Date with undated tasks at the end).
  - Instant live keyword search.
  - Live productivity statistics (Total, Active, Completed, Completion %).
  - Empty-state and all-complete celebratory states.

- **Quick Links Panel**
  - Pre-seeded shortcuts (Google, YouTube, GitHub, Gmail, Notion) on first load.
  - Add and delete custom links with immediate local persistence.
  - Strict URL protocol validation (accepting only `http://` and `https://`; rejecting `javascript:`, `data:`, `file:`, or missing protocols).
  - Secure link opening in new browser tabs (`target="_blank"` with `rel="noopener noreferrer"`).

- **Theme Controller & Visual Design**
  - Dark and Light themes with WCAG AA contrast compliance.
  - Zero-flash theme initialization script in `<head>`.
  - Instant theme toggle persisted to local storage and respecting `prefers-color-scheme`.
  - Fully responsive layout for desktop (>1024px), tablet (768px–1024px), and mobile (<768px).
  - Accessible keyboard focus rings and `prefers-reduced-motion` support.

---

## Quick Start (How to Run)

The Life Dashboard requires **no installation, no server, and no build tools**.

1. Simply open `index.html` directly in any modern web browser:
   - Double-click `index.html` in your file explorer, or
   - Drag and drop `index.html` into Chrome, Edge, Firefox, or Safari, or
   - On Windows PowerShell, run:
     ```powershell
     Start-Process .\index.html
     ```

2. Your preferences, tasks, and quick links will be securely saved in your browser's Local Storage.

---

## Project Structure

```
life-dashboard/
├── index.html        # Semantic HTML5 layout, landmarks, and head anti-flash script
├── css/
│   └── style.css     # Design tokens, theme variables, layout grid, component styles
├── js/
│   └── app.js        # IIFE module namespace (Storage, Theme, Clock, Timer, Tasks, Links, App)
└── README.md         # Project documentation and quick start guide
```

---

## Technical Specifications & Architecture

- **Technology Stack**: HTML5, Vanilla CSS3, Vanilla ES6+ JavaScript.
- **Persistence**: Browser `localStorage` with versioned keys:
  - `lifeDashboard.tasks.v1`
  - `lifeDashboard.quickLinks.v1`
  - `lifeDashboard.theme.v1`
  - `lifeDashboard.settings.v1`
- **Fallback**: Graceful in-memory fallback if `localStorage` is disabled or blocked.
- **Accessibility**: Semantic HTML landmarks (`<header>`, `<main>`, `<section>`, `<footer>`), ARIA attributes, full keyboard navigation, and visible focus indicators.
