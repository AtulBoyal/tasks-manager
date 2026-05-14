import React from 'react';
import TaskForm from '../components/TaskForm';
import TaskTable from '../components/TaskTable';
import FilterBar from '../components/FilterBar';
import ConsistencyHeatmap from '../components/ConsistencyHeatmap';
import QuickAddModal from '../components/QuickAddModal';
import MainLayout from '../layouts/MainLayout';
import SectionCard from '../components/ui/SectionCard';
import SectionTitle from '../components/ui/SectionTitle';

export default function Dashboard({
  isDarkMode,
  setIsDarkMode,

  tasks,

  taskFormProps,

  searchQuery,
  setSearchQuery,

  filterStatus,
  setFilterStatus,

  filterFactor,
  setFilterFactor,

  filterDate,
  setFilterDate,

  filteredActiveTasks,
  filteredCompletedTasks,

  todayDate,

  formatDate,
  getFactorClass,

  handleInlineUpdate,
  handleEdit,
  handleDelete,
  handleComplete,
  handleUndoComplete,
  handleToggleSubtask,

  showCompleted,
  setShowCompleted,

  isQuickAddOpen,
  setIsQuickAddOpen,

  handleQuickAdd
}) {
  return (
    <MainLayout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}>

      <ConsistencyHeatmap tasks={tasks} />
      <TaskForm {...taskFormProps} />

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
            {filteredActiveTasks.some(
              t => t.recurrence && t.recurrence !== 'none'
            ) && (
              <div className="mb-8">
                <h2 className="text-center font-extrabold text-[1.5rem] text-[#cc6000] dark:text-orange-500 mb-2 flex items-center justify-center gap-2">
                  <span>🔁</span> Daily Habits
                </h2>

                <TaskTable
                  tasks={filteredActiveTasks.filter(
                    t => t.recurrence && t.recurrence !== 'none'
                  )}
                  isCompleted={false}
                  todayDate={todayDate}
                  targetDate={filterDate || todayDate}
                  formatDate={formatDate}
                  getFactorClass={getFactorClass}
                  handleInlineUpdate={handleInlineUpdate}
                  handleEdit={handleEdit}
                  handleDelete={handleDelete}
                  handleComplete={handleComplete}
                  handleToggleSubtask={handleToggleSubtask}
                />
              </div>
            )}

            <SectionTitle>
              Active Tasks
            </SectionTitle>

            <TaskTable
              tasks={filteredActiveTasks.filter(
                t => !t.recurrence || t.recurrence === 'none'
              )}
              isCompleted={false}
              todayDate={todayDate}
              targetDate={filterDate || todayDate}
              formatDate={formatDate}
              getFactorClass={getFactorClass}
              handleInlineUpdate={handleInlineUpdate}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              handleComplete={handleComplete}
              handleToggleSubtask={handleToggleSubtask}
            />
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

          {((filterStatus === 'All' ||
            filterStatus === 'Completed') ||
            (filterStatus === 'Active' &&
              showCompleted)) && (
                <TaskTable
                tasks={filteredCompletedTasks}
                isCompleted={true}
                formatDate={formatDate}
              getFactorClass={getFactorClass}
              handleUndoComplete={handleUndoComplete}
              handleToggleSubtask={handleToggleSubtask}
            />
          )}
        </SectionCard>
      )}

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onQuickAdd={handleQuickAdd}
        isDarkMode={isDarkMode}
      />
    </MainLayout>
  );
};