/**
 * Life Dashboard — js/app.js
 * -----------------------------------------------------------------------------
 * Pure Vanilla JavaScript implementation of the Life Dashboard.
 * Implemented using an IIFE module namespace pattern without frameworks,
 * bundlers, or external dependencies. Fully runnable via file:// protocol.
 *
 * Modules:
 * - Storage: Versioned key constants, localStorage probe, JSON validation, UUID.
 * - ThemeController: Light/dark mode toggle, persistence, anti-flash init.
 * - ClockGreeting: Live clock, Greeting_Hours contextual greeting, editable display name.
 * - PomodoroTimer: 25-minute focus session, target timestamp countdown, circular progress, notifications.
 * - TaskManager: Task CRUD, duplicate prevention, inline edit, filters, sorts, search, statistics.
 * - QuickLinksManager: Link CRUD, seeding, strict HTTP/HTTPS URL validation, safe new tab opening.
 * - App: Bootstrap coordinating all modules on DOMContentLoaded.
 * -----------------------------------------------------------------------------
 */

(function (window, document) {
  'use strict';

  // =========================================================================
  // Module 1: Storage Layer
  // =========================================================================
  const Storage = (function () {
    const KEYS = {
      TASKS: 'lifeDashboard.tasks.v1',
      QUICK_LINKS: 'lifeDashboard.quickLinks.v1',
      THEME: 'lifeDashboard.theme.v1',
      SETTINGS: 'lifeDashboard.settings.v1'
    };

    // In-memory fallback if localStorage is disabled, blocked, or quota exceeded
    const memoryStore = {};
    let idCounter = 0;

    function isAvailable() {
      try {
        const testKey = '__ld_probe__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
        return true;
      } catch (e) {
        return false;
      }
    }

    const available = isAvailable();

    function load(key, defaultValue) {
      if (!available) {
        return Object.prototype.hasOwnProperty.call(memoryStore, key)
          ? memoryStore[key]
          : defaultValue;
      }

      try {
        const raw = window.localStorage.getItem(key);
        if (raw === null) {
          return defaultValue;
        }
        return JSON.parse(raw);
      } catch (err) {
        // Discard malformed JSON and return default
        return defaultValue;
      }
    }

    function save(key, value) {
      // Always update in-memory fallback
      try {
        memoryStore[key] = JSON.parse(JSON.stringify(value));
      } catch (_) {
        memoryStore[key] = value;
      }

      if (!available) {
        return false;
      }

      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[Storage] Failed to save key:', key, err);
        }
        return false;
      }
    }

    function generateId() {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        try {
          return crypto.randomUUID();
        } catch (_) {
          // Fall through if randomUUID fails
        }
      }

      // Fallback unique ID
      idCounter += 1;
      const rand = Math.random().toString(36).substring(2, 10);
      const time = Date.now().toString(36);
      return 'id-' + time + '-' + rand + '-' + idCounter;
    }

    function hasKey(key) {
      if (!available) {
        return Object.prototype.hasOwnProperty.call(memoryStore, key);
      }
      try {
        return window.localStorage.getItem(key) !== null;
      } catch (_) {
        return Object.prototype.hasOwnProperty.call(memoryStore, key);
      }
    }

    return {
      KEYS: KEYS,
      isAvailable: isAvailable,
      load: load,
      save: save,
      generateId: generateId,
      hasKey: hasKey
    };
  })();

  // =========================================================================
  // Module 2: Theme Controller
  // =========================================================================
  const ThemeController = (function () {
    let currentTheme = 'light';
    let toggleBtn = null;

    function getStoredTheme() {
      return Storage.load(Storage.KEYS.THEME, null);
    }

    function getSystemTheme() {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }

    function applyTheme(theme) {
      currentTheme = theme === 'dark' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', currentTheme);

      if (toggleBtn) {
        const isDark = currentTheme === 'dark';
        toggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        toggleBtn.setAttribute(
          'aria-label',
          isDark ? 'Switch to light theme' : 'Switch to dark theme'
        );
      }
    }

    function toggle() {
      const next = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      Storage.save(Storage.KEYS.THEME, next);
      return next;
    }

    function getTheme() {
      return currentTheme;
    }

    function init() {
      toggleBtn = document.getElementById('theme-toggle');

      // Check stored theme or system preference
      const stored = getStoredTheme();
      const initial = stored || getSystemTheme();
      applyTheme(initial);

      if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
          toggle();
        });
      }
    }

    return {
      init: init,
      applyTheme: applyTheme,
      toggle: toggle,
      getTheme: getTheme,
      getStoredTheme: getStoredTheme,
      getSystemTheme: getSystemTheme
    };
  })();

  // =========================================================================
  // Module 3: Clock & Greeting
  // =========================================================================
  const ClockGreeting = (function () {
    let clockInterval = null;
    let timeEl = null;
    let dateEl = null;
    let salutationEl = null;
    let nameEl = null;
    let editBtn = null;
    let editorContainer = null;
    let isEditingName = false;

    /**
     * Determines greeting based on Greeting_Hours specification:
     * - Morning: 05:00 - 11:59 -> "Good morning"
     * - Afternoon: 12:00 - 16:59 -> "Good afternoon"
     * - Evening: 17:00 - 22:59 -> "Good evening"
     * - Late Night: 23:00 - 04:59 -> "Working late?"
     */
    function getGreeting(date) {
      const d = date || new Date();
      const hour = d.getHours();

      if (hour >= 5 && hour < 12) {
        return 'Good morning';
      }
      if (hour >= 12 && hour < 17) {
        return 'Good afternoon';
      }
      if (hour >= 17 && hour < 23) {
        return 'Good evening';
      }
      return 'Working late?';
    }

    function formatTime(date) {
      const d = date || new Date();
      return d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    }

    function formatDate(date) {
      const d = date || new Date();
      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }

    function loadSettings() {
      return Storage.load(Storage.KEYS.SETTINGS, { displayName: '' });
    }

    function saveDisplayName(name) {
      const settings = loadSettings();
      settings.displayName = (name || '').trim();
      Storage.save(Storage.KEYS.SETTINGS, settings);
      renderGreeting();
    }

    function getDisplayName() {
      const settings = loadSettings();
      return settings.displayName || '';
    }

    function renderGreeting() {
      if (!salutationEl || !nameEl) return;
      const salutation = getGreeting();
      salutationEl.textContent = salutation;

      const name = getDisplayName();
      if (name) {
        nameEl.textContent = ', ' + name;
      } else {
        nameEl.textContent = '';
      }
    }

    function tick() {
      const now = new Date();
      if (timeEl) {
        timeEl.textContent = formatTime(now);
        timeEl.setAttribute('datetime', now.toISOString());
      }
      if (dateEl) {
        dateEl.textContent = formatDate(now);
        dateEl.setAttribute('datetime', now.toISOString().split('T')[0]);
      }
      renderGreeting();
    }

    function enterEditMode() {
      if (isEditingName || !editorContainer) return;
      isEditingName = true;

      const currentName = getDisplayName();

      editorContainer.innerHTML = '';

      const form = document.createElement('form');
      form.className = 'display-name-editor__form';
      form.style.display = 'flex';
      form.style.gap = 'var(--space-2)';
      form.style.alignItems = 'center';
      form.style.marginTop = 'var(--space-2)';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'task-form__input';
      input.style.padding = 'var(--space-1) var(--space-2)';
      input.style.fontSize = 'var(--fs-sm)';
      input.style.width = '180px';
      input.value = currentName;
      input.placeholder = 'Your name';
      input.setAttribute('aria-label', 'Enter your name');
      input.maxLength = 50;

      const saveBtn = document.createElement('button');
      saveBtn.type = 'submit';
      saveBtn.className = 'timer__btn';
      saveBtn.style.padding = 'var(--space-1) var(--space-3)';
      saveBtn.style.minWidth = 'auto';
      saveBtn.style.fontSize = 'var(--fs-sm)';
      saveBtn.textContent = 'Save';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'timer__btn';
      cancelBtn.style.padding = 'var(--space-1) var(--space-3)';
      cancelBtn.style.minWidth = 'auto';
      cancelBtn.style.fontSize = 'var(--fs-sm)';
      cancelBtn.textContent = 'Cancel';

      form.appendChild(input);
      form.appendChild(saveBtn);
      form.appendChild(cancelBtn);
      editorContainer.appendChild(form);

      input.focus();
      input.select();

      function closeEdit() {
        isEditingName = false;
        editorContainer.innerHTML = '';
        if (editBtn) {
          editorContainer.appendChild(editBtn);
        }
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        saveDisplayName(input.value);
        closeEdit();
      });

      cancelBtn.addEventListener('click', function () {
        closeEdit();
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeEdit();
        }
      });
    }

    function init() {
      timeEl = document.getElementById('clock-time');
      dateEl = document.getElementById('clock-date');
      salutationEl = document.querySelector('#greeting-text .greeting__salutation');
      nameEl = document.getElementById('display-name');
      editBtn = document.getElementById('edit-name-btn');
      editorContainer = document.querySelector('.display-name-editor');

      tick();
      if (clockInterval) clearInterval(clockInterval);
      clockInterval = setInterval(tick, 1000);

      if (editBtn) {
        editBtn.addEventListener('click', enterEditMode);
      }
    }

    return {
      init: init,
      getGreeting: getGreeting,
      formatTime: formatTime,
      formatDate: formatDate,
      getDisplayName: getDisplayName,
      saveDisplayName: saveDisplayName,
      tick: tick
    };
  })();

  // =========================================================================
  // Module 4: Pomodoro Timer
  // =========================================================================
  const PomodoroTimer = (function () {
    const DEFAULT_DURATION_MS = 25 * 60 * 1000; // 25 minutes
    const RING_CIRCUMFERENCE = 565.49; // 2 * PI * 90

    let status = 'idle'; // 'idle' | 'running' | 'paused' | 'completed'
    let durationMs = DEFAULT_DURATION_MS;
    let targetEnd = null;
    let remainingMs = DEFAULT_DURATION_MS;
    let intervalId = null;

    let timeEl = null;
    let ringEl = null;
    let statusEl = null;
    let startBtn = null;
    let pauseBtn = null;
    let resetBtn = null;

    function formatTime(ms) {
      const safeMs = Math.max(0, ms);
      const totalSec = Math.ceil(safeMs / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      const mm = m < 10 ? '0' + m : '' + m;
      const ss = s < 10 ? '0' + s : '' + s;
      return mm + ':' + ss;
    }

    function calculateRingOffset(remMs, totalMs) {
      const elapsed = Math.max(0, (totalMs || DEFAULT_DURATION_MS) - remMs);
      const fraction = Math.min(1, Math.max(0, elapsed / (totalMs || DEFAULT_DURATION_MS)));
      return fraction * RING_CIRCUMFERENCE;
    }

    function updateDisplay() {
      if (timeEl) {
        timeEl.textContent = formatTime(remainingMs);
      }

      if (ringEl) {
        const offset = calculateRingOffset(remainingMs, durationMs);
        ringEl.style.strokeDashoffset = offset;
      }
    }

    function tick() {
      if (status !== 'running' || !targetEnd) return;

      const now = Date.now();
      const rem = targetEnd - now;

      if (rem <= 0) {
        complete();
      } else {
        remainingMs = rem;
        updateDisplay();
      }
    }

    function start() {
      if (status === 'running') return;

      if (status === 'idle' || status === 'completed') {
        durationMs = DEFAULT_DURATION_MS;
        remainingMs = durationMs;
      }

      targetEnd = Date.now() + remainingMs;
      status = 'running';

      if (statusEl) {
        statusEl.textContent = '';
      }

      updateDisplay();

      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(tick, 250);
    }

    function pause() {
      if (status !== 'running') return;

      remainingMs = Math.max(0, targetEnd - Date.now());
      status = 'paused';
      targetEnd = null;

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      updateDisplay();
    }

    function reset() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      status = 'idle';
      durationMs = DEFAULT_DURATION_MS;
      remainingMs = DEFAULT_DURATION_MS;
      targetEnd = null;

      if (statusEl) {
        statusEl.textContent = '';
      }

      updateDisplay();
    }

    function complete() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      status = 'completed';
      remainingMs = 0;
      targetEnd = null;
      updateDisplay();

      if (statusEl) {
        statusEl.textContent = 'Focus session complete! Take a break.';
      }

      // Check Notification permission strictly: NEVER request permission, only notify if already granted
      if (typeof window.Notification !== 'undefined' && window.Notification.permission === 'granted') {
        try {
          new window.Notification('Life Dashboard', {
            body: 'Pomodoro focus session finished! Time for a well-deserved break.'
          });
        } catch (_) {
          // Ignore notification constructor errors
        }
      }
    }

    function init() {
      timeEl = document.getElementById('timer-time');
      ringEl = document.getElementById('timer-ring-progress');
      statusEl = document.getElementById('timer-status');
      startBtn = document.getElementById('timer-start');
      pauseBtn = document.getElementById('timer-pause');
      resetBtn = document.getElementById('timer-reset');

      if (startBtn) startBtn.addEventListener('click', start);
      if (pauseBtn) pauseBtn.addEventListener('click', pause);
      if (resetBtn) resetBtn.addEventListener('click', reset);

      // Handle visibility changes to eliminate drift when returning to inactive tab
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && status === 'running') {
          tick();
        }
      });

      updateDisplay();
    }

    return {
      init: init,
      start: start,
      pause: pause,
      reset: reset,
      complete: complete,
      tick: tick,
      formatTime: formatTime,
      calculateRingOffset: calculateRingOffset,
      getState: function () {
        return {
          status: status,
          remainingMs: remainingMs,
          targetEnd: targetEnd,
          durationMs: durationMs
        };
      }
    };
  })();

  // =========================================================================
  // Module 5: Task Manager
  // =========================================================================
  const TaskManager = (function () {
    let tasks = [];
    let currentFilter = 'all'; // 'all' | 'active' | 'completed' | 'today'
    let currentSort = 'manual'; // 'manual' | 'newest' | 'oldest' | 'priority' | 'due-date'
    let searchQuery = '';

    // DOM references
    let formEl = null;
    let titleInput = null;
    let prioritySelect = null;
    let categorySelect = null;
    let dueDateInput = null;
    let filterSelect = null;
    let sortSelect = null;
    let searchInput = null;
    let listEl = null;
    let emptyStateEl = null;
    let allCompleteStateEl = null;
    let statTotalEl = null;
    let statActiveEl = null;
    let statCompletedEl = null;
    let statPercentEl = null;

    function getTodayString() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + d;
    }

    function normalizeTitle(title) {
      return (title || '').trim().toLowerCase();
    }

    function isDuplicateTitle(taskList, title, excludeId) {
      const norm = normalizeTitle(title);
      if (!norm) return false;
      return (taskList || []).some(function (t) {
        if (excludeId && t.id === excludeId) return false;
        return normalizeTitle(t.title) === norm;
      });
    }

    function isOverdue(task, todayStr) {
      if (!task || task.completed || !task.dueDate) return false;
      const ref = todayStr || getTodayString();
      return task.dueDate < ref;
    }

    function createTask(params) {
      const title = (params.title || '').trim();
      const now = Date.now();
      return {
        id: Storage.generateId(),
        title: title,
        completed: false,
        priority: params.priority || 'medium',
        category: params.category || 'Personal',
        createdAt: now,
        updatedAt: now,
        dueDate: params.dueDate ? params.dueDate.trim() : null
      };
    }

    function filterTasks(taskList, filter, todayStr) {
      const list = taskList || [];
      const refToday = todayStr || getTodayString();

      switch (filter) {
        case 'active':
          return list.filter(function (t) { return !t.completed; });
        case 'completed':
          return list.filter(function (t) { return t.completed; });
        case 'today':
          return list.filter(function (t) {
            if (t.dueDate === refToday) return true;
            return isOverdue(t, refToday);
          });
        case 'all':
        default:
          return list.slice();
      }
    }

    function sortTasks(taskList, sortCriteria) {
      const list = (taskList || []).slice();
      const priorityRank = { high: 3, medium: 2, low: 1 };

      switch (sortCriteria) {
        case 'newest':
          return list.sort(function (a, b) {
            return (b.createdAt || 0) - (a.createdAt || 0);
          });
        case 'oldest':
          return list.sort(function (a, b) {
            return (a.createdAt || 0) - (b.createdAt || 0);
          });
        case 'priority':
          return list.sort(function (a, b) {
            const ra = priorityRank[a.priority] || 0;
            const rb = priorityRank[b.priority] || 0;
            return rb - ra;
          });
        case 'due-date':
          return list.sort(function (a, b) {
            // Tasks without due date are placed last
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
          });
        case 'manual':
        default:
          return list;
      }
    }

    function searchTasks(taskList, query) {
      const list = taskList || [];
      if (!query || !query.trim()) return list;
      const q = query.trim().toLowerCase();
      return list.filter(function (t) {
        return (t.title || '').toLowerCase().includes(q);
      });
    }

    function calculateStats(taskList) {
      const list = taskList || [];
      const total = list.length;
      const completed = list.filter(function (t) { return t.completed; }).length;
      const active = total - completed;
      const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
      return {
        total: total,
        active: active,
        completed: completed,
        percent: percent
      };
    }

    function loadFromStorage() {
      const loaded = Storage.load(Storage.KEYS.TASKS, []);
      tasks = Array.isArray(loaded) ? loaded : [];
    }

    function saveToStorage() {
      Storage.save(Storage.KEYS.TASKS, tasks);
    }

    function renderStats() {
      const stats = calculateStats(tasks);
      if (statTotalEl) statTotalEl.textContent = String(stats.total);
      if (statActiveEl) statActiveEl.textContent = String(stats.active);
      if (statCompletedEl) statCompletedEl.textContent = String(stats.completed);
      if (statPercentEl) statPercentEl.textContent = stats.percent + '%';

      // Empty / All-complete state messages
      if (tasks.length === 0) {
        if (emptyStateEl) emptyStateEl.hidden = false;
        if (allCompleteStateEl) allCompleteStateEl.hidden = true;
      } else if (stats.active === 0) {
        if (emptyStateEl) emptyStateEl.hidden = true;
        if (allCompleteStateEl) allCompleteStateEl.hidden = false;
      } else {
        if (emptyStateEl) emptyStateEl.hidden = true;
        if (allCompleteStateEl) allCompleteStateEl.hidden = true;
      }
    }

    function renderList() {
      if (!listEl) return;
      listEl.innerHTML = '';

      // Pipeline: Filter -> Search -> Sort
      const filtered = filterTasks(tasks, currentFilter);
      const searched = searchTasks(filtered, searchQuery);
      const sorted = sortTasks(searched, currentSort);

      const todayStr = getTodayString();

      sorted.forEach(function (task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.dataset.id = task.id;

        if (task.completed) {
          li.classList.add('task-item--completed');
        }
        if (isOverdue(task, todayStr)) {
          li.classList.add('task-item--overdue');
        }

        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'task-item__check';
        checkbox.checked = !!task.completed;
        checkbox.setAttribute('aria-label', 'Mark task complete');
        checkbox.dataset.action = 'toggle';

        // Body
        const bodyDiv = document.createElement('div');
        bodyDiv.className = 'task-item__body';

        // Title span (SAFE: textContent only, no innerHTML!)
        const titleSpan = document.createElement('span');
        titleSpan.className = 'task-item__title';
        titleSpan.textContent = task.title;

        // Meta div
        const metaDiv = document.createElement('div');
        metaDiv.className = 'task-item__meta';

        // Priority badge
        const priorityBadge = document.createElement('span');
        priorityBadge.className =
          'task-item__priority task-item__priority--' + (task.priority || 'medium');
        priorityBadge.textContent =
          (task.priority || 'medium').charAt(0).toUpperCase() +
          (task.priority || 'medium').slice(1);

        // Category badge
        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'task-item__category';
        categoryBadge.textContent = task.category || 'Personal';

        metaDiv.appendChild(priorityBadge);
        metaDiv.appendChild(categoryBadge);

        // Due date badge if present
        if (task.dueDate) {
          const dueSpan = document.createElement('span');
          dueSpan.className = 'task-item__due';
          const overdue = isOverdue(task, todayStr);
          dueSpan.textContent = (overdue ? 'Overdue: ' : 'Due: ') + task.dueDate;
          metaDiv.appendChild(dueSpan);
        }

        bodyDiv.appendChild(titleSpan);
        bodyDiv.appendChild(metaDiv);

        // Actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'task-item__actions';

        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'task-item__btn task-item__btn--edit';
        editBtn.setAttribute('aria-label', 'Edit task');
        editBtn.dataset.action = 'edit';
        editBtn.textContent = '✎';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'task-item__btn task-item__btn--delete';
        deleteBtn.setAttribute('aria-label', 'Delete task');
        deleteBtn.dataset.action = 'delete';
        deleteBtn.textContent = '✕';

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(checkbox);
        li.appendChild(bodyDiv);
        li.appendChild(actionsDiv);

        listEl.appendChild(li);
      });

      renderStats();
    }

    function addTask(params) {
      const title = (params.title || '').trim();
      if (!title) return null;

      if (isDuplicateTitle(tasks, title)) {
        alert('A task with this title already exists.');
        return null;
      }

      const newTask = createTask(params);
      tasks.push(newTask);
      saveToStorage();
      renderList();
      return newTask;
    }

    function toggleTask(id) {
      const task = tasks.find(function (t) { return t.id === id; });
      if (!task) return;
      task.completed = !task.completed;
      task.updatedAt = Date.now();
      saveToStorage();
      renderList();
    }

    function deleteTask(id) {
      tasks = tasks.filter(function (t) { return t.id !== id; });
      saveToStorage();
      renderList();
    }

    function updateTaskTitle(id, newTitle) {
      const trimmed = (newTitle || '').trim();
      if (!trimmed) return false;

      if (isDuplicateTitle(tasks, trimmed, id)) {
        alert('A task with this title already exists.');
        return false;
      }

      const task = tasks.find(function (t) { return t.id === id; });
      if (!task) return false;

      task.title = trimmed;
      task.updatedAt = Date.now();
      saveToStorage();
      renderList();
      return true;
    }

    function startInlineEdit(taskItemEl, taskId) {
      const task = tasks.find(function (t) { return t.id === taskId; });
      if (!task) return;

      const bodyDiv = taskItemEl.querySelector('.task-item__body');
      const titleSpan = taskItemEl.querySelector('.task-item__title');
      if (!bodyDiv || !titleSpan) return;

      const originalTitle = task.title;

      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.className = 'task-item__edit-input';
      editInput.value = originalTitle;
      editInput.maxLength = 200;
      editInput.setAttribute('aria-label', 'Edit task title');

      bodyDiv.replaceChild(editInput, titleSpan);
      editInput.focus();
      editInput.select();

      let isFinished = false;

      function finishEdit(saveChanges) {
        if (isFinished) return;
        isFinished = true;

        if (saveChanges) {
          const newTitle = editInput.value.trim();
          if (newTitle && newTitle !== originalTitle) {
            const success = updateTaskTitle(taskId, newTitle);
            if (!success) {
              renderList();
            }
            return;
          }
        }
        renderList();
      }

      editInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          finishEdit(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finishEdit(false);
        }
      });

      editInput.addEventListener('blur', function () {
        finishEdit(true);
      });
    }

    function handleListClick(e) {
      const target = e.target;
      const action = target.dataset.action;
      const itemEl = target.closest('.task-item');
      if (!itemEl) return;
      const taskId = itemEl.dataset.id;

      if (action === 'toggle' || target.type === 'checkbox') {
        toggleTask(taskId);
      } else if (action === 'delete') {
        deleteTask(taskId);
      } else if (action === 'edit') {
        startInlineEdit(itemEl, taskId);
      }
    }

    function init() {
      formEl = document.getElementById('task-form');
      titleInput = document.getElementById('task-title');
      prioritySelect = document.getElementById('task-priority');
      categorySelect = document.getElementById('task-category');
      dueDateInput = document.getElementById('task-due-date');
      filterSelect = document.getElementById('task-filter');
      sortSelect = document.getElementById('task-sort');
      searchInput = document.getElementById('task-search');
      listEl = document.getElementById('task-list');
      emptyStateEl = document.getElementById('task-empty-state');
      allCompleteStateEl = document.getElementById('task-all-complete-state');
      statTotalEl = document.getElementById('stat-total');
      statActiveEl = document.getElementById('stat-active');
      statCompletedEl = document.getElementById('stat-completed');
      statPercentEl = document.getElementById('stat-percent');

      loadFromStorage();

      if (formEl) {
        formEl.addEventListener('submit', function (e) {
          e.preventDefault();
          if (!titleInput) return;
          const added = addTask({
            title: titleInput.value,
            priority: prioritySelect ? prioritySelect.value : 'medium',
            category: categorySelect ? categorySelect.value : 'Personal',
            dueDate: dueDateInput ? dueDateInput.value : null
          });
          if (added) {
            titleInput.value = '';
            if (dueDateInput) dueDateInput.value = '';
            if (prioritySelect) prioritySelect.value = 'medium';
            if (categorySelect) categorySelect.value = 'Personal';
            titleInput.focus();
          }
        });
      }

      if (filterSelect) {
        filterSelect.addEventListener('change', function () {
          currentFilter = filterSelect.value;
          renderList();
        });
      }

      if (sortSelect) {
        sortSelect.addEventListener('change', function () {
          currentSort = sortSelect.value;
          renderList();
        });
      }

      if (searchInput) {
        searchInput.addEventListener('input', function () {
          searchQuery = searchInput.value;
          renderList();
        });
      }

      if (listEl) {
        listEl.addEventListener('click', handleListClick);
      }

      renderList();
    }

    return {
      init: init,
      addTask: addTask,
      toggleTask: toggleTask,
      deleteTask: deleteTask,
      updateTaskTitle: updateTaskTitle,
      getTasks: function () { return tasks.slice(); },
      setTasks: function (newTasks) {
        tasks = (newTasks || []).slice();
        saveToStorage();
        renderList();
      },
      normalizeTitle: normalizeTitle,
      isDuplicateTitle: isDuplicateTitle,
      createTask: createTask,
      filterTasks: filterTasks,
      sortTasks: sortTasks,
      searchTasks: searchTasks,
      calculateStats: calculateStats,
      isOverdue: isOverdue
    };
  })();

  // =========================================================================
  // Module 6: Quick Links Manager
  // =========================================================================
  const QuickLinksManager = (function () {
    const DEFAULT_LINKS = [
      { id: 'default-1', title: 'Google', url: 'https://www.google.com' },
      { id: 'default-2', title: 'YouTube', url: 'https://www.youtube.com' },
      { id: 'default-3', title: 'GitHub', url: 'https://github.com' },
      { id: 'default-4', title: 'Gmail', url: 'https://mail.google.com' },
      { id: 'default-5', title: 'Notion', url: 'https://www.notion.so' }
    ];

    let links = [];

    let formEl = null;
    let titleInput = null;
    let urlInput = null;
    let errorEl = null;
    let listEl = null;

    /**
     * Strict URL validation: accepts only http: and https: protocols via URL constructor.
     * Rejects javascript:, data:, file:, or protocol-less inputs.
     */
    function isValidUrl(input) {
      if (!input || typeof input !== 'string') return false;
      const trimmed = input.trim();
      if (!trimmed) return false;
      try {
        const u = new URL(trimmed);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch (e) {
        return false;
      }
    }

    function loadFromStorage() {
      // Seed default links ONLY when storage key is absent!
      const stored = Storage.load(Storage.KEYS.QUICK_LINKS, null);
      if (stored === null) {
        links = DEFAULT_LINKS.slice();
        Storage.save(Storage.KEYS.QUICK_LINKS, links);
      } else {
        links = Array.isArray(stored) ? stored : [];
      }
    }

    function saveToStorage() {
      Storage.save(Storage.KEYS.QUICK_LINKS, links);
    }

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    function clearError() {
      if (!errorEl) return;
      errorEl.textContent = '';
      errorEl.hidden = true;
    }

    function renderList() {
      if (!listEl) return;
      listEl.innerHTML = '';

      links.forEach(function (link) {
        const li = document.createElement('li');
        li.className = 'link-item';
        li.dataset.id = link.id;

        // Anchor wrapper opening in new tab safely
        const anchor = document.createElement('a');
        anchor.className = 'link-item__link';
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'link-item__title';
        titleSpan.textContent = link.title;

        const urlSpan = document.createElement('span');
        urlSpan.className = 'link-item__url';
        urlSpan.textContent = link.url;

        anchor.appendChild(titleSpan);
        anchor.appendChild(urlSpan);

        // Action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'link-item__actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'link-item__btn link-item__btn--delete';
        deleteBtn.setAttribute('aria-label', 'Delete quick link ' + link.title);
        deleteBtn.dataset.action = 'delete';
        deleteBtn.textContent = '✕';

        actionsDiv.appendChild(deleteBtn);

        li.appendChild(anchor);
        li.appendChild(actionsDiv);
        listEl.appendChild(li);
      });
    }

    function addLink(title, url) {
      clearError();
      const trimmedTitle = (title || '').trim();
      const trimmedUrl = (url || '').trim();

      if (!trimmedTitle) {
        showError('Please provide a title for the shortcut.');
        return null;
      }

      if (!isValidUrl(trimmedUrl)) {
        showError('Please enter a valid URL starting with http:// or https://');
        return null;
      }

      const newLink = {
        id: Storage.generateId(),
        title: trimmedTitle,
        url: trimmedUrl
      };

      links.push(newLink);
      saveToStorage();
      renderList();
      return newLink;
    }

    function deleteLink(id) {
      links = links.filter(function (l) { return l.id !== id; });
      saveToStorage();
      renderList();
    }

    function handleListClick(e) {
      const target = e.target;
      if (target.dataset.action === 'delete') {
        const itemEl = target.closest('.link-item');
        if (itemEl && itemEl.dataset.id) {
          deleteLink(itemEl.dataset.id);
        }
      }
    }

    function init() {
      formEl = document.getElementById('quick-link-form');
      titleInput = document.getElementById('link-title');
      urlInput = document.getElementById('link-url');
      errorEl = document.getElementById('link-error');
      listEl = document.getElementById('links-list');

      loadFromStorage();

      if (formEl) {
        formEl.addEventListener('submit', function (e) {
          e.preventDefault();
          if (!titleInput || !urlInput) return;
          const added = addLink(titleInput.value, urlInput.value);
          if (added) {
            titleInput.value = '';
            urlInput.value = '';
            clearError();
            titleInput.focus();
          }
        });
      }

      if (listEl) {
        listEl.addEventListener('click', handleListClick);
      }

      renderList();
    }

    return {
      init: init,
      isValidUrl: isValidUrl,
      addLink: addLink,
      deleteLink: deleteLink,
      getLinks: function () { return links.slice(); },
      setLinks: function (newLinks) {
        links = (newLinks || []).slice();
        saveToStorage();
        renderList();
      },
      DEFAULT_LINKS: DEFAULT_LINKS
    };
  })();

  // =========================================================================
  // Module 7: Application Bootstrap
  // =========================================================================
  const App = (function () {
    let initialized = false;

    function bootstrap() {
      if (initialized) return;
      initialized = true;

      ThemeController.init();
      ClockGreeting.init();
      PomodoroTimer.init();
      TaskManager.init();
      QuickLinksManager.init();
    }

    return {
      bootstrap: bootstrap
    };
  })();

  // Expose namespace for testing and verification
  const LifeDashboard = {
    Storage: Storage,
    ThemeController: ThemeController,
    ClockGreeting: ClockGreeting,
    PomodoroTimer: PomodoroTimer,
    TaskManager: TaskManager,
    QuickLinksManager: QuickLinksManager,
    App: App
  };

  window.LifeDashboard = LifeDashboard;

  // Auto-bootstrap on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.bootstrap);
  } else {
    App.bootstrap();
  }

})(window, document);
