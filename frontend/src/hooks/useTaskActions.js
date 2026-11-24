import toast from "react-hot-toast";

export const useTaskActions = ({
  tasks,
  setTasks,
  addTask,
  editTask,
  removeTask,
  session
}) => {

  const handleDelete = async (id) => {
    const toastId = toast.loading('Deleting task...');
    const previousTasks = tasks;

    try {
      await removeTask(id);
      toast.success('Task deleted', { id: toastId });

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

      toast.success("Task archived");
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
    try {
      setTasks(prev =>
        prev.map(t =>
          t.id === task.id
            ? {
                ...t,
                completed: true,
                completion_date: new Date().toISOString()
              }
            : t
        )
      );

      await editTask(task.id, {
        completed: true,
        completion_date: new Date().toISOString()
      });
      toast.success('Task completed');

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

  // Quick Add creates a plain task from just a title. It must not pick up
  // links/subtasks/recurrence from the half-filled main form.
  const handleQuickAdd = async ({ newTitle, generateAutoTags }) => {
    const name = newTitle.trim();
    if (!name) return;

    const smartTags = generateAutoTags(name, []);

    const newTask = {
      id: Date.now(),
      user_id: session?.user?.id,
      name,
      factor: 'Normal',
      last_date: null,
      start_date: null,
      completed: false,
      completion_date: null,
      recurrence: 'none',
      links: [],
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