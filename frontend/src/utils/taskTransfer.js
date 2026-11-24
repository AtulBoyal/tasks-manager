// Export and import of tasks as JSON (full backup) or CSV (spreadsheets).
// Imported data is untrusted: every field is validated and rebuilt from a
// whitelist before it is sent to the database.

import { normalizeRule } from './recurrence';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_TASKS = 5000;
export const EXPORT_VERSION = 1;

const FACTORS = ['Urgent', 'Normal', 'Later'];
const RECURRENCES = ['none', 'daily', 'weekly', 'monthly'];
const MAX_NAME_LENGTH = 500;
const MAX_TAGS = 20;
const MAX_LINKS = 20;
const MAX_SUBTASKS = 100;

export const CSV_COLUMNS = [
  'name', 'priority', 'deadline', 'start_date', 'status',
  'completed_at', 'recurrence', 'tags', 'links', 'subtasks'
];

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

// The fields a backup keeps (no user_id / id: imports always get fresh ones)
const exportFields = (task) => ({
  name: task.name,
  factor: task.factor ?? null,
  last_date: task.last_date ?? null,
  start_date: task.start_date ?? null,
  completed: !!task.completed,
  completion_date: task.completion_date ?? null,
  archived: !!task.archived,
  recurrence: task.recurrence ?? 'none',
  recurrence_rule: task.recurrence_rule ?? null,
  tags: Array.isArray(task.tags) ? task.tags : [],
  links: Array.isArray(task.links) ? task.links : [],
  subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
  cf_contest_id: task.cf_contest_id ?? null
});

export const toExportJson = (tasks, now = new Date()) =>
  JSON.stringify(
    {
      app: 'TaskVault',
      version: EXPORT_VERSION,
      exported_at: now.toISOString(),
      tasks: tasks.map(exportFields)
    },
    null,
    2
  );

const statusOf = (task) =>
  task.archived ? 'archived' : task.completed ? 'completed' : 'active';

// Spreadsheet apps run cells starting with these as formulas
const FORMULA_START = /^[=+\-@\t\r]/;

export const escapeCsvCell = (value) => {
  let text = value == null ? '' : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const linkUrl = (link) => (typeof link === 'string' ? link : link?.url);

export const toCsv = (tasks) => {
  const rows = tasks.map((task) => {
    const t = exportFields(task);
    return [
      t.name,
      t.factor ?? '',
      t.last_date ?? '',
      t.start_date ?? '',
      statusOf(t),
      t.completion_date ?? '',
      t.recurrence,
      t.tags.join('; '),
      t.links.map(linkUrl).filter(Boolean).join('; '),
      t.subtasks.map((st) => `${st.completed ? '[x] ' : ''}${st.title}`).join('; ')
    ].map(escapeCsvCell).join(',');
  });

  return [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
};

export const exportFileName = (extension, now = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `tasks-manager-export-${date}.${extension}`;
};

// ---------------------------------------------------------------------------
// CSV parsing (RFC 4180: quoted fields, "" escapes, newlines inside quotes)
// ---------------------------------------------------------------------------

export const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, ''); // strip BOM from Excel exports

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop completely empty lines
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
};

// Undo escapeCsvCell's formula guard: "'=SUM(A1)" -> "=SUM(A1)"
const unescapeFormula = (value) =>
  value.startsWith("'") && FORMULA_START.test(value.slice(1)) ? value.slice(1) : value;

const splitList = (value) =>
  (value || '').split(';').map((part) => part.trim()).filter(Boolean);

const csvRowToRaw = (headers, cells) => {
  const get = (column) => unescapeFormula((cells[headers.indexOf(column)] ?? '').trim());
  const status = get('status').toLowerCase();

  return {
    name: get('name'),
    factor: get('priority'),
    last_date: get('deadline'),
    start_date: get('start_date'),
    completed: status === 'completed',
    archived: status === 'archived',
    completion_date: get('completed_at'),
    recurrence: get('recurrence').toLowerCase(),
    tags: splitList(get('tags')),
    links: splitList(get('links')),
    subtasks: splitList(get('subtasks')).map((entry) => {
      const done = /^\[x\]\s*/i.test(entry);
      return { title: entry.replace(/^\[x\]\s*/i, ''), completed: done };
    })
  };
};

// ---------------------------------------------------------------------------
// Validation: rebuild each task from known-good fields only
// ---------------------------------------------------------------------------

const isValidDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};

const cleanDate = (value) => (isValidDateOnly(value) ? value : null);

const cleanTimestamp = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
};

