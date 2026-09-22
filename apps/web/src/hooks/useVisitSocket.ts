import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';

const EVENTS = ['visit.created', 'visit.updated', 'visit.overstay', 'visit.rejected'] as const;

/** Invalidates the visit-related queries whenever the server pushes a live update. */
export function useVisitSocket(queryKeys: unknown[][]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const invalidate = () => {
      queryKeys.forEach((key) => void queryClient.invalidateQueries({ queryKey: key }));
    };

    EVENTS.forEach((event) => socket.on(event, invalidate));
    return () => {
      EVENTS.forEach((event) => socket.off(event, invalidate));
    };
  }, [queryClient]);
}
