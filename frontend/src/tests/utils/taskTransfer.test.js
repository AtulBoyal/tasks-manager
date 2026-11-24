import { describe, it, expect } from 'vitest';
import {
  toExportJson,
  toCsv,
  parseCsv,
  escapeCsvCell,
  normalizeTask,
  prepareImport,
  exportFileName,
  MAX_IMPORT_TASKS
} from '../../utils/taskTransfer';

const fullTask = {
  id: 7,
  user_id: 'user-1',
  name: 'Write "DBMS" report, part 1',
  factor: 'Urgent',
  last_date: '2026-11-27',
  start_date: '2026-11-20',
  completed: true,
  completion_date: '2026-11-26T09:30:00.000Z',
  archived: false,
  recurrence: 'weekly',
  tags: ['dbms', 'college'],
  links: [{ title: 'Brief', url: 'https://example.com/brief' }],
  subtasks: [
    { id: 1, title: 'Outline', completed: true },
    { id: 2, title: 'Draft', completed: false }
  ],
  cf_contest_id: null
};

const NOW = 1_800_000_000_000;

describe('export', () => {
  it('JSON keeps every task field but never ids or user ids', () => {
    const data = JSON.parse(toExportJson([fullTask], new Date('2026-11-25T00:00:00Z')));

    expect(data).toMatchObject({ app: 'TaskVault', version: 1, exported_at: '2026-11-25T00:00:00.000Z' });
    expect(data.tasks[0]).not.toHaveProperty('id');
    expect(data.tasks[0]).not.toHaveProperty('user_id');
    expect(data.tasks[0]).toMatchObject({
      name: fullTask.name,
      factor: 'Urgent',
      completed: true,
      recurrence: 'weekly',
      links: fullTask.links,
      subtasks: fullTask.subtasks
    });
  });

  it('CSV has a header and quotes cells with commas and quotes', () => {
    const [header, row] = toCsv([fullTask]).trim().split('\r\n');

    expect(header).toBe('name,priority,deadline,start_date,status,completed_at,recurrence,tags,links,subtasks');
    expect(row).toBe(
      '"Write ""DBMS"" report, part 1",Urgent,2026-11-27,2026-11-20,completed,2026-11-26T09:30:00.000Z,weekly,dbms; college,https://example.com/brief,[x] Outline; Draft'
    );
  });

  it('neutralises spreadsheet formulas in CSV cells', () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(escapeCsvCell('+1')).toBe("'+1");
    expect(escapeCsvCell('-fix bug')).toBe("'-fix bug");
    expect(escapeCsvCell('@user')).toBe("'@user");
    expect(escapeCsvCell('plain')).toBe('plain');
  });

  it('names files with the local date', () => {
    expect(exportFileName('json', new Date(2026, 10, 5))).toBe('tasks-manager-export-2026-11-05.json');
  });
});

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, embedded newlines, CRLF and a BOM', () => {
    const csv = '\uFEFFname,tags\r\n"a, b","x"\r\n"line1\nline2",""""\r\n\r\n';

    expect(parseCsv(csv)).toEqual([
      ['name', 'tags'],
      ['a, b', 'x'],
      ['line1\nline2', '"']
    ]);
  });

  it('handles a final line without a newline', () => {
    expect(parseCsv('name\nlast')).toEqual([['name'], ['last']]);
  });
});

describe('normalizeTask', () => {
  it('rejects rows without a name', () => {
    expect(normalizeTask({ name: '   ' })).toEqual({ error: 'missing name' });
    expect(normalizeTask(null)).toEqual({ error: 'not a task' });
  });

  it('keeps only valid values and fills defaults', () => {
    const { task } = normalizeTask({
      name: '  Study  ',
      factor: 'Critical',
      last_date: '2026-02-30',
      start_date: 'tomorrow',
      completed: 'yes',
      completion_date: '2026-11-26T09:30:00Z',
      recurrence: 'yearly',
      tags: ['#OS', 'os', 42, ' Algorithms '],
      links: ['javascript:alert(1)', 'https://ok.example.com/a', { url: 'ftp://x' }],
      subtasks: [{ title: 'ok', completed: 'true' }, { title: '' }, 'junk'],
      cf_contest_id: -5,
      user_id: 'attacker',
      id: 1,
      __proto__: { polluted: true }
    }, NOW);

    expect(task).toEqual({
      name: 'Study',
      factor: 'Normal',
      last_date: null,
      start_date: null,
      completed: false,
      completion_date: null,
      archived: false,
      recurrence: 'none',
      recurrence_rule: null,
      tags: ['os', 'algorithms'],
      links: [{ title: 'ok.example.com', url: 'https://ok.example.com/a' }],
      subtasks: [{ id: NOW, title: 'ok', completed: false }],
      cf_contest_id: null
    });
  });

  it('validates and completes recurrence rules', () => {
    expect(normalizeTask({
      name: 'Gym', recurrence: 'weekly', last_date: '2026-11-25',
      recurrence_rule: { interval: 2, weekdays: [1, 3, 99] }
    }).task.recurrence_rule).toEqual({ interval: 2, weekdays: [1, 3] });

    // Old backups without a rule get one derived from the deadline
    expect(normalizeTask({ name: 'Rent', recurrence: 'monthly', last_date: '2027-01-31' })
      .task.recurrence_rule).toEqual({ interval: 1, monthDay: 31 });

    // A rule on a one-off task is dropped
    expect(normalizeTask({ name: 'X', recurrence: 'none', recurrence_rule: { interval: 3 } })
      .task.recurrence_rule).toBeNull();
  });

  it('caps very long names', () => {
    expect(normalizeTask({ name: 'x'.repeat(2000) }).task.name).toHaveLength(500);
  });
});

