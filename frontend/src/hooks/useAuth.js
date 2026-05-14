import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export const useAuth = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // INITIAL SESSION
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);

      // CLEAN HASH URL
      if (
        session &&
        window.location.hash &&
        window.location.hash.includes('access_token')
      ) {
        setTimeout(() => {
          window.history.replaceState(
            null,
            document.title,
            window.location.pathname
          );
        }, 100);
      }
    });

    // AUTH LISTENER
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (
        event === 'SIGNED_IN' &&
        window.location.hash &&
        window.location.hash.includes('access_token')
      ) {
        setTimeout(() => {
          window.history.replaceState(
            null,
            document.title,
            window.location.pathname
          );
        }, 100);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    loading
  };
};