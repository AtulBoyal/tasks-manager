import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskActions } from '../../hooks/useTaskActions';

vi.mock('react-hot-toast', () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  toast.loading = vi.fn();
  return { default: toast };
});

const renderActions = (addTask) =>
  renderHook(() =>
    useTaskActions({
      tasks: [],
      setTasks: vi.fn(),
      addTask,
      editTask: vi.fn(),
      removeTask: vi.fn(),
      userId: 'user-1'
    })
  ).result;

describe('handleQuickAdd', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 25, 10, 0)); // Wednesday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a task from the parsed text', async () => {
    const addTask = vi.fn().mockResolvedValue({});
    const result = renderActions(addTask);

    await act(async () => {
      await result.current.handleQuickAdd('upsolve codeforces round friday !urgent #practice');
    });

    const task = addTask.mock.calls[0][0];
    expect(task).toMatchObject({
      user_id: 'user-1',
      name: 'upsolve codeforces round',
      factor: 'Urgent',
      last_date: '2026-11-27',
      recurrence: 'none',
      links: [],
      completed: false
    });
    // explicit tag plus auto-tags from the name
    expect(task.tags).toEqual(expect.arrayContaining(['practice', 'cp']));
  });

  it('defaults to Normal with no deadline for plain text', async () => {
    const addTask = vi.fn().mockResolvedValue({});
    const result = renderActions(addTask);

    await act(async () => {
      await result.current.handleQuickAdd('buy milk');
    });

    expect(addTask.mock.calls[0][0]).toMatchObject({
      name: 'buy milk',
      factor: 'Normal',
      last_date: null,
      recurrence: 'none'
    });
  });

  it('ignores blank input', async () => {
    const addTask = vi.fn();
    const result = renderActions(addTask);

    await act(async () => {
      await result.current.handleQuickAdd('   ');
    });

    expect(addTask).not.toHaveBeenCalled();
  });
});
