import MainLayout from '../layouts/MainLayout';
import SectionCard from '../components/ui/SectionCard';
import SectionTitle from '../components/ui/SectionTitle';
import TaskTable from '../components/TaskTable';
import { useTaskContext } from '../context/TaskContext';
import { formatDate, getFactorClass } from '../utils/formatters';

export default function Archive() {
  const {
    tasks,
    handleDelete,
    handleUndoComplete,
    handleToggleSubtask,
    handleRestore
  } = useTaskContext();

  const archivedTasks = tasks.filter(task => task.archived);

  return (
    <MainLayout>
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