import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useVisitSocket } from '../../hooks/useVisitSocket';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { Paginated, Visit } from '../../types';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Select,
  Skeleton,
  StatusBadge,
} from '../../components/ui/primitives';
import { VISIT_STATUSES } from '@vms/shared';
import { GuestDetailsDrawer } from './GuestDetailsDrawer';

const QUERY_KEY = ['visits', 'board'];

export default function Board() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: [...QUERY_KEY, debouncedSearch, status, date],
      queryFn: ({ pageParam }: { pageParam: string | undefined }) => {
        const params = new URLSearchParams({ limit: '25' });
        if (pageParam) params.set('cursor', pageParam);
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (status) params.set('status', status);
        if (date) {
          params.set('dateFrom', `${date}T00:00:00.000Z`);
          params.set('dateTo', `${date}T23:59:59.999Z`);
        }
        return apiFetch<Paginated<Visit>>(`/visits?${params.toString()}`);
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  useVisitSocket([QUERY_KEY]);

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

  const visits = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-navy-900">
          All <span className="text-navy-400">({visits.length})</span>
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search visitor or host"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
            <option value="">All statuses</option>
            {VISIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button
            variant="secondary"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
              void refetch();
            }}
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <EmptyState title="No visits match these filters" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-100 text-left text-navy-400">
              <tr>
                <th className="px-4 py-3 font-medium">Visitor + Host</th>
                <th className="px-4 py-3 font-medium">Type of Invite</th>
                <th className="px-4 py-3 font-medium">Entry Time</th>
                <th className="px-4 py-3 font-medium">Exit Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedVisitId(v.id)}
                  className="cursor-pointer border-b border-navy-50 last:border-0 hover:bg-navy-50/60"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-800">{v.visitor.fullName}</p>
                    <p className="text-navy-400">→ {v.host.name}</p>
                  </td>
                  <td className="px-4 py-3 text-navy-600">{v.visitType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-navy-600">
                    {v.checkInAt ? format(new Date(v.checkInAt), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3 text-navy-600">
                    {v.checkOutAt ? format(new Date(v.checkOutAt), 'MMM d, HH:mm') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status} />
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

      <GuestDetailsDrawer visitId={selectedVisitId} onClose={() => setSelectedVisitId(null)} />
    </div>
  );
}
