<script setup>
import { computed, ref } from 'vue';

const newTodo = ref('');
const filter = ref('all');
let nextId = 3;

const todos = ref([
  { id: 1, text: 'Set up the project', completed: true },
  { id: 2, text: 'Build the todo app UI', completed: false }
]);

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

function addTodo() {
  const text = newTodo.value.trim();
  if (!text) {
    return;
  }

  todos.value.unshift({
    id: nextId,
    text,
    completed: false
  });
  nextId += 1;
  newTodo.value = '';
}

function removeTodo(id) {
  todos.value = todos.value.filter((todo) => todo.id !== id);
}

function clearCompleted() {
  todos.value = todos.value.filter((todo) => !todo.completed);
}
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

      <ul v-if="todos.length" class="todo-list">
        <li v-for="todo in filteredTodos" :key="todo.id" class="todo-item">
          <label>
            <input v-model="todo.completed" type="checkbox">
            <span :class="{ done: todo.completed }">{{ todo.text }}</span>
          </label>
          <button class="delete" type="button" @click="removeTodo(todo.id)">Remove</button>
        </li>
      </ul>

      <p v-else class="empty">No todos yet. Add one above.</p>

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


