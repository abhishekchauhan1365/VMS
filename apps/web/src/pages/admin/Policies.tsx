import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch, ApiError } from '../../lib/api';
import { Button, Card, Input, Label } from '../../components/ui/primitives';

const FIELDS: Array<{ key: string; label: string; help: string }> = [
  {
    key: 'MAX_PREAPPROVALS_PER_HOST_PER_DAY',
    label: 'Max pre-approvals per host per day',
    help: 'Daily invite quota enforced via Redis (O(1) check).',
  },
  {
    key: 'OVERSTAY_MINUTES',
    label: 'Overstay threshold (minutes)',
    help: 'Minutes after check-in before a visit is flagged as overstaying.',
  },
  {
    key: 'PENDING_APPROVAL_TIMEOUT_MINUTES',
    label: 'Pending approval timeout (minutes)',
    help: 'Minutes a walk-in waits for host approval before auto-expiring.',
  },
];

export default function Policies() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin', 'policies'],
    queryFn: () => apiFetch<{ policies: Record<string, string> }>('/admin/policies'),
  });
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data) setValues(data.policies);
  }, [data]);

  const save = useMutation({
    mutationFn: () => apiFetch('/admin/policies', { method: 'PUT', body: values }),
    onSuccess: () => {
      toast.success('Policies updated');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'policies'] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed to save'),
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900">Policies</h1>
      <Card className="max-w-lg space-y-4 p-6">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              type="number"
              value={values[f.key] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
            />
            <p className="mt-1 text-xs text-navy-400">{f.help}</p>
          </div>
        ))}
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save policies'}
        </Button>
      </Card>
    </div>
  );
}
