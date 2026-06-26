import MainLayout from '../layouts/MainLayout';
import SectionCard from '../components/ui/SectionCard';
import SectionTitle from '../components/ui/SectionTitle';
import TaskTable from '../components/TaskTable';

export default function Archive({
  tasks,
  isDarkMode,
  setIsDarkMode,
  formatDate,
  getFactorClass,
  handleDelete,
  handleUndoComplete,
  handleToggleSubtask,
  handleRestore
}) {

  const archivedTasks = tasks.filter(task => task.archived);

  return (
    <MainLayout
      isDarkMode={isDarkMode}
      setIsDarkMode={setIsDarkMode}
    >
      <SectionCard>

        <SectionTitle>
          Archived Tasks
        </SectionTitle>

        <TaskTable
          tasks={archivedTasks}
          isCompleted={true}
          formatDate={formatDate}
          getFactorClass={getFactorClass}
          handleDelete={handleDelete}
          handleUndoComplete={handleUndoComplete}
          handleToggleSubtask={handleToggleSubtask}
          handleRestore={handleRestore}
          isArchivePage={true}
        />

      </SectionCard>
    </MainLayout>
  );
}