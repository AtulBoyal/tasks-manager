import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';
import { ThemeProvider } from '../../context/ThemeContext';
import { useTaskContext } from '../../context/TaskContext';

vi.mock('../../context/TaskContext', () => ({
  useTaskContext: vi.fn()
}));

const today = new Date();
const pad = (n) => String(n).padStart(2, '0');
const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

const tasks = [
  { id: 1, name: 'Write report', factor: 'Urgent', completed: false, last_date: todayStr, recurrence: 'none', tags: [], links: [], subtasks: [] },
  { id: 2, name: 'Morning run', factor: 'Normal', completed: false, last_date: todayStr, recurrence: 'daily', tags: [], links: [], subtasks: [] },
  { id: 3, name: 'Old chore', factor: 'Later', completed: true, completion_date: new Date().toISOString(), recurrence: 'none', tags: [], links: [], subtasks: [] }
];

const renderDashboard = () => {
  const context = {
    tasks,
    form: {
      taskName: '', setTaskName: vi.fn(),
      factor: 'Normal', setFactor: vi.fn(),
      lastDate: '', setLastDate: vi.fn(),
      startDate: '', setStartDate: vi.fn(),
      taskLinks: [], setTaskLinks: vi.fn(),
      taskTags: [], setTaskTags: vi.fn(),
      currentTagInput: '', setCurrentTagInput: vi.fn(),
      subtasks: [], setSubtasks: vi.fn(),
      currentSubtaskInput: '', setCurrentSubtaskInput: vi.fn(),
      recurrence: 'none', setRecurrence: vi.fn(),
      editingTaskId: null, setEditingTaskId: vi.fn(),
      handleAddTag: vi.fn(), handleEdit: vi.fn(), handleSubmit: vi.fn()
    },
    handleInlineUpdate: vi.fn(),
    handleDelete: vi.fn(),
    handleComplete: vi.fn(),
    handleUndoComplete: vi.fn(),
    handleToggleSubtask: vi.fn(),
    handleArchive: vi.fn()
  };
  useTaskContext.mockReturnValue(context);

  render(
    <MemoryRouter>
      <ThemeProvider>
        <Dashboard />
      </ThemeProvider>
    </MemoryRouter>
  );

  return context;
};

describe('Dashboard', () => {
  it('splits habits from one-off tasks and hides completed by default', () => {
    renderDashboard();

    expect(screen.getByText('Recurring')).toBeInTheDocument();
    expect(screen.getAllByText('Morning run').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Write report').length).toBeGreaterThan(0);
    expect(screen.queryByText('Old chore')).not.toBeInTheDocument();
  });

  it('filters by search text', () => {
    renderDashboard();

    fireEvent.change(screen.getByPlaceholderText(/Search tasks/i), {
      target: { value: 'report' }
    });

    expect(screen.queryByText('Morning run')).not.toBeInTheDocument();
    expect(screen.getAllByText('Write report').length).toBeGreaterThan(0);
  });

  it('shows completed tasks when the section is expanded', () => {
    renderDashboard();

    fireEvent.click(screen.getByTitle('Click to toggle visibility'));

    expect(screen.getByText('Old chore')).toBeInTheDocument();
  });
});
