import { useRef, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiFetch } from '../../lib/api';
import type { AuditEntry, Paginated } from '../../types';
import { Card, EmptyState, Skeleton } from '../../components/ui/primitives';

export default function AuditLog() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['admin', 'audit'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
      const params = new URLSearchParams({ limit: '30' });
      if (pageParam) params.set('cursor', pageParam);
      return apiFetch<Paginated<AuditEntry>>(`/admin/audit?${params.toString()}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const entries = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900">Audit Log</h1>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState title="No audit entries yet" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-100 text-left text-navy-400">
              <tr>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Change</th>
                <th className="px-4 py-3 font-medium">At</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-navy-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-navy-800">
                    {e.action.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-navy-600">{e.actor?.name ?? 'System'}</td>
                  <td className="px-4 py-3 text-navy-600">
                    {e.before ?? '—'} → {e.after ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-navy-600">
                    {format(new Date(e.at), 'MMM d, HH:mm:ss')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div ref={sentinelRef} className="h-4" />
          {isFetchingNextPage && (
            <p className="py-3 text-center text-sm text-navy-300">Loading more…</p>
          )}
        </Card>
      )}
    </div>
  );
}
