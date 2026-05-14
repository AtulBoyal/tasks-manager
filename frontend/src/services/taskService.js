import { supabase } from '../supabaseClient';

/**
 * CREATE TASK
 */
export const createTask = async (task) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert([task])
    .select()
    .single();

  if (error) {
    console.error('FULL CREATE ERROR:', JSON.stringify(error, null, 2));
    throw error;
  }

  return data;
};

/**
 * UPDATE TASK
 */
export async function updateTask(taskId, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select();
    // .single();

  if (error) {
    console.error('Update task failed:', error);
    throw error;
  }

  return data;
}

/**
 * DELETE TASK
 */
export async function deleteTask(taskId) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Delete task failed:', error);
    throw error;
  }

  return true;
}