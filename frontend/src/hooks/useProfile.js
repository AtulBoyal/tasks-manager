import { useEffect, useState } from 'react';
import { profileService } from '../services/profileService';

export const useProfile = (session) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    const loadProfile = async () => {
      let data = await profileService.getProfile(session.user.id);

      if (!data) {
        data = await profileService.createProfile(session.user.id);
      }

      setProfile(data);
    };

    loadProfile();
  }, [session]);

  const updateProfile = async (updates) => {
    setLoading(true);
    const updated = await profileService.updateProfile(
      session.user.id,
      updates
    );

    setProfile(updated);
    setLoading(false);
  };

  return {
    profile,
    updateProfile,
    loading
  };
};