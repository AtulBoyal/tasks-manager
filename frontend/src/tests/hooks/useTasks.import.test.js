import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTasks, IMPORT_BATCH_SIZE } from '../../hooks/useTasks';
import { taskService } from '../../services/taskService';

vi.mock('../../services/taskService', () => ({
  taskService: {
    fetchTasks: vi.fn(),
    createTasks: vi.fn()
  }
}));

const rows = (count) => Array.from({ length: count }, (_, i) => ({ name: `Task ${i}` }));
// Pretend the database assigns ids
const echoWithIds = async (batch) => batch.map((task) => ({ ...task, id: `${task.name}-id` }));

describe('useTasks.importTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskService.fetchTasks.mockResolvedValue([]);
  });

  it('inserts in batches and adds the created tasks to state', async () => {
    taskService.createTasks.mockImplementation(echoWithIds);
    const { result } = renderHook(() => useTasks('user-1'));
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    let created;
    await act(async () => {
      created = await result.current.importTasks(rows(IMPORT_BATCH_SIZE * 2 + 1));
    });

    expect(taskService.createTasks).toHaveBeenCalledTimes(3);
    expect(taskService.createTasks.mock.calls.map(([batch]) => batch.length))
      .toEqual([IMPORT_BATCH_SIZE, IMPORT_BATCH_SIZE, 1]);
    expect(created).toHaveLength(IMPORT_BATCH_SIZE * 2 + 1);
    expect(result.current.tasks).toHaveLength(IMPORT_BATCH_SIZE * 2 + 1);
  });

  it('reports how many were imported before a batch failed', async () => {
    taskService.createTasks
      .mockImplementationOnce(echoWithIds)
      .mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useTasks('user-1'));
    await waitFor(() => expect(result.current.hasLoaded).toBe(true));

    let caught;
    await act(async () => {
      try {
        await result.current.importTasks(rows(IMPORT_BATCH_SIZE + 10));
      } catch (error) {
        caught = error;
      }
    });

    expect(caught.message).toBe('network down');
    expect(caught.importedCount).toBe(IMPORT_BATCH_SIZE);
    expect(result.current.tasks).toHaveLength(IMPORT_BATCH_SIZE);
  });
});
