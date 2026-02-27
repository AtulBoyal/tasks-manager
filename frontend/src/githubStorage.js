export const apiStorage = {
  // Pass the password to authenticate with our backend
  async getTasks(password) {
    const res = await fetch('/api/tasks', {
      headers: { Authorization: `Bearer ${password}` }
    });
    
    if (res.status === 401) throw new Error("Unauthorized");
    if (!res.ok) throw new Error("Failed to fetch");
    
    const data = await res.json();
    return data; // Returns { tasks: [...] }
  },

  async saveTasks(updatedTasks, password) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}` 
      },
      body: JSON.stringify({ updatedTasks })
    });
    
    if (!res.ok) throw new Error("Failed to save");
    return res.json();
  }
};