<script setup>
import { computed, onMounted, ref } from 'vue';

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

      <ul v-else-if="filteredTodos.length" class="todo-list">
        <li v-for="todo in filteredTodos" :key="todo.id" class="todo-item">
          <label>
            <input :checked="todo.completed" type="checkbox" @change="toggleTodo(todo)">
            <span :class="{ done: todo.completed }">{{ todo.text }}</span>
          </label>
          <button class="delete" type="button" @click="removeTodo(todo.id)">Remove</button>
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
</template>


