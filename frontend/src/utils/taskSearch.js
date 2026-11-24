// Search used by the dashboard filter bar.
//
//   report        -> name, tags, subtask titles, link titles or URLs contain "report"
//   #dbms         -> a tag starts with "dbms"
//   report #dbms  -> every term must match
//
// Matching is case-insensitive.

const toLower = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

// Links are { title, url } objects, or plain URL strings in older tasks
const linkTexts = (links) =>
  (Array.isArray(links) ? links : []).flatMap((link) =>
    typeof link === 'string' ? [link] : [link?.title, link?.url]
  );

const searchableText = (task) =>
  [
    task.name,
    ...(Array.isArray(task.tags) ? task.tags : []),
    ...(Array.isArray(task.subtasks) ? task.subtasks.map((st) => st?.title) : []),
    ...linkTexts(task.links)
  ]
    .map(toLower)
    .filter(Boolean);

const parseQuery = (query) =>
  toLower(query)
    .split(/\s+/)
    .filter((term) => term && term !== '#');

export const matchesSearch = (task, query) => {
  const terms = parseQuery(query);
  if (terms.length === 0) return true;

  const tags = (Array.isArray(task.tags) ? task.tags : []).map(toLower);
  const texts = searchableText(task);

  return terms.every((term) =>
    term.startsWith('#')
      ? tags.some((tag) => tag.startsWith(term.slice(1)))
      : texts.some((text) => text.includes(term))
  );
};
