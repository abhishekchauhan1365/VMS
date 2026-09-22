import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiFetch } from '../../lib/api';
import type { Visit } from '../../types';
import { Card, EmptyState, Skeleton, StatusBadge } from '../../components/ui/primitives';

export default function History() {
  const { data, isLoading } = useQuery({
    queryKey: ['hosts', 'history'],
    queryFn: () => apiFetch<{ visits: Visit[] }>('/hosts/me/history'),
  });

  const visits = data?.visits ?? [];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-navy-900">My Visits</h1>
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <EmptyState title="No visit history yet" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-100 text-left text-navy-400">
              <tr>
                <th className="px-4 py-3 font-medium">Visitor</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Window</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id} className="border-b border-navy-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-800">{v.visitor.fullName}</p>
                    <p className="text-navy-400">{v.visitor.company}</p>
                  </td>
                  <td className="px-4 py-3 text-navy-600">{v.visitType.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-navy-600">
                    {format(new Date(v.windowStart), 'MMM d, HH:mm')} –{' '}
                    {format(new Date(v.windowEnd), 'HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
