import { useEffect } from 'react';

export const useRecurringTasks = ({
  tasks,
  setTasks,
  editTask
}) => {

  useEffect(() => {

    if (tasks.length === 0) return;

    const todayStr = new Date()
      .toISOString()
      .split('T')[0];

    const lastReset =
      localStorage.getItem('last_habit_reset');

    if (lastReset === todayStr) return;

    const processRecurringTasks = async () => {

      let updatedAny = false;

      const updatedTasks = await Promise.all(
        tasks.map(async (task) => {

          if (
            !task.completed ||
            !task.recurrence ||
            task.recurrence === 'none'
          ) {
            return task;
          }

          const completionDate =
            task.completion_date
              ? task.completion_date.split('T')[0]
              : null;

          if (
            !completionDate ||
            completionDate === todayStr
          ) {
            return task;
          }

          updatedAny = true;

          let newDeadline =
            task.last_date
              ? new Date(task.last_date)
              : null;

          let newStartDate =
            task.start_date
              ? new Date(task.start_date)
              : null;

          if (task.recurrence === 'daily') {

            if (newDeadline) {
              newDeadline = new Date();
            }

            if (newStartDate) {
              newStartDate = new Date();
            }

          } else if (task.recurrence === 'weekly') {

            if (newDeadline) {
              newDeadline.setDate(
                newDeadline.getDate() + 7
              );
            }

            if (newStartDate) {
              newStartDate.setDate(
                newStartDate.getDate() + 7
              );
            }

          } else if (task.recurrence === 'monthly') {

            if (newDeadline) {
              newDeadline.setMonth(
                newDeadline.getMonth() + 1
              );
            }

            if (newStartDate) {
              newStartDate.setMonth(
                newStartDate.getMonth() + 1
              );
            }

          }

          const updatedTask = {
            ...task,
            completed: false,
            completion_date: null,

            last_date: newDeadline
              ? newDeadline.toISOString().split('T')[0]
              : null,

            start_date: newStartDate
              ? newStartDate.toISOString().split('T')[0]
              : null,

            subtasks: task.subtasks
              ? task.subtasks.map(st => ({
                  ...st,
                  completed: false
                }))
              : []
          };

          try {
            await editTask(task.id, updatedTask);
          } catch (error) {
            console.error(
              'Recurring task update failed:',
              error
            );
          }

          return updatedTask;
        })
      );

      if (updatedAny) {
        setTasks(updatedTasks);
      }

      localStorage.setItem(
        'last_habit_reset',
        todayStr
      );
    };

    processRecurringTasks();

  }, [tasks, setTasks, editTask]);

};