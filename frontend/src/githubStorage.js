const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
const REPO_OWNER = "AtulBoyal";
const REPO_NAME = "Tasks_Manager"; // 👈 Change this to your actual repo name
const FILE_PATH = "data.json";
const GITHUB_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${FILE_PATH}`;

const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
};

export const githubStorage = {
    // GET: Fetch all tasks
    async getTasks() {
        try {
            const res = await fetch(GITHUB_API_URL, { headers, cache: 'no-store' });
            if (res.status === 404) return { tasks: [], sha: null }; // File doesn't exist yet
            const data = await res.json();
            const tasks = JSON.parse(atob(data.content)); // Decode Base64 to String to JSON
            return { tasks, sha: data.sha };
        } catch (error) {
            console.error("Error fetching from GitHub:", error);
            return { tasks: [], sha: null };
        }
    },

    // SAVE: Updates the entire file
    async saveTasks(updatedTasks, sha) {
        const body = {
            message: "Update tasks.json",
            content: btoa(JSON.stringify(updatedTasks, null, 2)), // Encode to Base64
            sha: sha,
        };

        const res = await fetch(GITHUB_API_URL, {
            method: "PUT",
            headers,
            body: JSON.stringify(body),
        });
        return res.json();
    }
};