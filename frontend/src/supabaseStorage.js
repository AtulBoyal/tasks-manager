import { supabase } from './supabaseClient';

export const apiStorage = {
  getTasks: async () => {
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;
    return { tasks: data };
  },

  saveTasks: async (tasks) => {
    const { error } = await supabase.from('tasks').upsert(tasks);
    
    // ✨ Throw the exact Supabase error message so we can see it
    if (error) {
      console.error("SUPABASE ERROR DETAILS:", error);
      throw new Error(error.message); 
    }
  }
};