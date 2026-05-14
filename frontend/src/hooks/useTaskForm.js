import { useState } from 'react';

export const useTaskForm = () => {
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

    resetForm
  };
};