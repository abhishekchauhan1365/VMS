import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, RotateCcw, Upload } from 'lucide-react';
import { VISIT_TYPES } from '@vms/shared';
import { apiFetch, ApiError } from '../../lib/api';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useVisitSocket } from '../../hooks/useVisitSocket';
import type { Office, Visit } from '../../types';
import { Button, Card, Input, Label, Select, StatusBadge } from '../../components/ui/primitives';

interface HostOption {
  id: string;
  name: string;
  email: string;
  officeId: string | null;
}

export default function WalkIn() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [hostQuery, setHostQuery] = useState('');
  const [hostId, setHostId] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [visitType, setVisitType] = useState(VISIT_TYPES[0]);
  const [purpose, setPurpose] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [submittedVisitId, setSubmittedVisitId] = useState<string | null>(null);

  const debouncedPhone = useDebouncedValue(phone, 400);
  const debouncedHostQuery = useDebouncedValue(hostQuery, 300);

  const { data: offices } = useQuery({
    queryKey: ['offices'],
    queryFn: () => apiFetch<{ offices: Office[] }>('/offices'),
  });
  const { data: hosts } = useQuery({
    queryKey: ['hosts', 'all'],
    queryFn: () => apiFetch<{ hosts: HostOption[] }>('/hosts'),
  });
  const { data: existingVisitor } = useQuery({
    queryKey: ['visitors', 'search', debouncedPhone],
    queryFn: () =>
      apiFetch<{
        visitors: {
          fullName: string;
          phone: string;
          email: string | null;
          company: string | null;
        }[];
      }>(`/visitors/search?q=${encodeURIComponent(debouncedPhone)}`),
    enabled: debouncedPhone.trim().length >= 6,
  });

  useEffect(() => {
    const match = existingVisitor?.visitors.find((v) => v.phone === phone);
    if (match) {
      setFullName(match.fullName);
      setEmail(match.email ?? '');
      setCompany(match.company ?? '');
    }
  }, [existingVisitor, phone]);

  const filteredHosts = (hosts?.hosts ?? []).filter((h) => {
    const q = debouncedHostQuery.toLowerCase();
    return h.name.toLowerCase().includes(q) || h.email.toLowerCase().includes(q);
  });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      toast.error('Could not access camera — use file upload instead');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    setPhotoDataUrl(canvas.toDataURL('image/jpeg'));
    setPhotoFile(null);
    stopCamera();
  };

  const retake = () => {
    setPhotoDataUrl(null);
    void startCamera();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoDataUrl(URL.createObjectURL(file));
  };

  const submit = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.set(
        'visitor',
        JSON.stringify({
          fullName,
          phone,
          email: email || undefined,
          company: company || undefined,
        }),
      );
      form.set('hostId', hostId);
      form.set('officeId', officeId);
      form.set('visitType', visitType);
      if (purpose) form.set('purpose', purpose);
      const now = new Date();
      form.set('windowStart', now.toISOString());
      form.set('windowEnd', new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString());
      if (photoFile) {
        form.set('photo', photoFile);
      } else if (photoDataUrl) {
        const blob = await (await fetch(photoDataUrl)).blob();
        form.set('photo', blob, 'photo.jpg');
      }
      return apiFetch<{ visit: Visit }>('/visits/walk-in', {
        method: 'POST',
        body: form,
        isForm: true,
      });
    },
    onSuccess: (data) => {
      toast.success('Visitor registered — waiting for host approval');
      setSubmittedVisitId(data.visit.id);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Registration failed'),
  });

  const { data: statusData } = useQuery({
    queryKey: ['visits', 'detail', submittedVisitId],
    queryFn: () => apiFetch<{ visit: Visit }>(`/visits/${submittedVisitId}`),
    enabled: !!submittedVisitId,
    refetchInterval: 5000,
  });
  useVisitSocket([['visits', 'detail', submittedVisitId]]);

  const isValid = fullName.trim() && phone.trim() && hostId && officeId;

  const resetForm = () => {
    setSubmittedVisitId(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setCompany('');
    setHostId('');
    setPurpose('');
    setPhotoDataUrl(null);
    setPhotoFile(null);
  };

  if (submittedVisitId) {
    return (
      <Card className="mx-auto max-w-md p-8 text-center">
        <h2 className="mb-2 text-lg font-semibold text-navy-900">Waiting for host approval</h2>
        <div className="my-4 flex justify-center">
          <StatusBadge status={statusData?.visit.status ?? 'PENDING_APPROVAL'} />
        </div>
        <p className="mb-6 text-sm text-navy-400">
          {fullName} has been registered. The host will be notified instantly.
        </p>
        <Button variant="secondary" onClick={resetForm}>
          Register another visitor
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="p-6">
        <h1 className="mb-6 text-xl font-semibold text-navy-900">Walk-in Registration</h1>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 90000 00000"
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full name *</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="visitType">Type of visit</Label>
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
          </div>
          <div>
            <Label htmlFor="hostSearch">Host *</Label>
            <Input
              id="hostSearch"
              placeholder="Search host by name"
              value={hostId ? (hosts?.hosts.find((h) => h.id === hostId)?.name ?? '') : hostQuery}
              onChange={(e) => {
                setHostId('');
                setHostQuery(e.target.value);
              }}
            />
            {!hostId && debouncedHostQuery && (
              <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-navy-100">
                {filteredHosts.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setHostId(h.id);
                      setHostQuery('');
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-navy-50"
                  >
                    {h.name} <span className="text-navy-300">· {h.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="purpose">Purpose</Label>
            <Input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-sm font-medium text-navy-600">Visitor photo</p>
        {photoDataUrl ? (
          <div className="space-y-3">
            <img
              src={photoDataUrl}
              alt="Captured visitor"
              className="aspect-square w-full rounded-md object-cover"
            />
            <Button variant="secondary" className="w-full" onClick={retake} type="button">
              <RotateCcw size={16} /> Retake
            </Button>
          </div>
        ) : cameraOn ? (
          <div className="space-y-3">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="aspect-square w-full rounded-md bg-navy-900 object-cover"
            />
            <Button className="w-full" onClick={capture} type="button">
              <Camera size={16} /> Capture
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex aspect-square w-full items-center justify-center rounded-md bg-navy-50 text-navy-300">
              <Camera size={40} />
            </div>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => void startCamera()}
              type="button"
            >
              <Camera size={16} /> Use webcam
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload size={16} /> Upload photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        <Button
          className="mt-6 w-full"
          disabled={!isValid || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending ? 'Registering…' : 'Register visitor'}
        </Button>
      </Card>
    </div>
  );
}
