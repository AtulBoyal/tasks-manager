import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCodeforcesSync } from '../../hooks/useCodeforcesSync';
import { buildContestTask, getUpcomingContests } from '../../utils/codeforces';
import { taskService } from '../../services/taskService';

vi.mock('../../services/taskService', () => ({
  taskService: { contestExists: vi.fn() }
}));

const USER = 'user-1';

const contest = (id, phase = 'BEFORE') => ({
  id,
  name: `Round ${id}`,
  phase,
  startTimeSeconds: 1_795_000_000
});

const mockContestApi = (contests) => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ status: 'OK', result: contests })
  });
};

describe('codeforces utils', () => {
  it('keeps only upcoming contests from an OK response', () => {
    expect(getUpcomingContests({ status: 'OK', result: [contest(1), contest(2, 'FINISHED')] }))
      .toEqual([contest(1)]);
    expect(getUpcomingContests({ status: 'FAILED' })).toEqual([]);
  });

  it('builds a contest task', () => {
    const task = buildContestTask(contest(42), USER, 0, 1000);

    expect(task).toMatchObject({
      user_id: USER,
      cf_contest_id: 42,
      name: '🏆 Codeforces: Round 42',
      factor: 'Urgent',
      tags: ['codeforces', 'contest'],
      links: [{ url: 'https://codeforces.com/contests/42' }]
    });
    expect(task.subtasks.map(s => s.id)).toEqual([1100, 1200]);
    expect(task.last_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('useCodeforcesSync', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    taskService.contestExists.mockResolvedValue(false);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('does nothing when disabled or before tasks have loaded', () => {
    mockContestApi([contest(1)]);
    const addTask = vi.fn();

    renderHook(() => useCodeforcesSync({
      enabled: false, userId: USER, tasks: [], hasLoaded: true, addTask
    }));
    renderHook(() => useCodeforcesSync({
      enabled: true, userId: USER, tasks: [], hasLoaded: false, addTask
    }));

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(addTask).not.toHaveBeenCalled();
  });

  it('adds only contests not already present locally or in the database', async () => {
    mockContestApi([contest(1), contest(2), contest(3), contest(4, 'FINISHED')]);
    taskService.contestExists.mockImplementation(async (_user, id) => id === 2);
    const addTask = vi.fn().mockResolvedValue({});

    renderHook(() => useCodeforcesSync({
      enabled: true,
      userId: USER,
      tasks: [{ id: 99, cf_contest_id: 1 }],
      hasLoaded: true,
      addTask
    }));

    await waitFor(() => expect(addTask).toHaveBeenCalledTimes(1));
    expect(addTask.mock.calls[0][0].cf_contest_id).toBe(3);
    expect(taskService.contestExists).not.toHaveBeenCalledWith(USER, 1);
  });
});
