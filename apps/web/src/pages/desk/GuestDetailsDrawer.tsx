import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '../../lib/api';
import type { AuditEntry, Visit } from '../../types';
import { Button, StatusBadge, Textarea } from '../../components/ui/primitives';
import { Drawer } from '../../components/ui/Dialog';

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function GuestDetailsDrawer({
  visitId,
  onClose,
}: {
  visitId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const { data } = useQuery({
    queryKey: ['visits', 'detail', visitId],
    queryFn: () => apiFetch<{ visit: Visit; timeline: AuditEntry[] }>(`/visits/${visitId}`),
    enabled: !!visitId,
  });

  const checkOut = useMutation({
    mutationFn: () =>
      apiFetch(`/visits/${visitId}/check-out`, {
        method: 'POST',
        body: undefined,
      }),
    onSuccess: () => {
      toast.success('Checked out');
      void queryClient.invalidateQueries({ queryKey: ['visits'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Check-out failed'),
  });

  const visit = data?.visit;

  return (
    <Drawer open={!!visitId} onClose={onClose} title="Guest Details">
      {!visit ? (
        <p className="text-sm text-navy-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-sm font-semibold text-navy-600">
                {initials(visit.visitor.fullName)}
              </span>
              <div>
                <p className="font-medium text-navy-900">{visit.visitor.fullName}</p>
                <p className="text-sm text-navy-400">{visit.visitor.phone}</p>
              </div>
            </div>
            <span className="text-navy-300">→</span>
            <div className="text-right">
              <p className="font-medium text-navy-900">{visit.host.name}</p>
              <p className="text-sm text-navy-400">Host</p>
            </div>
          </div>

          <div>
            <StatusBadge status={visit.status} />
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-navy-400">Office</dt>
              <dd className="text-navy-800">{visit.office.name}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Type</dt>
              <dd className="text-navy-800">{visit.visitType.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Window</dt>
              <dd className="text-navy-800">
                {format(new Date(visit.windowStart), 'MMM d, HH:mm')} –{' '}
                {format(new Date(visit.windowEnd), 'HH:mm')}
              </dd>
            </div>
            <div>
              <dt className="text-navy-400">Purpose</dt>
              <dd className="text-navy-800">{visit.purpose ?? '—'}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-2 text-sm font-medium text-navy-600">Timeline</p>
            <ol className="space-y-2 border-l border-navy-100 pl-4">
              {data.timeline.map((t) => (
                <li key={t.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-navy-400" />
                  <p className="font-medium text-navy-700">{t.action.replace(/_/g, ' ')}</p>
                  <p className="text-navy-400">{format(new Date(t.at), 'MMM d, HH:mm:ss')}</p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-navy-700">Additional info</label>
            <Textarea
              rows={3}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes for the security team…"
            />
            <p className="mt-1 text-right text-xs text-navy-300">{notes.length}/1000</p>
          </div>

          {visit.status === 'CHECKED_IN' && (
            <Button
              className="w-full"
              onClick={() => checkOut.mutate()}
              disabled={checkOut.isPending}
            >
              {checkOut.isPending ? 'Checking out…' : 'Check Out'}
            </Button>
          )}
        </div>
      )}
    </Drawer>
  );
}
