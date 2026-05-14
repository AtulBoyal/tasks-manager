import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useRealtimeTasks = ({
  isLocallyUnlocked,
  setTasks,
  userId
}) => {

  useEffect(() => {
    if (!isLocallyUnlocked || !userId) return;

    const taskListener = supabase
      .channel('public:tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {

          if (
            payload.eventType === 'INSERT' ||
            payload.eventType === 'UPDATE'
          ) {

            setTasks((prevTasks) => {
              const exists = prevTasks.some(
                t => t.id === payload.new.id
              );

              if (exists) {
                return prevTasks.map(t =>
                  t.id === payload.new.id
                    ? payload.new
                    : t
                );
              }

              return [...prevTasks, payload.new];
            });

          } else if (payload.eventType === 'DELETE') {

            setTasks(prevTasks =>
              prevTasks.filter(
                t => t.id !== payload.old.id
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskListener);
    };

  }, [isLocallyUnlocked, setTasks]);

};