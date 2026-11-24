import React, { useState } from 'react';
import TaskForm from '../components/TaskForm';
import TaskTable from '../components/TaskTable';
import FilterBar from '../components/FilterBar';
import ConsistencyHeatmap from '../components/ConsistencyHeatmap';
import MainLayout from '../layouts/MainLayout';
import SectionCard from '../components/ui/SectionCard';
import SectionTitle from '../components/ui/SectionTitle';
import { useTaskContext } from '../context/TaskContext';
import { useTaskFilters } from '../hooks/useTaskFilters';
import { formatDate, getFactorClass, getLocalDateString } from '../utils/formatters';

const isRecurring = (task) => task.recurrence && task.recurrence !== 'none';

export default function Dashboard() {
  const {
    tasks,
    form,
    handleInlineUpdate,
    handleDelete,
    handleComplete,
    handleUndoComplete,
    handleToggleSubtask,
    handleArchive
  } = useTaskContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterFactor, setFilterFactor] = useState('All');
  const [filterDate, setFilterDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState('Active');
  const [showCompleted, setShowCompleted] = useState(false);

  const { filteredActiveTasks, filteredCompletedTasks } =
    useTaskFilters({ tasks, filterStatus, filterFactor, filterDate, searchQuery });

  const todayDate = getLocalDateString();

  const activeTableProps = {
    isCompleted: false,
    targetDate: filterDate || todayDate,
    formatDate,
    getFactorClass,
    handleInlineUpdate,
    handleEdit: form.handleEdit,
    handleDelete,
    handleComplete,
    handleToggleSubtask,
    handleUndoComplete,
    handleArchive
  };

  const habitTasks = filteredActiveTasks.filter(isRecurring);
  const oneOffTasks = filteredActiveTasks.filter(task => !isRecurring(task));

  return (
    <MainLayout>

      <ConsistencyHeatmap tasks={tasks} />
      <TaskForm {...form} />

      <SectionCard>

        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterFactor={filterFactor}
          setFilterFactor={setFilterFactor}
          filterDate={filterDate}
          setFilterDate={setFilterDate}
        />

        {(filterStatus === 'Active' || filterStatus === 'All') && (
          <>
            {habitTasks.length > 0 && (
              <div className="mb-8">
                <h2 className="text-center font-extrabold text-[1.5rem] text-[#cc6000] dark:text-orange-500 mb-2 flex items-center justify-center gap-2">
                  <span>🔁</span> Recurring
                </h2>

                <TaskTable tasks={habitTasks} {...activeTableProps} />
              </div>
            )}

            <SectionTitle>
              Active Tasks
            </SectionTitle>

            <TaskTable tasks={oneOffTasks} {...activeTableProps} />
          </>
        )}
      </SectionCard>

      {tasks.some(task => task.completed) && (
        <SectionCard className="mt-[34px] mb-[40px]">

          <div
            className={`flex justify-center items-center gap-2 mb-[13px] ${
              filterStatus === 'Active'
              ? 'cursor-pointer hover:opacity-80 transition-opacity'
              : ''
            }`}
            onClick={() => {
              if (filterStatus === 'Active') {
                setShowCompleted(!showCompleted);
              }
            }}
            title={
              filterStatus === 'Active'
                ? 'Click to toggle visibility'
                : ''
            }
          >
            <SectionTitle>
              Completed Tasks
            </SectionTitle>

            {filterStatus === 'Active' && (
              <span className="text-[#c57415] dark:text-orange-400 text-xl font-bold pb-1">
                {showCompleted ? '▲' : '▼'}
              </span>
            )}
          </div>

          {(filterStatus === 'All' ||
            filterStatus === 'Completed' ||
            (filterStatus === 'Active' && showCompleted)) && (
            <TaskTable
              tasks={filteredCompletedTasks}
              isCompleted={true}
              formatDate={formatDate}
              getFactorClass={getFactorClass}
              handleUndoComplete={handleUndoComplete}
              handleToggleSubtask={handleToggleSubtask}
              handleArchive={handleArchive}
            />
          )}
        </SectionCard>
      )}
    </MainLayout>
  );
}
