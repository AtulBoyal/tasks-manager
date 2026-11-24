import { getLocalDateString } from './formatters';

export const CODEFORCES_CONTESTS_URL =
  'https://codeforces.com/api/contest.list?gym=false';

export const getUpcomingContests = (apiResponse) =>
  apiResponse?.status === 'OK'
    ? apiResponse.result.filter(contest => contest.phase === 'BEFORE')
    : [];

// Builds the task inserted for an upcoming Codeforces contest.
// `index` keeps subtask ids unique when several contests are built at once.
export const buildContestTask = (contest, userId, index = 0, now = Date.now()) => {
  const startsAt = new Date(contest.startTimeSeconds * 1000);
  const timeString = startsAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    user_id: userId,
    cf_contest_id: contest.id,
    name: `🏆 Codeforces: ${contest.name}`,
    factor: 'Urgent',
    last_date: getLocalDateString(startsAt),
    completed: false,
    archived: false,
    recurrence: 'none',
    links: [
      {
        title: 'Registration / Contest Page',
        url: `https://codeforces.com/contests/${contest.id}`
      }
    ],
    tags: ['codeforces', 'contest'],
    subtasks: [
      {
        id: now + 100 + index,
        title: `Register before ${timeString}`,
        completed: false
      },
      {
        id: now + 200 + index,
        title: `Compete at ${timeString}`,
        completed: false
      }
    ]
  };
};
