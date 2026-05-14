import { useState, useEffect, useCallback } from 'react';
import { taskService } from '../services/taskService';
import { supabase } from '../supabaseClient';

export const useTasks = (userId, isUnlocked) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // FETCH TASKS
  const fetchTasks = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const data = await taskService.fetchTasks(userId);

      setTasks(data || []);
    } catch (error) {
      console.error("Fetch tasks failed:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // CREATE
  const addTask = useCallback(async (task) => {
    const created = await taskService.createTask(task);

    setTasks(prev => [...prev, created]);

    return created;
  });

  // UPDATE
  const editTask = async (taskId, updates) => {
    const updated = await taskService.updateTask(taskId, updates);

    setTasks(prev =>
      prev.map(t => t.id === taskId ? updated : t)
    );

    return updated;
  };

  // DELETE
  const removeTask = async (taskId) => {
    await taskService.deleteTask(taskId);

    setTasks(prev =>
      prev.filter(t => t.id !== taskId)
    );
  };

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
    fetchTasks,
    addTask,
    editTask,
    removeTask
  };
};