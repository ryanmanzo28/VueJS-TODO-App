<script setup>
import { computed, onMounted, ref } from 'vue';
import { useNotifications } from './composables/useNotifications.js';

const newTodo = ref('');
const filter = ref('all');
const todos = ref([]);
const isLoading = ref(true);
const loadError = ref('');

async function requestTodos(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  if (!response.ok) {
    throw new Error('Unable to save tasks right now.');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function loadTodos() {
  isLoading.value = true;
  loadError.value = '';

  try {
    todos.value = await requestTodos('/api/tasks');
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to load tasks.';
  } finally {
    isLoading.value = false;
  }
}

async function addTodo() {
  const text = newTodo.value.trim();
  if (!text) {
    return;
  }

  try {
    await requestTodos('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
    newTodo.value = '';
    await loadTodos();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to add task.';
  }
}

async function toggleTodo(todo) {
  try {
    await requestTodos(`/api/tasks/${todo.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !todo.completed })
    });
    await loadTodos();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to update task.';
  }
}

async function removeTodo(id) {
  try {
    await requestTodos(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
    await loadTodos();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to remove task.';
  }
}

async function clearCompleted() {
  try {
    await requestTodos('/api/tasks/completed', {
      method: 'DELETE'
    });
    await loadTodos();
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Unable to clear completed tasks.';
  }
}

onMounted(loadTodos);

const activeCount = computed(() =>
  todos.value.filter((todo) => !todo.completed).length
);

const completedCount = computed(() =>
  todos.value.filter((todo) => todo.completed).length
);

const filteredTodos = computed(() => {
  if (filter.value === 'active') {
    return todos.value.filter((todo) => !todo.completed);
  }

  if (filter.value === 'completed') {
    return todos.value.filter((todo) => todo.completed);
  }

  return todos.value;
});

const remainingLabel = computed(() =>
  activeCount.value === 1 ? 'item left' : 'items left'
);

const emptyLabel = computed(() => {
  if (!todos.value.length) {
    return 'No todos yet. Add one above.';
  }

  return 'No tasks match this filter.';
});

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

const {
  notifications,
  dismissNotification,
  clearAllNotifications,
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  requestPushPermission,
  sendPushNotification,
} = useNotifications();

// ---------------------------------------------------------------------------
// Alarms  (in-memory; keyed by task id)
// ---------------------------------------------------------------------------

const alarms = ref({});       // { [todoId]: { time: string, timerId: number } }
const alarmInputs = ref({});  // { [todoId]: string }  – draft input per card
const alarmPanelOpen = ref({}); // { [todoId]: boolean }

function toggleAlarmPanel(todoId) {
  alarmPanelOpen.value[todoId] = !alarmPanelOpen.value[todoId];

  // Pre-fill input with existing alarm time when opening the panel
  if (alarmPanelOpen.value[todoId] && alarms.value[todoId]) {
    alarmInputs.value[todoId] = alarms.value[todoId].time;
  }
}

function setAlarm(todo) {
  const time = alarmInputs.value[todo.id];
  if (!time) return;

  const delay = new Date(time).getTime() - Date.now();

  if (delay <= 0) {
    notifyWarning('Pick a time in the future.');
    return;
  }

  // Clear any previous alarm for this task
  cancelAlarm(todo.id);

  const timerId = setTimeout(() => {
    notifySuccess(`Reminder: "${todo.text}"`, { title: '⏰ Task Alarm', duration: 0 });
    sendPushNotification('⏰ Task Alarm', `Reminder: "${todo.text}"`);
    delete alarms.value[todo.id];
  }, delay);

  alarms.value[todo.id] = { time, timerId };
  alarmPanelOpen.value[todo.id] = false;
  notifyInfo(`Alarm set for "${todo.text}".`);
}

function cancelAlarm(todoId) {
  if (alarms.value[todoId]) {
    clearTimeout(alarms.value[todoId].timerId);
    delete alarms.value[todoId];
  }
}

function formatAlarmTime(isoString) {
  return new Date(isoString).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Minimum datetime-local value (now, rounded to the current minute)
const alarmMin = computed(() => new Date(Date.now() - (Date.now() % 60000)).toISOString().slice(0, 16));
</script>

<template>
  <main class="todo-app">
    <section class="todo-card">
      <h1>Todo App</h1>

      <form class="todo-form" @submit.prevent="addTodo">
        <input
          v-model="newTodo"
          type="text"
          placeholder="Add a task"
          aria-label="New todo"
        >
        <button type="submit">Add</button>
      </form>

      <p v-if="loadError" class="error">{{ loadError }}</p>

      <p v-if="isLoading" class="empty">Loading tasks...</p>

      <ul v-else-if="filteredTodos.length" class="task-list">
        <li
          v-for="todo in filteredTodos"
          :key="todo.id"
          class="task-card-item"
          :class="{ 'task-card-done': todo.completed }"
        >
          <!-- Card header: checkbox + title + action buttons -->
          <div class="task-card-header">
            <label class="task-card-label">
              <input :checked="todo.completed" type="checkbox" @change="toggleTodo(todo)">
              <span :class="{ done: todo.completed }">{{ todo.text }}</span>
            </label>

            <div class="task-card-actions">
              <span
                v-if="alarms[todo.id]"
                class="task-alarm-badge"
                :title="`Alarm: ${formatAlarmTime(alarms[todo.id].time)}`"
              >
                ⏰ {{ formatAlarmTime(alarms[todo.id].time) }}
              </span>

              <button
                class="task-btn-alarm"
                type="button"
                :class="{ 'task-btn-alarm-active': alarmPanelOpen[todo.id] }"
                :aria-label="alarmPanelOpen[todo.id] ? 'Close alarm panel' : 'Set alarm'"
                @click="toggleAlarmPanel(todo.id)"
              >
                🔔
              </button>

              <button class="task-btn-remove" type="button" @click="removeTodo(todo.id)">
                Remove
              </button>
            </div>
          </div>

          <!-- Expandable alarm row -->
          <div v-if="alarmPanelOpen[todo.id]" class="task-alarm-row">
            <input
              v-model="alarmInputs[todo.id]"
              type="datetime-local"
              class="task-alarm-input"
              :min="alarmMin"
            >
            <button type="button" @click="setAlarm(todo)">Set alarm</button>
            <button
              v-if="alarms[todo.id]"
              class="task-alarm-cancel"
              type="button"
              @click="cancelAlarm(todo.id)"
            >
              Cancel alarm
            </button>
          </div>
        </li>
      </ul>

      <p v-else class="empty">{{ emptyLabel }}</p>

      <footer class="todo-footer">
        <span>{{ activeCount }} {{ remainingLabel }}</span>

        <div class="filters">
          <button
            type="button"
            :class="{ active: filter === 'all' }"
            @click="filter = 'all'"
          >
            All
          </button>
          <button
            type="button"
            :class="{ active: filter === 'active' }"
            @click="filter = 'active'"
          >
            Active
          </button>
          <button
            type="button"
            :class="{ active: filter === 'completed' }"
            @click="filter = 'completed'"
          >
            Completed
          </button>
        </div>

        <button
          class="clear"
          type="button"
          :disabled="completedCount === 0"
          @click="clearCompleted"
        >
          Clear completed
        </button>
      </footer>
    </section>
  </main>

  <!-- ── Notification tray ─────────────────────────────────────────────── -->
  <Teleport to="body">
    <div class="notif-tray" role="region" aria-label="Notifications" aria-live="polite">
      <div
        v-for="notif in notifications"
        :key="notif.id"
        class="notif-item"
        :class="`notif-${notif.type}`"
        role="alert"
      >
        <div class="notif-body">
          <strong v-if="notif.title" class="notif-title">{{ notif.title }}</strong>
          <span>{{ notif.message }}</span>
        </div>
        <button
          v-if="notif.dismissible"
          class="notif-close"
          type="button"
          aria-label="Dismiss notification"
          @click="dismissNotification(notif.id)"
        >
          ✕
        </button>
      </div>

      <button
        v-if="notifications.length > 1"
        class="notif-clear-all"
        type="button"
        @click="clearAllNotifications"
      >
        Clear all
      </button>
    </div>
  </Teleport>
</template>


