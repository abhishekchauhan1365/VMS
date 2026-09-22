import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '../../lib/api';
import { useVisitSocket } from '../../hooks/useVisitSocket';
import type { Visit } from '../../types';
import {
  Button,
  Card,
  EmptyState,
  Skeleton,
  Textarea,
  Label,
} from '../../components/ui/primitives';
import { Modal } from '../../components/ui/Dialog';

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function Approvals() {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<Visit | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hosts', 'pending'],
    queryFn: () => apiFetch<{ visits: Visit[] }>('/hosts/me/pending'),
    refetchInterval: 15_000,
  });

  useVisitSocket([['hosts', 'pending']]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['hosts', 'pending'] });

  const approve = useMutation({
    mutationFn: (id: string) => apiFetch(`/visits/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Visit approved — e-pass sent');
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to approve'),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch(`/visits/${id}/reject`, { method: 'POST', body: { reason } }),
    onSuccess: () => {
      toast.success('Visit rejected');
      setRejecting(null);
      setReason('');
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to reject'),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const visits = data?.visits ?? [];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900">Approvals Inbox</h1>
      {visits.length === 0 ? (
        <EmptyState
          title="No pending requests"
          description="Walk-in visits awaiting your approval will appear here."
        />
      ) : (
        <div className="space-y-3">
          {visits.map((v) => (
            <Card key={v.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-sm font-semibold text-navy-600">
                  {initials(v.visitor.fullName)}
                </span>
                <div>
                  <p className="font-medium text-navy-900">{v.visitor.fullName}</p>
                  <p className="text-sm text-navy-400">
                    {v.purpose ?? v.visitType.replace(/_/g, ' ')}
                    {v.visitor.company ? ` · ${v.visitor.company}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setRejecting(v)}>
                  Reject
                </Button>
                <Button onClick={() => approve.mutate(v.id)} disabled={approve.isPending}>
                  Approve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject visit">
        <Label htmlFor="reason">Reason</Label>
        <Textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRejecting(null)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || reject.isPending}
            onClick={() => rejecting && reject.mutate({ id: rejecting.id, reason })}
          >
            Reject visit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
