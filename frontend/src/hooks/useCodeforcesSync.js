import { useEffect, useRef } from 'react';
import { taskService } from '../services/taskService';
import {
  CODEFORCES_CONTESTS_URL,
  getUpcomingContests,
  buildContestTask
} from '../utils/codeforces';

// Adds upcoming Codeforces contests as tasks, once per mount, skipping
// contests the user already has (locally or in the database).
export const useCodeforcesSync = ({
  enabled,
  userId,
  tasks,
  hasLoaded,
  addTask
}) => {
  const existingContestIds = useRef(new Set());
  const isSyncRunning = useRef(false);

  useEffect(() => {
    existingContestIds.current = new Set(
      tasks
        .filter(t => t.cf_contest_id)
        .map(t => t.cf_contest_id)
    );
  }, [tasks]);

  useEffect(() => {
    if (!enabled || !userId) return;

    // Wait for the user's tasks to load, otherwise the dedupe set is empty
    // and every upcoming contest gets inserted again.
    if (!hasLoaded) return;

    if (isSyncRunning.current) return;
    isSyncRunning.current = true;

    const syncContests = async () => {
      try {
        const response = await fetch(CODEFORCES_CONTESTS_URL);
        const upcoming = getUpcomingContests(await response.json());

        for (const [index, contest] of upcoming.entries()) {
          if (existingContestIds.current.has(contest.id)) continue;

          try {
            // Another device may have added it since our tasks were loaded.
            if (await taskService.contestExists(userId, contest.id)) {
              existingContestIds.current.add(contest.id);
              continue;
            }

            await addTask(buildContestTask(contest, userId, index));
            existingContestIds.current.add(contest.id);
          } catch (error) {
            console.error(`Failed to add Codeforces contest ${contest.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Codeforces contests', error);
      } finally {
        isSyncRunning.current = false;
      }
    };

    syncContests();
  }, [enabled, userId, hasLoaded, addTask]);
};
