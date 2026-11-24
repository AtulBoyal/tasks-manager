import { createContext, useContext } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useTaskActions } from '../hooks/useTaskActions';
import { useTaskForm } from '../hooks/useTaskForm';
import { useRealtimeTasks } from '../hooks/useRealtimeTasks';
import { useRecurringTasks } from '../hooks/useRecurringTasks';
import { useCodeforcesSync } from '../hooks/useCodeforcesSync';

const TaskContext = createContext(null);

// Owns the signed-in user's task data and everything that keeps it in sync.
// Rendered only while the vault is unlocked, so locking unmounts it and
// drops tasks from memory; unlocking fetches them again.
export function TaskProvider({ userId, codeforcesSync = false, children }) {
  const {
    tasks,
    setTasks,
    loading,
    hasLoaded,
    addTask,
    editTask,
    removeTask
  } = useTasks(userId);

  const actions = useTaskActions({ tasks, setTasks, addTask, editTask, removeTask, userId });
  const form = useTaskForm({ userId, addTask, editTask });

  useRealtimeTasks({ setTasks, userId });
  useRecurringTasks({ tasks, editTask, userId, hasLoaded });
  useCodeforcesSync({ enabled: codeforcesSync, userId, tasks, hasLoaded, addTask });

  const value = {
    tasks,
    loading,
    hasLoaded,
    ...actions,
    form
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTaskContext must be used inside <TaskProvider>');
  }
  return context;
}
