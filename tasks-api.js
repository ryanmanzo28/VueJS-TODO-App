import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const tasksFilePath = fileURLToPath(new URL('./data/tasks.json', import.meta.url));
// seed tasks are deprecated ill remove them wheni finish with all the other stuff but for now just dont use them
const seedTasks = [
  
];
// removed seed tasks but ill keep the code here for now in case i want to add it back or theres a breaking issue but dont use it

async function ensureTasksFile() {
  try {
    await fs.access(tasksFilePath);
  } catch {
    await fs.mkdir(dirname(tasksFilePath), { recursive: true });
    await fs.writeFile(tasksFilePath, `${JSON.stringify(seedTasks, null, 2)}\n`);
  }
}

async function readTasks() {
  await ensureTasksFile();
  const rawTasks = await fs.readFile(tasksFilePath, 'utf8');
  const parsedTasks = JSON.parse(rawTasks);

  return Array.isArray(parsedTasks) ? parsedTasks : [];
}

async function writeTasks(tasks) {
  await fs.mkdir(dirname(tasksFilePath), { recursive: true });
  await fs.writeFile(tasksFilePath, `${JSON.stringify(tasks, null, 2)}\n`);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    req.on('data', (chunk) => {
      rawBody += chunk;

      if (rawBody.length > 1_000_000) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });

    req.on('error', reject);
  });
}

async function handleTasksRequest(req, res) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const pathParts = requestUrl.pathname.split('/').filter(Boolean);

  if (pathParts[0] !== 'api' || pathParts[1] !== 'tasks') {
    return false;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  try {
    const tasks = await readTasks();

    if (requestUrl.pathname === '/api/tasks' && req.method === 'GET') {
      const user = requestUrl.searchParams.get('user');
      const result = user ? tasks.filter((t) => t.user === user) : tasks;
      sendJson(res, 200, result);
      return true;
    }

    if (requestUrl.pathname === '/api/tasks' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const text = String(body.text ?? '').trim();

      if (!text) {
        sendJson(res, 400, { message: 'Task text is required.' });
        return true;
      }

      const newTask = {
        id: randomUUID(),
        user: String(body.user ?? ''),
        text,
        completed: false
      };

      tasks.unshift(newTask);
      await writeTasks(tasks);
      sendJson(res, 201, newTask);
      return true;
    }

    if (requestUrl.pathname === '/api/tasks/completed' && req.method === 'DELETE') {
      const user = requestUrl.searchParams.get('user');
      const remainingTasks = user
        ? tasks.filter((task) => !(task.completed && task.user === user))
        : tasks.filter((task) => !task.completed);
      await writeTasks(remainingTasks);
      res.statusCode = 204;
      res.end();
      return true;
    }

    if (pathParts.length === 3) {
      const taskId = pathParts[2];
      const taskIndex = tasks.findIndex((task) => task.id === taskId);

      if (taskIndex === -1) {
        sendJson(res, 404, { message: 'Task not found.' });
        return true;
      }

      if (req.method === 'PATCH') {
        const body = await readJsonBody(req);
        const updatedTask = {
          ...tasks[taskIndex],
          ...body,
          completed: Boolean(body.completed ?? tasks[taskIndex].completed)
        };

        tasks[taskIndex] = updatedTask;
        await writeTasks(tasks);
        sendJson(res, 200, updatedTask);
        return true;
      }

      if (req.method === 'DELETE') {
        tasks.splice(taskIndex, 1);
        await writeTasks(tasks);
        res.statusCode = 204;
        res.end();
        return true;
      }
    }

    sendJson(res, 405, { message: 'Method not allowed.' });
    return true;
  } catch (error) {
    sendJson(res, 500, {
      message: error instanceof Error ? error.message : 'Unexpected server error.'
    });
    return true;
  }
}

export function createTasksApiPlugin() {
  return {
    name: 'tasks-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handleTasksRequest(req, res);

        if (!handled) {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handled = await handleTasksRequest(req, res);

        if (!handled) {
          next();
        }
      });
    }
  };
}