const cleanTags = (tags) => [
  ...new Set(
    (Array.isArray(tags) ? tags : [])
      .filter((tag) => typeof tag === 'string')
      .map((tag) => tag.trim().replace(/^#/, '').toLowerCase().slice(0, 50))
      .filter(Boolean)
  )
].slice(0, MAX_TAGS);

const cleanLinks = (links) =>
  (Array.isArray(links) ? links : [])
    .map((link) => {
      const url = typeof link === 'string' ? link : link?.url;
      if (typeof url !== 'string') return null;
      try {
        const parsed = new URL(url.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        const title = typeof link?.title === 'string' && link.title.trim()
          ? link.title.trim().slice(0, 200)
          : parsed.hostname.replace(/^www\./, '');
        return { title, url: parsed.href };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(0, MAX_LINKS);

const cleanSubtasks = (subtasks, idBase) =>
  (Array.isArray(subtasks) ? subtasks : [])
    .filter((st) => st && typeof st.title === 'string' && st.title.trim())
    .slice(0, MAX_SUBTASKS)
    .map((st, i) => ({
      id: idBase + i,
      title: st.title.trim().slice(0, MAX_NAME_LENGTH),
      completed: st.completed === true
    }));

const cleanContestId = (value) =>
  Number.isSafeInteger(value) && value > 0 ? value : null;

// Returns { task } or { error }
export const normalizeTask = (raw, idBase = Date.now()) => {
  if (!raw || typeof raw !== 'object') return { error: 'not a task' };

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return { error: 'missing name' };

  const completed = raw.completed === true;
  const recurrence = RECURRENCES.includes(raw.recurrence) ? raw.recurrence : 'none';
  const lastDate = cleanDate(raw.last_date);

  return {
    task: {
      name: name.slice(0, MAX_NAME_LENGTH),
      factor: FACTORS.includes(raw.factor) ? raw.factor : 'Normal',
      last_date: lastDate,
      start_date: cleanDate(raw.start_date),
      completed,
      completion_date: completed ? cleanTimestamp(raw.completion_date) : null,
      archived: raw.archived === true,
      recurrence,
      // Validated and completed with defaults; null for one-off tasks
      recurrence_rule: normalizeRule(recurrence, raw.recurrence_rule, lastDate),
      tags: cleanTags(raw.tags),
      links: cleanLinks(raw.links),
      subtasks: cleanSubtasks(raw.subtasks, idBase),
      cf_contest_id: cleanContestId(raw.cf_contest_id)
    }
  };
};

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

const looksLikeJson = (fileName, text) =>
  /\.json$/i.test(fileName || '') || /^\s*[[{]/.test(text);

const readRawTasks = (text, fileName) => {
  if (looksLikeJson(fileName, text)) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('The file is not valid JSON.');
    }
    const tasks = Array.isArray(data) ? data : data?.tasks;
    if (!Array.isArray(tasks)) throw new Error('No "tasks" list found in the JSON file.');
    return { rows: tasks, label: (i) => `task ${i + 1}` };
  }

  const [headerRow, ...dataRows] = parseCsv(text);
  const headers = (headerRow || []).map((h) => h.trim().toLowerCase());
  if (!headers.includes('name')) throw new Error('The CSV needs a "name" column.');

  return {
    rows: dataRows.map((cells) => csvRowToRaw(headers, cells)),
    label: (i) => `row ${i + 2}` // +1 for the header, +1 for 1-based rows
  };
};

const dedupeKey = (task) => `${task.name.trim().toLowerCase()}|${task.last_date ?? ''}`;

// Parses a file's text and splits it into importable tasks and skipped rows.
export const prepareImport = (text, fileName, existingTasks = [], now = Date.now()) => {
  const { rows, label } = readRawTasks(text, fileName);

  if (rows.length > MAX_IMPORT_TASKS) {
    throw new Error(`The file has ${rows.length} tasks; the limit is ${MAX_IMPORT_TASKS}.`);
  }

  const seenKeys = new Set(existingTasks.map(dedupeKey));
  const seenContests = new Set(existingTasks.map((t) => t.cf_contest_id).filter(Boolean));

  const tasks = [];
  const invalid = [];
  let duplicates = 0;

  rows.forEach((raw, i) => {
    const { task, error } = normalizeTask(raw, now + i * 1000);
    if (error) {
      invalid.push(`${label(i)}: ${error}`);
      return;
    }

    const key = dedupeKey(task);
    if (seenKeys.has(key) || (task.cf_contest_id && seenContests.has(task.cf_contest_id))) {
      duplicates++;
      return;
    }

    seenKeys.add(key);
    if (task.cf_contest_id) seenContests.add(task.cf_contest_id);
    tasks.push(task);
  });

  return { tasks, duplicates, invalid };
};
