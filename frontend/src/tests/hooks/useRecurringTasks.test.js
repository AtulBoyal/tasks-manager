import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRecurringTasks } from '../../hooks/useRecurringTasks';

const USER = 'user-1';

const completedYesterday = (overrides) => ({
  id: 1,
  name: 'Task',
  completed: true,
  completion_date: new Date(2026, 10, 23, 18, 0).toISOString(),
  last_date: '2026-11-23',
  start_date: null,
  subtasks: [{ id: 's1', title: 'step', completed: true }],
  ...overrides
});

describe('useRecurringTasks', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 24, 9, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing until tasks have loaded', () => {
    const editTask = vi.fn().mockResolvedValue({});

    renderHook(() =>
      useRecurringTasks({
        tasks: [completedYesterday({ recurrence: 'daily' })],
        editTask,
        userId: USER,
        hasLoaded: false
      })
    );

    expect(editTask).not.toHaveBeenCalled();
  });

  it('re-opens daily and weekly tasks with shifted dates', async () => {
    const editTask = vi.fn().mockResolvedValue({});

    renderHook(() =>
      useRecurringTasks({
        tasks: [
          completedYesterday({ id: 1, recurrence: 'daily' }),
          completedYesterday({ id: 2, recurrence: 'weekly', start_date: '2026-11-20' }),
          completedYesterday({ id: 3, recurrence: 'none' })
        ],
        editTask,
        userId: USER,
        hasLoaded: true
      })
    );

    await waitFor(() => expect(editTask).toHaveBeenCalledTimes(2));

    expect(editTask).toHaveBeenCalledWith(1, expect.objectContaining({
      completed: false,
      completion_date: null,
      last_date: '2026-11-24',
      subtasks: [{ id: 's1', title: 'step', completed: false }]
    }));

    expect(editTask).toHaveBeenCalledWith(2, expect.objectContaining({
      last_date: '2026-11-30',
      start_date: '2026-11-27'
    }));

    await waitFor(() =>
      expect(localStorage.getItem(`last_habit_reset_${USER}`)).toBe('2026-11-24')
    );
  });

  it('does not re-run on re-render while a reset is in flight', async () => {
    let resolveEdit;
    const editTask = vi.fn(() => new Promise(r => { resolveEdit = r; }));
    const props = {
      tasks: [completedYesterday({ recurrence: 'daily' })],
      editTask,
      userId: USER,
      hasLoaded: true
    };

    const { rerender } = renderHook((p) => useRecurringTasks(p), { initialProps: props });
    rerender({ ...props, tasks: [...props.tasks] });
    rerender({ ...props, tasks: [...props.tasks] });

    expect(editTask).toHaveBeenCalledTimes(1);
    resolveEdit({});
  });

  it('skips tasks completed today', () => {
    const editTask = vi.fn().mockResolvedValue({});

    renderHook(() =>
      useRecurringTasks({
        tasks: [completedYesterday({
          recurrence: 'daily',
          completion_date: new Date(2026, 10, 24, 8, 0).toISOString()
        })],
        editTask,
        userId: USER,
        hasLoaded: true
      })
    );

    expect(editTask).not.toHaveBeenCalled();
    expect(localStorage.getItem(`last_habit_reset_${USER}`)).toBe('2026-11-24');
  });
});
