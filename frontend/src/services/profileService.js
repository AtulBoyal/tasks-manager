import { supabase } from '../supabaseClient';

export const profileService = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    return data;
  },

  async createProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  }
};