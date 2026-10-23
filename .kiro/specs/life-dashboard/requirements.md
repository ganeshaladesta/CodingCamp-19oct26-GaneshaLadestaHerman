# Requirements Document

## Introduction

The Life Dashboard is a single-page personal productivity homepage built with pure HTML5, CSS3, and Vanilla JavaScript (ES6+). It runs entirely in the browser by opening `index.html`, with no frameworks, no backend, and no build tools. The dashboard centralizes daily productivity tools into one interface: a live clock with a contextual greeting, a Pomodoro focus timer, a full CRUD task manager, and a quick links panel. All user data persists in the browser's Local Storage under versioned keys with graceful error handling, and the interface supports light and dark themes with responsive layouts across desktop, tablet, and mobile.

## Glossary

- **Life_Dashboard**: The complete single-page web application that organizes all widgets and modules described in this document.
- **Clock_Widget**: The module that renders the current time and date and updates the display on a recurring interval.
- **Greeting_Widget**: The module that renders a time-based greeting combined with an editable display name.
- **Pomodoro_Timer**: The module that runs 25-minute focus sessions with Start, Pause, and Reset controls and a circular progress indicator.
- **Task_Manager**: The module responsible for creating, reading, updating, and deleting tasks, and for filtering, sorting, searching, and summarizing them.
- **Task**: A user-created to-do item composed of the fields `id`, `title`, `completed`, `priority`, `category`, `createdAt`, `updatedAt`, and `dueDate`.
- **Quick_Links_Manager**: The module that manages a collection of favorite website shortcuts.
- **Quick_Link**: A saved website shortcut composed of a display `title` and a `url`.
- **URL_Validator**: The logic that validates a submitted URL against the allowed protocol rules.
- **Theme_Controller**: The module that switches, persists, and initializes the light or dark theme.
- **Storage_Manager**: The module that loads and saves data to Local Storage under versioned keys with error handling and graceful defaults.
- **Notification_Service**: The browser Notification API used to inform the user when a focus session completes.
- **Display_Name**: The optional personal name the user edits in the greeting and that is stored in Local Storage.
- **Greeting_Hours**: The time-of-day ranges used to select a greeting: Morning is 05:00 through 11:59, Afternoon is 12:00 through 16:59, Evening is 17:00 through 22:59, and Late_Night is 23:00 through 04:59.
- **Target_Timestamp**: A future Unix epoch millisecond value computed from `Date.now()` plus the session duration, used to calculate remaining time instead of decrementing a counter.
- **Priority**: The importance level of a Task, with the values `low`, `medium`, or `high`.
- **Category**: The classification of a Task, with the values `Personal`, `Work`, `Health`, `Learning`, or `Other`.

## Requirements

### Requirement 1: Live Clock and Date Display

**User Story:** As a user, I want to see the current time and date at a glance, so that I can stay oriented throughout the day.

#### Acceptance Criteria

1. WHEN the Life_Dashboard loads, THE Clock_Widget SHALL display the current time and date immediately.
2. WHILE the Life_Dashboard is open, THE Clock_Widget SHALL update the displayed time every second.
3. THE Clock_Widget SHALL format the date in a human-readable form that includes the weekday, month, and day.

### Requirement 2: Contextual Greeting

**User Story:** As a user, I want a greeting that reflects the time of day, so that the dashboard feels personal and aware of my context.

#### Acceptance Criteria

1. WHEN the current time falls within Morning Greeting_Hours, THE Greeting_Widget SHALL display the greeting "Good morning".
2. WHEN the current time falls within Afternoon Greeting_Hours, THE Greeting_Widget SHALL display the greeting "Good afternoon".
3. WHEN the current time falls within Evening Greeting_Hours, THE Greeting_Widget SHALL display the greeting "Good evening".
4. WHEN the current time falls within Late_Night Greeting_Hours, THE Greeting_Widget SHALL display the greeting "Working late?".

### Requirement 3: Editable Display Name

**User Story:** As a user, I want to set a personal display name in the greeting, so that the dashboard addresses me by name across sessions.

#### Acceptance Criteria

