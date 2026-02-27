export default async function handler(req, res) {
  // 1. These variables live SECURELY on Vercel's servers now.
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN; 
  const CORRECT_PASSWORD = process.env.TASKS_PASSWORD;
  
  // 2. Setup GitHub Info
  const REPO_OWNER = "AtulBoyal";
  const REPO_NAME = "Tasks_Manager"; 
  const FILE_PATH = "data.json"; // Ensure this matches your GitHub file
  const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  };

  // 3. SECURITY GATE: Check the password sent from the React app
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CORRECT_PASSWORD}`) {
    return res.status(401).json({ error: "Unauthorized: Invalid Password" });
  }

  // 4. Handle GET Request (Fetching tasks)
  if (req.method === 'GET') {
    try {
      const ghRes = await fetch(GITHUB_API_URL, { headers, cache: 'no-store' });
      if (ghRes.status === 404) return res.status(200).json({ tasks: [] });
      
      const data = await ghRes.json();
      // Node.js uses Buffer to decode Base64 instead of atob()
      const tasks = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
      return res.status(200).json({ tasks });
    } catch (error) {
      return res.status(500).json({ error: "Failed to fetch from GitHub" });
    }
  }

  // 5. Handle POST Request (Saving tasks)
  if (req.method === 'POST') {
    try {
      const { updatedTasks } = req.body;
      
      // Fetch latest SHA right before saving to prevent conflicts
      const ghRes = await fetch(GITHUB_API_URL, { headers });
      const data = await ghRes.json();
      const sha = data.sha;

      const body = {
        message: "Update data.json via Secure Vercel API",
        // Node.js uses Buffer to encode Base64 instead of btoa()
        content: Buffer.from(JSON.stringify(updatedTasks, null, 2)).toString('base64'),
        sha: sha,
      };

      const putRes = await fetch(GITHUB_API_URL, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      const putData = await putRes.json();
      return res.status(200).json({ success: true, data: putData });
    } catch (error) {
      return res.status(500).json({ error: "Failed to save to GitHub" });
    }
  }

  // If React sends anything other than GET or POST
  return res.status(405).json({ error: "Method not allowed" });
}