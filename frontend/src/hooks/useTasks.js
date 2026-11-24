import { useState, useEffect, useCallback } from 'react';
import { taskService } from '../services/taskService';

export const IMPORT_BATCH_SIZE = 500;

// Insert or replace a task by id (realtime events and local writes can race).
const upsertById = (list, task) =>
  list.some(t => t.id === task.id)
    ? list.map(t => (t.id === task.id ? task : t))
    : [...list, task];

// Used inside TaskProvider, which only mounts while the vault is unlocked.
export const useTasks = (userId) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  // True once the first fetch for this user has succeeded. Effects that
  // compare against existing tasks (dedupe, recurrence) must wait for it.
  const [hasLoaded, setHasLoaded] = useState(false);

  // FETCH TASKS
  const fetchTasks = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const data = await taskService.fetchTasks(userId);

      setTasks(data || []);
      setHasLoaded(true);
    } catch (error) {
      console.error("Fetch tasks failed:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // CREATE
  const addTask = useCallback(async (task) => {
    const created = await taskService.createTask(task);

    setTasks(prev => upsertById(prev, created));

    return created;
  }, []);

  // UPDATE
  const editTask = useCallback(async (taskId, updates) => {
    const updated = await taskService.updateTask(taskId, updates);

    setTasks(prev =>
      prev.map(t => t.id === taskId ? updated : t)
    );

    return updated;
  }, []);

  // BULK CREATE (import). Inserts in batches; if a batch fails, the error
  // carries importedCount so the caller can report partial progress.
  const importTasks = useCallback(async (newTasks) => {
    const created = [];

    for (let i = 0; i < newTasks.length; i += IMPORT_BATCH_SIZE) {
      try {
        const batch = await taskService.createTasks(newTasks.slice(i, i + IMPORT_BATCH_SIZE));
        created.push(...batch);
        setTasks(prev => batch.reduce(upsertById, prev));
      } catch (error) {
        error.importedCount = created.length;
        throw error;
      }
    }

    return created;
  }, []);

  // DELETE
  const removeTask = useCallback(async (taskId) => {
    await taskService.deleteTask(taskId);

    setTasks(prev =>
      prev.filter(t => t.id !== taskId)
    );
  }, []);

  // Start fresh whenever the user changes, then fetch their tasks
  useEffect(() => {
    setTasks([]);
    setHasLoaded(false);

    if (userId) {
      fetchTasks();
    }
  }, [fetchTasks, userId]);

  return {
    tasks,
    setTasks,
    loading,
    hasLoaded,
    fetchTasks,
    addTask,
    importTasks,
    editTask,
    removeTask
  };
};