1. WHEN the user edits the Display_Name, THE Greeting_Widget SHALL save the Display_Name to Local Storage under the settings key.
2. WHEN the Life_Dashboard loads, THE Greeting_Widget SHALL load the Display_Name from Local Storage and include it in the greeting.
3. WHEN no Display_Name is stored, THE Greeting_Widget SHALL render the greeting without a name.
4. WHILE the user is editing the Display_Name, THE Greeting_Widget SHALL update the displayed greeting upon confirmation of the edit.

### Requirement 4: Pomodoro Timer Controls

**User Story:** As a user, I want Start, Pause, and Reset controls for a focus session, so that I can control my work intervals.

#### Acceptance Criteria

1. THE Pomodoro_Timer SHALL provide Start, Pause, and Reset controls.
2. WHEN the user activates Start, THE Pomodoro_Timer SHALL begin a 25-minute focus session.
3. WHEN the user activates Pause during a running session, THE Pomodoro_Timer SHALL pause the countdown and retain the remaining time.
4. WHEN the user activates Reset, THE Pomodoro_Timer SHALL restore the timer to the full 25-minute duration.

### Requirement 5: Accurate Timer via Target Timestamps

**User Story:** As a user, I want the timer to stay accurate even if I switch tabs, so that I do not lose or gain time.

#### Acceptance Criteria

1. WHILE a session is running, THE Pomodoro_Timer SHALL compute remaining time from a Target_Timestamp derived from `Date.now()` plus the session duration rather than decrementing a stored counter.
2. WHILE a session is running, THE Pomodoro_Timer SHALL refresh the time display every second.
3. WHEN the browser tab becomes inactive during a running session, THE Pomodoro_Timer SHALL maintain accuracy against the Target_Timestamp without drift.
4. WHEN the browser tab becomes active again, THE Pomodoro_Timer SHALL display the correct remaining time computed from the Target_Timestamp.
5. WHEN the remaining time reaches zero, THE Pomodoro_Timer SHALL stop the session and mark it complete.

### Requirement 6: Circular Progress Indicator

**User Story:** As a user, I want a visual progress ring, so that I can see how much of the session remains at a glance.

#### Acceptance Criteria

1. WHILE a session is running or paused, THE Pomodoro_Timer SHALL render a circular progress indicator representing elapsed time.
2. THE Pomodoro_Timer SHALL update the progress indicator proportionally to the elapsed fraction of the 25-minute duration.
3. WHEN the user activates Reset, THE Pomodoro_Timer SHALL reset the progress indicator to the full state.

### Requirement 7: Completion Notifications

**User Story:** As a user, I want to be notified when my focus session ends, so that I can take a break without watching the timer.

#### Acceptance Criteria

1. WHEN a session completes, THE Pomodoro_Timer SHALL display a completion notification through the Notification_Service.
2. WHERE Notification permission has already been granted, THE Pomodoro_Timer SHALL deliver the notification through the Notification_Service.
3. IF Notification permission has not been granted, THEN THE Pomodoro_Timer SHALL not request permission and SHALL not display a system notification.

### Requirement 8: Task Data Model

**User Story:** As a user, I want my tasks to capture priority, category, and due date, so that I can organize and prioritize my work.

#### Acceptance Criteria

1. THE Task_Manager SHALL represent each Task with the fields `id`, `title`, `completed`, `priority`, `category`, `createdAt`, `updatedAt`, and `dueDate`.
2. WHEN a Task is created, THE Task_Manager SHALL assign the values `completed` as false, `createdAt` and `updatedAt` as the current timestamp, and a unique `id`.
3. WHEN any Task field changes, THE Task_Manager SHALL update the `updatedAt` field to the current timestamp.

### Requirement 9: Add Task with Duplicate Prevention

**User Story:** As a user, I want to add tasks but be stopped from creating duplicates, so that my list stays clean.

#### Acceptance Criteria

1. WHEN the user submits a new task, THE Task_Manager SHALL add a Task to the list with the provided title, priority, category, and due date.
2. IF a Task with the same trimmed, case-insensitive title already exists, THEN THE Task_Manager SHALL reject the duplicate submission and not add a Task.
3. WHEN the user submits a task title containing leading or trailing whitespace, THE Task_Manager SHALL trim the title before storing it.
4. IF the user submits an empty or whitespace-only title, THEN THE Task_Manager SHALL reject the submission.

