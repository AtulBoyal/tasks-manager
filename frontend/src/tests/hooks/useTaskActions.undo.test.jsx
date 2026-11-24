import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, render, screen, fireEvent } from '@testing-library/react';
import toast from 'react-hot-toast';
import { useTaskActions, UNDO_TOAST_DURATION_MS } from '../../hooks/useTaskActions';

vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();
  toastFn.success = vi.fn();
  toastFn.error = vi.fn();
  toastFn.loading = vi.fn(() => 'loading-toast');
  toastFn.dismiss = vi.fn();
  return { default: toastFn };
});

const task = {
  id: 42,
  user_id: 'user-1',
  name: 'Write report',
  factor: 'Urgent',
  last_date: '2026-11-27',
  completed: false,
  completion_date: null,
  archived: false,
  recurrence: 'none',
  links: [{ title: 'Brief', url: 'https://example.com/brief' }],
  tags: ['dbms'],
  subtasks: [{ id: 1, title: 'Outline', completed: true }],
  cf_contest_id: null
};

const setup = (overrides = {}) => {
  const deps = {
    tasks: [task],
    setTasks: vi.fn(),
    addTask: vi.fn().mockResolvedValue(task),
    editTask: vi.fn().mockResolvedValue({}),
    removeTask: vi.fn().mockResolvedValue(),
    userId: 'user-1',
    ...overrides
  };
  const { result } = renderHook(() => useTaskActions(deps));
  return { actions: result.current, ...deps };
};

// Renders the most recent undo toast and returns its options
const renderUndoToast = () => {
  const [renderToast, options] = toast.mock.calls.at(-1);
  render(renderToast({ id: 'undo-toast' }));
  return options;
};

describe('undo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('restores a deleted task exactly as it was', async () => {
    const { actions, removeTask, addTask } = setup();

    await act(async () => {
      await actions.handleDelete(42);
    });

    expect(removeTask).toHaveBeenCalledWith(42);
    const options = renderUndoToast();
    expect(options.duration).toBe(UNDO_TOAST_DURATION_MS);
    expect(screen.getByText('Task deleted')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    });

    expect(toast.dismiss).toHaveBeenCalledWith('undo-toast');
    expect(addTask).toHaveBeenCalledWith(task);
  });

  it('ignores a double click on Undo', async () => {
    const { actions, addTask } = setup();

    await act(async () => {
      await actions.handleDelete(42);
    });
    renderUndoToast();

    const undo = screen.getByRole('button', { name: 'Undo' });
    await act(async () => {
      fireEvent.click(undo);
      fireEvent.click(undo);
    });

    expect(addTask).toHaveBeenCalledTimes(1);
  });

  it('does not offer undo when the delete fails', async () => {
    const previous = [task];
    const { actions, setTasks } = setup({
      tasks: previous,
      removeTask: vi.fn().mockRejectedValue(new Error('network'))
    });

    await act(async () => {
      await actions.handleDelete(42);
    });

    expect(toast).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Delete failed', { id: 'loading-toast' });
    expect(setTasks).toHaveBeenCalledWith(previous);
  });

  it('reopens a completed task', async () => {
    const { actions, editTask } = setup();

    await act(async () => {
      await actions.handleComplete(task);
    });

    expect(editTask).toHaveBeenLastCalledWith(42, expect.objectContaining({ completed: true }));
    renderUndoToast();
    expect(screen.getByText('Task completed')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    });

    expect(editTask).toHaveBeenLastCalledWith(42, { completed: false, completion_date: null });
  });

  it('un-archives an archived task', async () => {
    const { actions, editTask } = setup();

    await act(async () => {
      await actions.handleArchive(task);
    });

    renderUndoToast();
    expect(screen.getByText('Task archived')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    });

    expect(editTask).toHaveBeenLastCalledWith(42, { archived: false });
  });

  it('reports a failed restore', async () => {
    const { actions } = setup({ addTask: vi.fn().mockRejectedValue(new Error('rls')) });

    await act(async () => {
      await actions.handleDelete(42);
    });
    renderUndoToast();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    });

    expect(toast.error).toHaveBeenCalledWith('Could not restore the task');
  });
});
