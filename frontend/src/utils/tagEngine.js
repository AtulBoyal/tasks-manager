// src/utils/tagEngine.js

export const generateAutoTags = (taskName) => {
  const text = taskName.toLowerCase();
  const newTags = new Set(); 

  const rules = [
    { keywords: ['react', 'frontend', 'css', 'tailwind', 'ui'], tag: 'frontend' },
    { keywords: ['spring', 'java', 'maven', 'api'], tag: 'java' },
    { keywords: ['xv6', 'os', 'system call', 'risc-v', 'arm', 'memory'], tag: 'os' },
    { keywords: ['dbms', 'sql', 'query', 'database', 'b+ tree', 'relational'], tag: 'dbms' },
    { keywords: ['dp', 'bfs', 'dfs', 'graph', 'sliding window', 'prefix sum'], tag: 'algorithms' },
    { keywords: ['cf', 'codeforces', 'contest', 'upsolve', 'leetcode'], tag: 'cp' },
    { keywords: ['python', 'ml', 'ai', 'kaggle', 'dataset', 'model', 'hackathon'], tag: 'ai-ml' },
    { keywords: ['docker', 'websocket', 'node', 'deploy'], tag: 'web-dev' },
    { keywords: ['gym', 'workout', 'strength', 'muscle', 'training'], tag: 'fitness' }
  ];

  rules.forEach(rule => {
    if (rule.keywords.some(kw => text.includes(kw))) {
      newTags.add(rule.tag);
    }
  });

  return Array.from(newTags);
};