describe('prepareImport', () => {
  it('round-trips a JSON export', () => {
    const json = toExportJson([{ ...fullTask, recurrence_rule: { interval: 2, weekdays: [1, 5] } }]);
    const { tasks, duplicates, invalid } = prepareImport(json, 'backup.json', [], NOW);

    expect(duplicates).toBe(0);
    expect(invalid).toEqual([]);
    expect(tasks[0]).toMatchObject({
      name: fullTask.name,
      factor: 'Urgent',
      last_date: '2026-11-27',
      start_date: '2026-11-20',
      completed: true,
      completion_date: '2026-11-26T09:30:00.000Z',
      recurrence: 'weekly',
      recurrence_rule: { interval: 2, weekdays: [1, 5] },
      tags: ['dbms', 'college'],
      links: fullTask.links
    });
    expect(tasks[0].subtasks.map(({ title, completed }) => ({ title, completed })))
      .toEqual([{ title: 'Outline', completed: true }, { title: 'Draft', completed: false }]);
  });

  it('round-trips a CSV export, including a formula-looking name', () => {
    const tricky = { ...fullTask, name: '=SUM(A1:A9)', links: [{ title: 'x', url: 'https://example.com/x' }] };
    const { tasks } = prepareImport(toCsv([tricky]), 'tasks.csv', [], NOW);

    expect(tasks[0]).toMatchObject({
      name: '=SUM(A1:A9)',
      factor: 'Urgent',
      last_date: '2026-11-27',
      completed: true,
      recurrence: 'weekly',
      tags: ['dbms', 'college'],
      links: [{ title: 'example.com', url: 'https://example.com/x' }]
    });
    expect(tasks[0].subtasks.map(s => s.completed)).toEqual([true, false]);
  });

  it('accepts a minimal spreadsheet with just names', () => {
    const { tasks } = prepareImport('Name\nBuy milk\nCall bank\n', 'list.csv', [], NOW);

    expect(tasks.map(t => t.name)).toEqual(['Buy milk', 'Call bank']);
    expect(tasks[0]).toMatchObject({ factor: 'Normal', completed: false, recurrence: 'none' });
  });

  it('accepts a bare JSON array', () => {
    expect(prepareImport('[{"name":"A"}]', 'x.json', [], NOW).tasks).toHaveLength(1);
  });

  it('skips duplicates of existing tasks, within the file, and known contests', () => {
    const existing = [
      { name: 'Buy Milk', last_date: null },
      { name: 'Contest', last_date: '2026-12-01', cf_contest_id: 2000 }
    ];
    const json = JSON.stringify([
      { name: 'buy milk' },                                   // existing (case-insensitive)
      { name: 'Gym', last_date: '2026-12-01' },
      { name: 'Gym', last_date: '2026-12-01' },               // repeated in file
      { name: 'Gym', last_date: '2026-12-02' },               // different date: kept
      { name: 'Renamed contest', cf_contest_id: 2000 }        // same contest
    ]);

    const result = prepareImport(json, 'x.json', existing, NOW);

    expect(result.tasks.map(t => `${t.name} ${t.last_date}`)).toEqual(['Gym 2026-12-01', 'Gym 2026-12-02']);
    expect(result.duplicates).toBe(3);
  });

  it('reports invalid rows with their row numbers', () => {
    const { tasks, invalid } = prepareImport('name,priority\nGood,Urgent\n,Later\n', 'x.csv', [], NOW);

    expect(tasks).toHaveLength(1);
    expect(invalid).toEqual(['row 3: missing name']);
  });

  it('rejects unusable files with a clear message', () => {
    expect(() => prepareImport('{ nope', 'x.json')).toThrow('not valid JSON');
    expect(() => prepareImport('{"items": []}', 'x.json')).toThrow('No "tasks" list');
    expect(() => prepareImport('title,date\nA,B', 'x.csv')).toThrow('"name" column');

    const tooMany = JSON.stringify(Array.from({ length: MAX_IMPORT_TASKS + 1 }, () => ({ name: 'x' })));
    expect(() => prepareImport(tooMany, 'x.json')).toThrow('limit is 5000');
  });
});
