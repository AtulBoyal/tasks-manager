import { useState } from 'react';
import toast from 'react-hot-toast';
import { generateAutoTags } from '../utils/tagEngine';

// State and handlers for the create / edit task form.
export const useTaskForm = ({ userId, addTask, editTask }) => {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Normal');
  const [lastDate, setLastDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [taskLinks, setTaskLinks] = useState([]);
  const [taskTags, setTaskTags] = useState([]);
  const [currentTagInput, setCurrentTagInput] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [currentSubtaskInput, setCurrentSubtaskInput] = useState('');
  const [recurrence, setRecurrence] = useState('none');
  const [editingTaskId, setEditingTaskId] = useState(null);

  const resetForm = () => {
    setTaskName('');
    setFactor('Normal');
    setLastDate('');
    setStartDate('');
    setTaskLinks([]);
    setTaskTags([]);
    setCurrentTagInput('');
    setSubtasks([]);
    setCurrentSubtaskInput('');
    setRecurrence('none');
    setEditingTaskId(null);
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const cleanTag = currentTagInput.trim().toLowerCase();
    if (cleanTag && !taskTags.includes(cleanTag)) setTaskTags([...taskTags, cleanTag]);
    setCurrentTagInput('');
  };

  // Loads an existing task into the form for editing
  const handleEdit = (task) => {
    setEditingTaskId(task.id);
    setTaskName(task.name || '');
    setFactor(task.factor || 'Normal');
    setLastDate(task.last_date || '');
    setStartDate(task.start_date || '');
    setTaskLinks(task.links || []);
    setTaskTags(task.tags || []);
    setSubtasks(task.subtasks || []);
    setRecurrence(task.recurrence || 'none');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanTaskName = taskName.trim();
    if (!cleanTaskName) {
      toast.error("Please enter a task name.");
      return;
    }

    const smartTags = generateAutoTags(cleanTaskName, taskTags);

    // Only clear the form on success so a failed save doesn't lose edits.
    if (editingTaskId) {
      try {
        await editTask(editingTaskId, {
          name: cleanTaskName,
          factor,
          last_date: lastDate || null,
          start_date: startDate || null,
          links: taskLinks,
          tags: smartTags,
          subtasks,
          recurrence
        });
        toast.success('Task updated');
        resetForm();
      } catch (error) {
        console.error("Failed to update task:", error);
        toast.error('Failed to update task');
      }
      return;
    }

    try {
      await addTask({
        user_id: userId,
        name: cleanTaskName,
        factor: factor || 'Normal',
        last_date: lastDate || null,
        start_date: startDate || null,
        completed: false,
        completion_date: null,
        recurrence: recurrence || 'none',
        links: Array.isArray(taskLinks) ? taskLinks : [],
        tags: Array.isArray(smartTags) ? smartTags : [],
        subtasks: Array.isArray(subtasks) ? subtasks : []
      });
      toast.success('Task created successfully');
      resetForm();
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error('Failed to create task');
    }
  };

  return {
    taskName,
    setTaskName,

    factor,
    setFactor,

    lastDate,
    setLastDate,

    startDate,
    setStartDate,

    taskLinks,
    setTaskLinks,

    taskTags,
    setTaskTags,

    currentTagInput,
    setCurrentTagInput,

    subtasks,
    setSubtasks,

    currentSubtaskInput,
    setCurrentSubtaskInput,

    recurrence,
    setRecurrence,

    editingTaskId,
    setEditingTaskId,

    resetForm,
    handleAddTag,
    handleEdit,
    handleSubmit
  };
};
