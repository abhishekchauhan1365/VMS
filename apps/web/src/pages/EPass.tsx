import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import { apiFetch } from '../lib/api';
import { Card, StatusBadge } from '../components/ui/primitives';

interface PublicPass {
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  visit: {
    status: string;
    visitType: string;
    windowStart: string;
    windowEnd: string;
    visitor: { fullName: string; company: string | null; photoUrl: string | null };
    host: { name: string };
    office: { name: string };
  };
}

export default function EPass() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['pass', token],
    queryFn: () =>
      apiFetch<{ pass: PublicPass }>(`/passes/${token}/public`, { skipAuthRetry: true }),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-navy-400">Loading…</div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-navy-400">
        Pass not found or expired
      </div>
    );
  }

  const { visit } = data.pass;

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50 p-6 print:bg-white">
      <Card className="w-full max-w-sm overflow-hidden">
        <div className="bg-navy-700 px-6 py-4 text-center text-white">
          <p className="text-xs uppercase tracking-wide text-navy-200">Visitor Pass</p>
          <p className="text-lg font-bold">{visit.office.name}</p>
        </div>
        <div className="space-y-4 p-6 text-center">
          {visit.visitor.photoUrl && (
            <img
              src={visit.visitor.photoUrl}
              alt={visit.visitor.fullName}
              className="mx-auto h-24 w-24 rounded-full object-cover"
            />
          )}
          <div>
            <p className="text-lg font-semibold text-navy-900">{visit.visitor.fullName}</p>
            {visit.visitor.company && (
              <p className="text-sm text-navy-400">{visit.visitor.company}</p>
            )}
          </div>
          <div className="flex justify-center">
            <StatusBadge status={visit.status} />
          </div>
          <div className="flex justify-center py-2">
            <QRCodeSVG value={token ?? ''} size={160} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-left text-sm">
            <div>
              <dt className="text-navy-400">Host</dt>
              <dd className="text-navy-800">{visit.host.name}</dd>
            </div>
            <div>
              <dt className="text-navy-400">Type</dt>
              <dd className="text-navy-800">{visit.visitType.replace(/_/g, ' ')}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-navy-400">Window</dt>
              <dd className="text-navy-800">
                {format(new Date(visit.windowStart), 'MMM d, HH:mm')} –{' '}
                {format(new Date(visit.windowEnd), 'HH:mm')}
              </dd>
            </div>
          </dl>
          <button
            onClick={() => window.print()}
            className="mt-2 text-sm text-navy-500 underline print:hidden"
          >
            Print badge
          </button>
        </div>
      </Card>
    </div>
  );
}
