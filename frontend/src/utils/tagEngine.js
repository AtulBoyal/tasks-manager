// src/utils/tagEngine.js

export const generateAutoTags = (taskName, existingTags) => {
  const text = taskName.toLowerCase();
  const newTags = new Set(existingTags); 

  const dictionary = [
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

  for (const [keyword, tag] of Object.entries(dictionary)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(text)) {
      newTags.add(tag);
    }
  }

  return Array.from(newTags);
}