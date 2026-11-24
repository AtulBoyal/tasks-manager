import { useState, useEffect, useCallback } from 'react';
import { taskService } from '../services/taskService';

// Insert or replace a task by id (realtime events and local writes can race).
const upsertById = (list, task) =>
  list.some(t => t.id === task.id)
    ? list.map(t => (t.id === task.id ? task : t))
    : [...list, task];

export const useTasks = (userId, isUnlocked) => {
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

  // DELETE
  const removeTask = useCallback(async (taskId) => {
    await taskService.deleteTask(taskId);

    setTasks(prev =>
      prev.filter(t => t.id !== taskId)
    );
  }, []);

  // Drop tasks from memory when the user changes or the vault locks;
  // they are fetched again on unlock.
  useEffect(() => {
    setTasks([]);
    setHasLoaded(false);
  }, [userId, isUnlocked]);

  // INITIAL FETCH
  useEffect(() => {
    if (isUnlocked && userId) {
      fetchTasks();
    }
  }, [fetchTasks, isUnlocked, userId]);

  return {
    tasks,
    setTasks,
    loading,
    hasLoaded,
    fetchTasks,
    addTask,
    editTask,
    removeTask
  };
};
