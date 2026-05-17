import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskTable from '../../components/TaskTable';

const mockTasks = [
  {
    id: 1,
    name: 'Build React App',
    factor: 'Urgent',
    completed: false,
    last_date: '2026-05-20',
    tags: [],
    links: [],
    subtasks: []
  }
];

describe('TaskTable', () => {

  it('renders tasks properly', () => {
    render(
      <TaskTable
        tasks={mockTasks}
        isCompleted={false}
        todayDate={'2026-05-19'}
        targetDate={'2026-05-20'}
        formatDate={(d) => d}
        getFactorClass={() => ''}
        handleInlineUpdate={vi.fn()}
        handleEdit={vi.fn()}
        handleDelete={vi.fn()}
        handleComplete={vi.fn()}
        handleToggleSubtask={vi.fn()}
      />
    );

    expect(
      screen.getByText('Build React App')
    ).toBeInTheDocument();
  });
});