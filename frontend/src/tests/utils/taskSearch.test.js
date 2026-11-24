import { describe, it, expect } from 'vitest';
import { matchesSearch } from '../../utils/taskSearch';

const task = {
  name: 'Write DBMS report',
  tags: ['dbms', 'algorithms'],
  subtasks: [{ id: 1, title: 'Draft ER diagram', completed: false }],
  links: [{ title: 'Assignment brief', url: 'https://moodle.example.edu/course/42' }]
};

describe('matchesSearch', () => {
  it('matches everything for an empty or blank query', () => {
    expect(matchesSearch(task, '')).toBe(true);
    expect(matchesSearch(task, '   ')).toBe(true);
    expect(matchesSearch(task, undefined)).toBe(true);
    expect(matchesSearch(task, '#')).toBe(true);
  });

  it('matches the name, case-insensitively', () => {
    expect(matchesSearch(task, 'report')).toBe(true);
    expect(matchesSearch(task, 'REPORT')).toBe(true);
    expect(matchesSearch(task, 'essay')).toBe(false);
  });

  it('matches tags, subtasks and links as plain text', () => {
    expect(matchesSearch(task, 'algorithms')).toBe(true);
    expect(matchesSearch(task, 'diagram')).toBe(true);
    expect(matchesSearch(task, 'brief')).toBe(true);
    expect(matchesSearch(task, 'moodle')).toBe(true);
  });

  it('matches #tags by prefix, against tags only', () => {
    expect(matchesSearch(task, '#dbms')).toBe(true);
    expect(matchesSearch(task, '#alg')).toBe(true);
    expect(matchesSearch(task, '#DBMS')).toBe(true);
    // "report" is in the name but is not a tag
    expect(matchesSearch(task, '#report')).toBe(false);
  });

  it('requires every term to match', () => {
    expect(matchesSearch(task, 'report #dbms')).toBe(true);
    expect(matchesSearch(task, 'write diagram')).toBe(true);
    expect(matchesSearch(task, 'report #fitness')).toBe(false);
    expect(matchesSearch(task, 'report essay')).toBe(false);
  });

  it('handles legacy string links and missing fields', () => {
    const legacy = { name: 'Old task', links: ['https://codeforces.com/contest/1'] };

    expect(matchesSearch(legacy, 'codeforces')).toBe(true);
    expect(matchesSearch(legacy, '#cp')).toBe(false);
    expect(matchesSearch({ name: 'Bare' }, 'bare')).toBe(true);
    expect(matchesSearch({ name: 'Bare', tags: null, links: null, subtasks: null }, 'x')).toBe(false);
  });
});
