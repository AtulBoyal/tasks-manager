// src/supabaseStorage.js
import { supabase } from './supabaseClient';

// We hardcode the app password here to match your UI's security gate
const APP_PASSWORD = "8520";

export const apiStorage = {
  getTasks: async (password) => {
    if (password !== APP_PASSWORD) throw new Error("Unauthorized");
    
    // Equivalent to: SELECT * FROM tasks;
    const { data, error } = await supabase.from('tasks').select('*').order('id', { ascending: true });
    
    if (error) throw error;
    return { tasks: data || [] };
  },

  saveTasks: async (tasks, password) => {
    if (password !== APP_PASSWORD) throw new Error("Unauthorized");
    
    // 1. UPSERT: Updates existing tasks or inserts new ones based on the 'id' Primary Key
    if (tasks.length > 0) {
      const { error: upsertError } = await supabase.from('tasks').upsert(tasks);
      if (upsertError) throw upsertError;
    }

    // 2. DELETE: Remove tasks from the database that you deleted locally
    const activeIds = tasks.map(t => t.id);
    if (activeIds.length > 0) {
      const { error: deleteError } = await supabase.from('tasks')
        .delete()
        .not('id', 'in', `(${activeIds.join(',')})`);
      if (deleteError) throw deleteError;
    } else {
      // If your array is completely empty, delete all rows
      await supabase.from('tasks').delete().neq('id', 0);
    }
  }
};