### Requirement 10: Inline Task Editing

**User Story:** As a user, I want to edit a task title inline, so that I can correct mistakes quickly.

#### Acceptance Criteria

1. WHEN the user initiates editing on a Task, THE Task_Manager SHALL present an inline editor pre-filled with the current title.
2. WHEN the user confirms an edit, THE Task_Manager SHALL save the updated title and refresh `updatedAt`.
3. IF the edited title matches an existing task title in a trimmed, case-insensitive comparison, THEN THE Task_Manager SHALL reject the edit.
4. WHEN the user cancels editing, THE Task_Manager SHALL restore the original title without saving changes.

### Requirement 11: Task Completion and Deletion

**User Story:** As a user, I want to mark tasks complete or delete them, so that I can track progress and remove unwanted items.

#### Acceptance Criteria

1. WHEN the user toggles a Task's completion control, THE Task_Manager SHALL toggle the `completed` field and update `updatedAt`.
2. WHEN the user deletes a Task, THE Task_Manager SHALL remove that Task from the list and from persisted storage.
3. THE Task_Manager SHALL persist the updated list to Local Storage after each completion toggle or deletion.

### Requirement 12: Task Categories and Priorities

**User Story:** As a user, I want to assign categories and priorities, so that I can classify and rank my tasks.

#### Acceptance Criteria

1. THE Task_Manager SHALL allow each Task to carry a Category with one of the values `Personal`, `Work`, `Health`, `Learning`, or `Other`.
2. THE Task_Manager SHALL allow each Task to carry a Priority with one of the values `low`, `medium`, or `high`.
3. THE Task_Manager SHALL render each Task with a visible indication of its Category and Priority.

### Requirement 13: Due Dates and Overdue Display

**User Story:** As a user, I want due dates with overdue highlighting, so that I can spot missed deadlines.

#### Acceptance Criteria

1. WHEN a Task has a due date, THE Task_Manager SHALL display the due date with the Task.
2. WHEN a Task has a due date earlier than the current date and `completed` is false, THE Task_Manager SHALL display the Task as overdue.
3. WHEN a Task has a due date earlier than the current date and `completed` is true, THE Task_Manager SHALL NOT mark the Task as overdue.

### Requirement 14: Task Filtering

**User Story:** As a user, I want to filter tasks, so that I can focus on the relevant subset of my list.

#### Acceptance Criteria

1. WHERE the filter is set to All, THE Task_Manager SHALL display every Task regardless of completion status.
2. WHERE the filter is set to Active, THE Task_Manager SHALL display only Tasks where `completed` is false.
3. WHERE the filter is set to Completed, THE Task_Manager SHALL display only Tasks where `completed` is true.
4. WHERE the filter is set to Today, THE Task_Manager SHALL display Tasks whose due date is the current date plus Tasks that are overdue.
5. WHEN the user switches filters, THE Task_Manager SHALL update the displayed list without losing the underlying task data.

### Requirement 15: Task Sorting

**User Story:** As a user, I want to sort tasks by different criteria, so that I can view my list in the order that suits me.

#### Acceptance Criteria

1. WHERE the sort is set to manual, THE Task_Manager SHALL preserve the order in which Tasks were arranged by the user.
2. WHERE the sort is set to newest, THE Task_Manager SHALL order Tasks by descending `createdAt`.
3. WHERE the sort is set to oldest, THE Task_Manager SHALL order Tasks by ascending `createdAt`.
4. WHERE the sort is set to priority, THE Task_Manager SHALL order Tasks by Priority rank from `high` to `medium` to `low`.
5. WHERE the sort is set to due-date, THE Task_Manager SHALL order Tasks by ascending `dueDate` and SHALL place Tasks without a due date at the end of the list.
6. WHEN the user changes the sort option repeatedly, THE Task_Manager SHALL re-sort the displayed list on each change without corrupting task data.

### Requirement 16: Task Search

**User Story:** As a user, I want to search tasks by keyword, so that I can find a specific item quickly.

#### Acceptance Criteria

