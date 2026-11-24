import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { profileService } from '../services/profileService';

export const useProfile = (session) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        let data = await profileService.getProfile(userId);

        if (!data) {
          data = await profileService.createProfile(userId);
        }

        if (!cancelled) setProfile(data);
      } catch (error) {
        console.error("Failed to load profile:", error);
        if (!cancelled) toast.error("Failed to load your settings");
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Throws on failure so callers can show their own message.
  const updateProfile = async (updates) => {
    if (!userId) return;

    setLoading(true);
    try {
      const updated = await profileService.updateProfile(userId, updates);
      setProfile(updated);
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    updateProfile,
    loading
  };
};
