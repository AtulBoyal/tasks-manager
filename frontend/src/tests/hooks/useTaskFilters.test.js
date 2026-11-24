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

  it('searches tags and links in both active and completed tasks', () => {
    const tasks = [
      { id: 1, name: 'Practice', factor: 'Normal', completed: false, tags: ['cp'], links: [] },
      { id: 2, name: 'Read notes', factor: 'Normal', completed: false, tags: [],
        links: [{ title: 'Codeforces blog', url: 'https://codeforces.com/blog' }] },
      { id: 3, name: 'Old contest', factor: 'Normal', completed: true, tags: ['cp'], links: [] }
    ];

    const { result } = renderHook(() =>
      useTaskFilters({
        tasks,
        filterStatus: 'All',
        filterFactor: 'All',
        filterDate: null,
        searchQuery: '#cp'
      })
    );

    expect(result.current.filteredActiveTasks.map(t => t.id)).toEqual([1]);
    expect(result.current.filteredCompletedTasks.map(t => t.id)).toEqual([3]);

    const { result: byLink } = renderHook(() =>
      useTaskFilters({
        tasks,
        filterStatus: 'All',
        filterFactor: 'All',
        filterDate: null,
        searchQuery: 'codeforces'
      })
    );

    expect(byLink.current.filteredActiveTasks.map(t => t.id)).toEqual([2]);
  });
});