1. WHEN the user enters a search query, THE Task_Manager SHALL display only Tasks whose title contains the query in a case-insensitive match.
2. WHEN the search query is empty, THE Task_Manager SHALL remove the search filter and display Tasks according to the active filter and sort.

### Requirement 17: Task Statistics

**User Story:** As a user, I want to see summary statistics, so that I can gauge my productivity at a glance.

#### Acceptance Criteria

1. THE Task_Manager SHALL display the total count of Tasks.
2. THE Task_Manager SHALL display the count of active Tasks where `completed` is false.
3. THE Task_Manager SHALL display the count of completed Tasks where `completed` is true.
4. THE Task_Manager SHALL display the completion percentage computed as completed count divided by total count.
5. WHEN the task list is empty, THE Task_Manager SHALL display zero counts and a completion percentage of zero.

### Requirement 18: Empty and Completed List States

**User Story:** As a user, I want clear feedback when my list is empty or fully complete, so that the dashboard communicates state rather than appearing blank.

#### Acceptance Criteria

1. WHEN the task list is empty, THE Task_Manager SHALL display an empty-state message.
2. WHEN every Task is completed, THE Task_Manager SHALL display a state indicating all tasks are complete.

### Requirement 19: Default Quick Links

**User Story:** As a user, I want sensible default links available on first load, so that I can start navigating immediately.

#### Acceptance Criteria

1. WHEN no Quick_Links are stored in Local Storage, THE Quick_Links_Manager SHALL display the default links Google, YouTube, GitHub, Gmail, and Notion.
2. WHEN the user has saved custom Quick_Links, THE Quick_Links_Manager SHALL display the saved links instead of the defaults.

### Requirement 20: Quick Links CRUD

**User Story:** As a user, I want to add, edit, and delete quick links, so that I can curate my own set of shortcuts.

#### Acceptance Criteria

1. WHEN the user adds a Quick_Link with a valid title and URL, THE Quick_Links_Manager SHALL add it to the list and persist the list to Local Storage.
2. WHEN the user edits a Quick_Link, THE Quick_Links_Manager SHALL update the title or URL and persist the change to Local Storage.
3. WHEN the user deletes a Quick_Link, THE Quick_Links_Manager SHALL remove it from the list and persist the change to Local Storage.

### Requirement 21: URL Validation

**User Story:** As a user, I want link URLs validated, so that I do not save broken or unsafe shortcuts.

#### Acceptance Criteria

1. WHEN the user submits a Quick_Link URL, THE URL_Validator SHALL accept only URLs whose protocol is `http` or `https`.
2. IF the submitted URL uses the `javascript:`, `data:`, or `file:` protocol, THEN THE URL_Validator SHALL reject the URL.
3. IF the submitted URL has no protocol, THEN THE URL_Validator SHALL reject the URL.
4. WHEN a URL is rejected, THE Quick_Links_Manager SHALL display an error message and SHALL NOT save the link.

### Requirement 22: Open Links in New Tabs

**User Story:** As a user, I want links to open safely in a new tab, so that the dashboard stays open while I browse.

#### Acceptance Criteria

1. WHEN the user activates a Quick_Link, THE Quick_Links_Manager SHALL open the URL in a new browser tab.
2. THE Quick_Links_Manager SHALL set `rel="noopener noreferrer"` on link anchors to prevent tab hijacking.

### Requirement 23: Theme Toggle and Persistence

**User Story:** As a user, I want to toggle between light and dark themes, so that the dashboard is comfortable in any lighting.

#### Acceptance Criteria

1. WHEN the user activates the theme toggle, THE Theme_Controller SHALL switch between the light and dark themes.
2. WHEN the theme changes, THE Theme_Controller SHALL persist the selected theme to Local Storage under the theme key.
3. WHEN the Life_Dashboard loads, THE Theme_Controller SHALL apply the stored theme if one exists.
4. WHEN the Life_Dashboard loads for the first time with no stored theme, THE Theme_Controller SHALL apply the theme matching the browser `prefers-color-scheme` preference.
5. THE Theme_Controller SHALL apply the theme before the page renders to prevent a flash of the wrong theme on load.

