import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X, UserPlus } from 'lucide-react';
import { VISIT_TYPES, type CreateInviteInput } from '@vms/shared';
import { apiFetch, ApiError } from '../../lib/api';
import { Button, Input, Label, Select, Textarea, Card } from '../../components/ui/primitives';
import type { Office, Visitor } from '../../types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

interface Guest {
  key: string;
  visitorId?: string;
  fullName: string;
  phone: string;
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function InviteVisitors() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [visitType, setVisitType] = useState(VISIT_TYPES[0]);
  const [officeId, setOfficeId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [note, setNote] = useState('');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState('');
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: offices } = useQuery({
    queryKey: ['offices'],
    queryFn: () => apiFetch<{ offices: Office[] }>('/offices'),
  });
  const { data: quota } = useQuery({
    queryKey: ['invites', 'quota'],
    queryFn: () => apiFetch<{ remaining: number }>('/invites/quota'),
  });
  const { data: searchResults } = useQuery({
    queryKey: ['visitors', 'search', debouncedSearch],
    queryFn: () =>
      apiFetch<{ visitors: Visitor[] }>(
        `/visitors/search?q=${encodeURIComponent(debouncedSearch)}`,
      ),
    enabled: debouncedSearch.trim().length > 0,
  });

  const addExisting = (v: Visitor) => {
    if (guests.some((g) => g.visitorId === v.id)) return;
    setGuests((g) => [...g, { key: v.id, visitorId: v.id, fullName: v.fullName, phone: v.phone }]);
    setSearch('');
  };

  const addNew = () => {
    if (!newGuestName.trim() || !newGuestPhone.trim()) return;
    setGuests((g) => [
      ...g,
      { key: `new-${Date.now()}`, fullName: newGuestName.trim(), phone: newGuestPhone.trim() },
    ]);
    setNewGuestName('');
    setNewGuestPhone('');
  };

  const removeGuest = (key: string) => setGuests((g) => g.filter((x) => x.key !== key));

  const isValid = useMemo(
    () => title.trim() && officeId && date && startTime && endTime && guests.length > 0,
    [title, officeId, date, startTime, endTime, guests],
  );

  const createInvite = useMutation({
    mutationFn: () => {
      const windowStart = new Date(`${date}T${startTime}:00`);
      const windowEnd = new Date(`${date}T${endTime}:00`);
      const body: CreateInviteInput = {
        title: title.trim(),
        visitType,
        officeId,
        windowStart,
        windowEnd,
        note: note.trim() || undefined,
        guests: guests.map((g) =>
          g.visitorId ? { visitorId: g.visitorId } : { fullName: g.fullName, phone: g.phone },
        ),
      };
      return apiFetch('/invites', { method: 'POST', body });
    },
    onSuccess: () => {
      toast.success('Invite sent — guests will receive a QR e-pass by email');
      setTitle('');
      setNote('');
      setGuests([]);
      void queryClient.invalidateQueries({ queryKey: ['invites', 'quota'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create invite');
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <Card className="p-6">
        <h1 className="mb-6 text-xl font-semibold text-navy-900">Invite Visitors</h1>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Design review with Acme Corp"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="visitType">Type of Visit *</Label>
              <Select
                id="visitType"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as typeof visitType)}
              >
                {VISIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="office">Office *</Label>
              <Select id="office" value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
                <option value="">Select office</option>
                {offices?.offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="start">Start time *</Label>
              <Input
                id="start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end">End time *</Label>
              <Input
                id="end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="note">Personal note</Label>
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <p className="text-sm text-navy-500">
            Remaining pre-approvals today:{' '}
            <span className="font-semibold text-navy-800">{quota?.remaining ?? '—'}</span>
          </p>
        </Card>

        <Card className="p-5">
          <Label htmlFor="guestSearch">Search guests</Label>
          <Input
            id="guestSearch"
            placeholder="Name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchResults && searchResults.visitors.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-navy-100">
              {searchResults.visitors.map((v) => (
                <button
                  key={v.id}
                  onClick={() => addExisting(v)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-navy-50"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-600">
                    {initials(v.fullName)}
                  </span>
                  <span>
                    {v.fullName} <span className="text-navy-300">· {v.phone}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 border-t border-navy-100 pt-4">
            <p className="mb-2 text-sm font-medium text-navy-600">Add a new guest</p>
            <div className="flex gap-2">
              <Input
                placeholder="Full name"
                value={newGuestName}
                onChange={(e) => setNewGuestName(e.target.value)}
              />
              <Input
                placeholder="Phone"
                value={newGuestPhone}
                onChange={(e) => setNewGuestPhone(e.target.value)}
              />
              <Button variant="secondary" onClick={addNew} type="button" aria-label="Add guest">
                <UserPlus size={16} />
              </Button>
            </div>
          </div>

          <div className="mt-4 border-t border-navy-100 pt-4">
            <p className="mb-2 text-sm font-medium text-navy-600">Added Guests ({guests.length})</p>
            {guests.length === 0 && <p className="text-sm text-navy-300">No guests added yet</p>}
            <ul className="space-y-2">
              {guests.map((g) => (
                <li
                  key={g.key}
                  className="flex items-center justify-between rounded-md bg-navy-50 px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-200 text-xs font-semibold text-navy-700">
                      {initials(g.fullName)}
                    </span>
                    {g.fullName}
                  </span>
                  <button
                    onClick={() => removeGuest(g.key)}
                    className="text-navy-400 hover:text-red-600"
                  >
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Button
          className="sticky bottom-4 w-full"
          disabled={!isValid || createInvite.isPending}
          onClick={() => createInvite.mutate()}
        >
          {createInvite.isPending ? 'Sending…' : 'Confirm Invite'}
        </Button>
      </div>
    </div>
  );
}
