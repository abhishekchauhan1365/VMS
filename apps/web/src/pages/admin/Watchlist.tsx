import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import type { Visitor } from '../../types';
import { Button, Card, EmptyState, Input } from '../../components/ui/primitives';
import { ConfirmDialog } from '../../components/ui/Dialog';

export default function Watchlist() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [toRemove, setToRemove] = useState<Visitor | null>(null);

  const { data } = useQuery({
    queryKey: ['admin', 'watchlist'],
    queryFn: () => apiFetch<{ watchlist: Visitor[] }>('/admin/watchlist'),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'watchlist'] });

  const add = useMutation({
    mutationFn: () =>
      apiFetch('/admin/watchlist', {
        method: 'POST',
        body: { phone, fullName: fullName || undefined },
      }),
    onSuccess: () => {
      toast.success('Added to watchlist');
      setPhone('');
      setFullName('');
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to add'),
  });

  const remove = useMutation({
    mutationFn: (visitorId: string) =>
      apiFetch(`/admin/watchlist/${visitorId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Removed from watchlist');
      setToRemove(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to remove'),
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900">Watchlist</h1>
      <Card className="mb-6 max-w-lg p-6">
        <div className="flex gap-2">
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input
            placeholder="Name (optional)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Button onClick={() => add.mutate()} disabled={!phone.trim() || add.isPending}>
            Add
          </Button>
        </div>
      </Card>

      {!data?.watchlist.length ? (
        <EmptyState title="No one on the watchlist" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-100 text-left text-navy-400">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.watchlist.map((v) => (
                <tr key={v.id} className="border-b border-navy-50 last:border-0">
                  <td className="px-4 py-3 text-navy-800">{v.fullName}</td>
                  <td className="px-4 py-3 text-navy-600">{v.phone}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setToRemove(v)}
                      className="text-navy-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove.id)}
        title="Remove from watchlist?"
        description={`${toRemove?.fullName ?? ''} will be able to check in normally again.`}
        confirmLabel="Remove"
        destructive
        loading={remove.isPending}
      />
    </div>
  );
}