### Requirement 24: Timer Continuity Across Theme Changes

**User Story:** As a user, I want the timer to keep running when I switch themes, so that changing appearance does not interrupt my focus.

#### Acceptance Criteria

1. WHILE the Pomodoro_Timer is running and the user changes the theme, THE Pomodoro_Timer SHALL continue running without resetting.
2. WHEN the theme changes during a paused session, THE Pomodoro_Timer SHALL retain the paused remaining time.

### Requirement 25: Local Storage Architecture

**User Story:** As a developer, I want a versioned storage layer with error handling, so that data survives refreshes and degrades gracefully when storage fails.

#### Acceptance Criteria

1. THE Storage_Manager SHALL use the versioned keys `lifeDashboard.tasks.v1`, `lifeDashboard.quickLinks.v1`, `lifeDashboard.theme.v1`, and `lifeDashboard.settings.v1`.
2. THE Storage_Manager SHALL provide load and save utilities for each key.
3. WHEN the Life_Dashboard saves data, THE Storage_Manager SHALL persist the data to Local Storage and SHALL keep the data available after a page refresh.
4. IF the stored value for a key is malformed JSON, THEN THE Storage_Manager SHALL discard the value and return a graceful default for that key.
5. IF Local Storage is unavailable, THEN THE Storage_Manager SHALL use in-memory defaults and SHALL allow the Life_Dashboard to function for the session.
6. FOR EACH versioned key, loading data that was saved by the Storage_Manager SHALL return an equivalent value, so that a save-then-load round trip preserves the data.

### Requirement 26: Unique ID Generation

**User Story:** As a developer, I want reliable unique IDs, so that tasks and links can be identified without collisions across browsers.

#### Acceptance Criteria

1. THE Storage_Manager SHALL generate unique IDs using `crypto.randomUUID()` when available.
2. IF `crypto.randomUUID()` is not available, THEN THE Storage_Manager SHALL generate a unique ID using a fallback algorithm.

### Requirement 27: Responsive Layout

**User Story:** As a user, I want the dashboard to adapt to my screen size, so that it is usable on desktop, tablet, and mobile.

#### Acceptance Criteria

1. WHERE the viewport width is greater than 1024 pixels, THE Life_Dashboard SHALL render a multi-column grid layout.
2. WHERE the viewport width is between 768 and 1024 pixels inclusive, THE Life_Dashboard SHALL render a tablet layout.
3. WHERE the viewport width is less than 768 pixels, THE Life_Dashboard SHALL render a single-column layout.

### Requirement 28: Accessibility

**User Story:** As a user relying on keyboard and assistive technology, I want the dashboard to be accessible, so that I can use every feature without a mouse.

#### Acceptance Criteria

1. THE Life_Dashboard SHALL use semantic HTML elements for structure and landmarks.
2. THE Life_Dashboard SHALL provide ARIA labels for interactive controls that have no visible text label.
3. THE Life_Dashboard SHALL provide visible focus states for all keyboard-focusable elements.
4. WHERE the user prefers reduced motion, THE Life_Dashboard SHALL disable non-essential animations and transitions.

### Requirement 29: Safe DOM Manipulation

**User Story:** As a user, I want my special characters rendered safely, so that the dashboard is not vulnerable to markup injection.

#### Acceptance Criteria

1. THE Life_Dashboard SHALL render user-provided text such as Task titles and Quick_Link titles using `textContent` and DOM methods.
2. THE Life_Dashboard SHALL NOT use `innerHTML` to insert user-provided content.
3. WHEN a Task title contains special characters, THE Life_Dashboard SHALL display the characters literally without interpreting them as markup.

### Requirement 30: Event Delegation and Technology Constraints

**User Story:** As a developer, I want a dependency-free, maintainable codebase, so that the dashboard runs by opening a single HTML file.

#### Acceptance Criteria

1. THE Life_Dashboard SHALL be implemented in pure HTML5, CSS3, and Vanilla JavaScript ES6+ with no frameworks and no build tools.
2. THE Life_Dashboard SHALL run by opening `index.html` directly in a browser without a server or build step.
3. THE Life_Dashboard SHALL use event delegation for lists that contain many dynamically created child elements.
