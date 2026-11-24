import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskForm } from '../../hooks/useTaskForm';

vi.mock('react-hot-toast', () => {
  const toast = vi.fn();
  toast.success = vi.fn();
  toast.error = vi.fn();
  return { default: toast };
});

const USER = 'user-1';
const submitEvent = { preventDefault: vi.fn() };

const renderForm = (overrides = {}) => {
  const addTask = vi.fn().mockResolvedValue({});
  const editTask = vi.fn().mockResolvedValue({});
  const hook = renderHook(() =>
    useTaskForm({ userId: USER, addTask, editTask, ...overrides })
  );
  return { ...hook, addTask: overrides.addTask || addTask, editTask: overrides.editTask || editTask };
};

describe('useTaskForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not submit an empty name', async () => {
    const { result, addTask } = renderForm();

    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(addTask).not.toHaveBeenCalled();
  });

  it('creates a task with auto tags and resets the form', async () => {
    const { result, addTask } = renderForm();

    act(() => {
      result.current.setTaskName('  Upsolve codeforces round  ');
      result.current.setFactor('Urgent');
    });

    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(addTask).toHaveBeenCalledWith(expect.objectContaining({
      user_id: USER,
      name: 'Upsolve codeforces round',
      factor: 'Urgent',
      completed: false,
      recurrence: 'none'
    }));
    expect(addTask.mock.calls[0][0].tags).toContain('cp');
    expect(result.current.taskName).toBe('');
  });

  it('keeps the form when saving fails', async () => {
    const addTask = vi.fn().mockRejectedValue(new Error('network'));
    const { result } = renderForm({ addTask });

    act(() => result.current.setTaskName('Important'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(result.current.taskName).toBe('Important');
  });

  it('loads a task for editing and saves via editTask', async () => {
    const { result, addTask, editTask } = renderForm();

    act(() => {
      result.current.handleEdit({
        id: 7,
        name: 'Old name',
        factor: 'Later',
        last_date: '2026-12-01',
        tags: ['x'],
        recurrence: 'weekly'
      });
    });

    expect(result.current.editingTaskId).toBe(7);
    expect(result.current.factor).toBe('Later');

    act(() => result.current.setTaskName('New name'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(addTask).not.toHaveBeenCalled();
    expect(editTask).toHaveBeenCalledWith(7, expect.objectContaining({
      name: 'New name',
      factor: 'Later',
      last_date: '2026-12-01',
      recurrence: 'weekly'
    }));
    expect(result.current.editingTaskId).toBeNull();
  });

  it('adds a normalized tag once', () => {
    const { result } = renderForm();
    const e = { preventDefault: vi.fn() };

    act(() => result.current.setCurrentTagInput('  DBMS '));
    act(() => result.current.handleAddTag(e));
    act(() => result.current.setCurrentTagInput('dbms'));
    act(() => result.current.handleAddTag(e));

    expect(result.current.taskTags).toEqual(['dbms']);
    expect(result.current.currentTagInput).toBe('');
  });

  it('saves a normalized recurrence rule', async () => {
    const { result, addTask } = renderForm();

    act(() => {
      result.current.setTaskName('Gym');
      result.current.setLastDate('2026-11-25');
      result.current.setRecurrence('weekly');
      result.current.setRecurrenceRule({ interval: '2', weekdays: [3, 1, 1] });
    });

    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(addTask).toHaveBeenCalledWith(expect.objectContaining({
      recurrence: 'weekly',
      recurrence_rule: { interval: 2, weekdays: [1, 3] }
    }));
    expect(result.current.recurrenceRule).toBeNull(); // form reset
  });

  it('loads and clears the rule when editing', async () => {
    const { result, editTask } = renderForm();

    act(() => {
      result.current.handleEdit({
        id: 9, name: 'Rent', recurrence: 'monthly', last_date: '2027-01-31',
        recurrence_rule: { interval: 1, monthDay: 31 }
      });
    });
    expect(result.current.recurrenceRule).toEqual({ interval: 1, monthDay: 31 });

    // Switching to one-off drops the rule (the database rejects rules on one-off tasks)
    act(() => result.current.setRecurrence('none'));

    await act(async () => {
      await result.current.handleSubmit(submitEvent);
    });

    expect(editTask).toHaveBeenCalledWith(9, expect.objectContaining({
      recurrence: 'none',
      recurrence_rule: null
    }));
  });
});
