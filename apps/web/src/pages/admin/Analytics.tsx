import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../../lib/api';
import { Card, Skeleton } from '../../components/ui/primitives';

interface Analytics {
  visitsPerDay: Array<{ day: string; count: number }>;
  byType: Array<{ visitType: string; count: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  overstayCount: number;
  avgApprovalSeconds: number | null;
}

const COLORS = [
  '#2b4c7e',
  '#4a6fa5',
  '#7c9cc4',
  '#a9c2df',
  '#1f3a63',
  '#5b8bc9',
  '#8faed0',
  '#c2d6ea',
];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-navy-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-navy-900">{value}</p>
    </Card>
  );
}

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: () => apiFetch<Analytics>('/admin/analytics'),
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  const avgApprovalMinutes = data.avgApprovalSeconds
    ? Math.round(data.avgApprovalSeconds / 60)
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-navy-900">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Overstay visits" value={String(data.overstayCount)} />
        <StatTile
          label="Avg. approval time"
          value={avgApprovalMinutes !== null ? `${avgApprovalMinutes} min` : '—'}
        />
        <StatTile
          label="Visits (last 60 days)"
          value={String(data.visitsPerDay.reduce((sum, d) => sum + d.count, 0))}
        />
      </div>

      <Card className="p-5">
        <p className="mb-4 text-sm font-medium text-navy-600">Visits per day</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data.visitsPerDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f9" />
            <XAxis
              dataKey="day"
              tickFormatter={(d: string) => format(new Date(d), 'MMM d')}
              tick={{ fontSize: 11 }}
              interval={6}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip labelFormatter={(d) => format(new Date(String(d)), 'MMM d, yyyy')} />
            <Bar dataKey="count" fill="#2b4c7e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-4 text-sm font-medium text-navy-600">Peak check-in hours</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f9" />
              <XAxis
                dataKey="hour"
                tickFormatter={(h: number) => `${h}:00`}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(h) => `${String(h)}:00`} />
              <Bar dataKey="count" fill="#4a6fa5" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <p className="mb-4 text-sm font-medium text-navy-600">By visit type</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.byType} dataKey="count" nameKey="visitType" outerRadius={80} label>
                {data.byType.map((entry, i) => (
                  <Cell key={entry.visitType} fill={COLORS[i % COLORS.length] ?? '#2b4c7e'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
