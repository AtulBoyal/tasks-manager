export const useTaskFilters = ({
  tasks,
  filterStatus,
  filterFactor,
  filterDate,
  searchQuery
}) => {

  const currentDateStr = new Date().toISOString().split('T')[0];

  const filteredActiveTasks = tasks
    .filter(task => {
      if (task.completed) return false;

      if (task.start_date && task.start_date > currentDateStr)
        return false;

      if (
        filterStatus === 'Active' &&
        filterDate &&
        task.last_date !== filterDate
      )
        return false;

      if (
        filterFactor !== 'All' &&
        task.factor !== filterFactor
      )
        return false;

      if (
        searchQuery &&
        !task.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
        return false;

      return true;
    })
    .sort((a, b) => {
      const hasDeadA = !!a.last_date;
      const hasDeadB = !!b.last_date;

      if (hasDeadA !== hasDeadB)
        return hasDeadA ? -1 : 1;

      if (hasDeadA && hasDeadB) {
        const deadDiff =
          new Date(a.last_date) -
          new Date(b.last_date);

        if (deadDiff !== 0) return deadDiff;
      }

      const priorityMap = {
        Urgent: 1,
        Normal: 2,
        Later: 3
      };

      const prioA = priorityMap[a.factor] || 4;
      const prioB = priorityMap[b.factor] || 4;

      if (prioA !== prioB)
        return prioA - prioB;

      return a.name.localeCompare(b.name);
    });

  const filteredCompletedTasks = tasks
    .filter(task => {
      if (!task.completed) return false;

      if (
        searchQuery &&
        !task.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
        return false;

      return true;
    })
    .sort((a, b) => {
      if (!a.completion_date && b.completion_date)
        return 1;

      if (a.completion_date && !b.completion_date)
        return -1;

      if (!a.completion_date && !b.completion_date)
        return 0;

      return (
        new Date(b.completion_date) -
        new Date(a.completion_date)
      );
    });

  return {
    filteredActiveTasks,
    filteredCompletedTasks
  };
};