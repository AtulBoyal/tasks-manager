import { useEffect, useRef } from 'react';
import { getLocalDateString } from '../utils/formatters';
import { reopenDates } from '../utils/recurrence';

// Re-opens completed recurring tasks once per day (per user, per device).
export const useRecurringTasks = ({
  tasks,
  editTask,
  userId,
  hasLoaded
}) => {
  const isRunning = useRef(false);

  useEffect(() => {
    if (!userId || !hasLoaded || isRunning.current) return;

    const todayStr = getLocalDateString();
    const resetKey = `last_habit_reset_${userId}`;

    if (localStorage.getItem(resetKey) === todayStr) return;

    const dueForReset = tasks.filter(task => {
      if (!task.completed || !task.recurrence || task.recurrence === 'none') {
        return false;
      }
      if (!task.completion_date) return false;

      const completedOn = getLocalDateString(new Date(task.completion_date));
      return completedOn !== todayStr;
    });

    if (dueForReset.length === 0) {
      localStorage.setItem(resetKey, todayStr);
      return;
    }

    isRunning.current = true;

    (async () => {
      const results = await Promise.allSettled(
        dueForReset.map(task =>
          editTask(task.id, {
            completed: false,
            completion_date: null,
            // Next occurrence per the task's rule, skipping missed ones
            ...reopenDates(task, new Date()),
            subtasks: (task.subtasks || []).map(st => ({
              ...st,
              completed: false
            }))
          })
        )
      );

      const failed = results.filter(r => r.status === 'rejected');
      failed.forEach(r => console.error('Recurring task update failed:', r.reason));

      // Only mark today as done if everything succeeded, so failures retry.
      if (failed.length === 0) {
        localStorage.setItem(resetKey, todayStr);
      }

      isRunning.current = false;
    })();
  }, [tasks, editTask, userId, hasLoaded]);
};
