import { supabase } from './supabaseClient';

export const apiStorage = {
  getTasks: async () => {
    // Supabase automatically applies the auth token and RLS policies!
    const { data, error } = await supabase
      .from('tasks')
      .select('*');

    if (error) throw error;
    return { tasks: data };
  },

  saveTasks: async (tasks) => {
    // Note: With RLS, you generally Upsert (update/insert) tasks. 
    const { error } = await supabase
      .from('tasks')
      .upsert(tasks);

    if (error) throw error;
  }
};