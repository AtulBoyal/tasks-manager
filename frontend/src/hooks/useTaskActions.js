import { createElement } from "react";
import toast from "react-hot-toast";
import UndoToast from "../components/UndoToast";
import { generateAutoTags } from "../utils/tagEngine";
import { parseQuickAdd } from "../utils/quickAddParser";

export const UNDO_TOAST_DURATION_MS = 6000;

// "Task deleted · Undo" — onUndo runs if the user clicks Undo in time
const showUndoToast = (message, onUndo, icon) =>
  toast(
    (t) => createElement(UndoToast, { toastId: t.id, message, onUndo }),
    { duration: UNDO_TOAST_DURATION_MS, icon }
  );

export const useTaskActions = ({
  tasks,
  setTasks,
  addTask,
  editTask,
  removeTask,
  userId
}) => {

  // Puts a deleted task back exactly as it was (same id, links, subtasks…)
  const restoreDeletedTask = async (task) => {
    try {
      await addTask(task);
      toast.success('Task restored');
    } catch (error) {
      console.error("Restore after delete failed:", error);
      toast.error('Could not restore the task');
    }
  };

  const handleDelete = async (id) => {
    const toastId = toast.loading('Deleting task...');
    const previousTasks = tasks;
    const deletedTask = tasks.find(t => t.id === id);

    try {
      await removeTask(id);
      toast.dismiss(toastId);

      if (deletedTask) {
        showUndoToast('Task deleted', () => restoreDeletedTask(deletedTask), '🗑️');
      } else {
        toast.success('Task deleted');
      }

    } catch (error) {
      console.error("Delete failed:", error);
      toast.error('Delete failed', { id: toastId });
      setTasks(previousTasks);
    }
  };

  const handleArchive = async (task) => {
    try {
      await editTask(task.id, {
          archived: true
      });

      showUndoToast('Task archived', () => handleRestore(task), '📦');
    }
    catch(error){
      console.error("Archive failed:", error);
      toast.error("Failed to archive");
    }
  }

  const handleRestore = async (task) => {
    try {
      await editTask(task.id, {
        archived: false
      });

      toast.success("Task restored");
    } catch (error) {
      console.error(error);
      toast.error("Failed to restore task");
    }
  };

  const handleComplete = async (task) => {
    const completionDate = new Date().toISOString();

    try {
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? {
                ...t,
                completed: true,
                completion_date: completionDate
              }
            : t
        )
      );

      await editTask(task.id, {
        completed: true,
        completion_date: completionDate
      });

      showUndoToast(
        'Task completed',
        () => handleUndoComplete({ ...task, completed: true, completion_date: completionDate }),
        '✅'
      );

    } catch (error) {
      console.error("Failed to complete task:", error);
      toast.error('Failed to complete task');

      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? {
                ...t,
                completed: false,
                completion_date: null
              }
            : t
        )
      );
    }
  };

  const handleUndoComplete = async (task) => {
    try {
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? {
                ...t,
                completed: false,
                completion_date: null
              }
            : t
        )
      );

      await editTask(task.id, {
        completed: false,
        completion_date: null
      });
      toast.success('Task restored');

    } catch (error) {
      console.error("Failed to undo completion:", error);
      toast.error('Failed to restore task');

      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? {
                ...t,
                completed: true,
                completion_date: task.completion_date
              }
            : t
        )
      );
    }
  };

  const handleInlineUpdate = async (taskId, field, value) => {
    try {
      await editTask(taskId, {
        [field]: value
      });
    } catch (error) {
      console.error("Inline update failed:", error);
      toast.error("Failed to save change");
    }
  };

  const handleToggleSubtask = async (taskId, subtaskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);

      if (!task) return;

      const updatedSubtasks = task.subtasks.map(st =>
        st.id === subtaskId
          ? { ...st, completed: !st.completed }
          : st
      );

      await editTask(taskId, {
        subtasks: updatedSubtasks
      });

    } catch (error) {
      console.error("Subtask toggle failed:", error);
      toast.error("Failed to update subtask");
    }
  };

  // Quick Add builds a task from one line of text ("submit lab friday !urgent #os").
  // It must not pick up anything from the half-filled main form.
  const handleQuickAdd = async (text) => {
    if (!text.trim()) return;

    const parsed = parseQuickAdd(text);
    const smartTags = generateAutoTags(parsed.name, parsed.tags);

    const newTask = {
      user_id: userId,
      name: parsed.name,
      factor: parsed.factor || 'Normal',
      last_date: parsed.lastDate,
      start_date: null,
      completed: false,
      completion_date: null,
      recurrence: parsed.recurrence,
      recurrence_rule: parsed.recurrenceRule,
      links: parsed.links,
      tags: Array.isArray(smartTags) ? smartTags : [],
      subtasks: []
    };

    try {
      await addTask(newTask);
      toast.success('Task added');
    } catch (error) {
      console.error("Quick add failed:", error);
      toast.error('Failed to add task');
    }
  };

  return {
    handleDelete,
    handleComplete,
    handleUndoComplete,
    handleInlineUpdate,
    handleToggleSubtask,
    handleQuickAdd,
    handleArchive,
    handleRestore
  };
};