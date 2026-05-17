import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaskFilters } from '../../hooks/useTaskFilters';

const mockTasks = [
  {
    id: 1,
    name: 'Complete DSA',
    factor: 'Urgent',
    completed: false,
    last_date: '2026-05-20'
  },
  {
    id: 2,
    name: 'Gym workout',
    factor: 'Normal',
    completed: true,
    last_date: '2026-05-21'
  }
];

describe('useTaskFilters', () => {

  it('filters active tasks correctly', () => {
    const { result } = renderHook(() =>
      useTaskFilters({
        tasks: mockTasks,
        filterStatus: 'Active',
        filterFactor: 'All',
        filterDate: null,
        searchQuery: ''
      })
    );

    expect(result.current.filteredActiveTasks.length)
      .toBe(1);
  });

  it('filters completed tasks correctly', () => {
    const { result } = renderHook(() =>
      useTaskFilters({
        tasks: mockTasks,
        filterStatus: 'Completed',
        filterFactor: 'All',
        filterDate: null,
        searchQuery: ''
      })
    );

    expect(result.current.filteredCompletedTasks.length)
      .toBe(1);
  });
});