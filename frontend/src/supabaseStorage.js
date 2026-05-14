import { supabase } from './supabaseClient';

export const apiStorage = {
  getTasks: async () => {
    // const { data, error } = await supabase.from('tasks').select('*');
    const data = await taskService.fetchTasks(userId);
    if (error) throw error;
    return { tasks: data };
  },

  saveTasks: async (tasks) => {
    // const { error } = await supabase.from('tasks').upsert(tasks);
    const error = await taskService.bulkUpsertTasks(tasks);
    
    // ✨ Throw the exact Supabase error message so we can see it
    if (error) {
      console.error("SUPABASE ERROR DETAILS:", error);
      throw new Error(error.message); 
    }
  }
};