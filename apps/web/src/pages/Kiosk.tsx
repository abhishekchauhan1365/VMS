import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, XCircle, Clock, Ban } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import type { Visit } from '../types';

type ResultState =
  | { kind: 'idle' }
  | { kind: 'success'; visit: Visit }
  | { kind: 'error'; code: string; message: string };

const SCANNER_ID = 'kiosk-qr-reader';

export default function Kiosk() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [result, setResult] = useState<ResultState>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decodedText) => {
          void handleScan(decodedText);
        },
        () => {
          // per-frame scan miss, ignore
        },
      )
      .catch(() => {
        setResult({ kind: 'error', code: 'CAMERA', message: 'Could not access camera' });
      });

    return () => {
      scanner.stop().catch(() => undefined);
    };
  }, []);

  const handleScan = async (token: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await apiFetch<{ visit: Visit }>('/passes/verify', {
        method: 'POST',
        body: { token },
        skipAuthRetry: true,
      });
      setResult({ kind: 'success', visit: data.visit });
    } catch (err) {
      if (err instanceof ApiError) {
        setResult({ kind: 'error', code: err.code, message: err.message });
      } else {
        setResult({ kind: 'error', code: 'UNKNOWN', message: 'Something went wrong' });
      }
    } finally {
      setTimeout(() => {
        setResult({ kind: 'idle' });
        setBusy(false);
      }, 4000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-900 p-6 text-white">
      <h1 className="mb-8 text-2xl font-bold">Scan your QR pass</h1>

      <div className="relative w-full max-w-sm overflow-hidden rounded-xl">
        <div id={SCANNER_ID} className="w-full" />
        {result.kind !== 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-navy-900/95 p-6 text-center">
            {result.kind === 'success' ? (
              <>
                <CheckCircle2 size={64} className="text-emerald-400" />
                <p className="text-xl font-semibold">Welcome, {result.visit.visitor.fullName}!</p>
                <p className="text-navy-300">Checked in to see {result.visit.host.name}</p>
              </>
            ) : (
              <ErrorIcon code={result.code} message={result.message} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorIcon({ code, message }: { code: string; message: string }) {
  if (code === 'PASS_ALREADY_USED') {
    return (
      <>
        <Ban size={64} className="text-amber-400" />
        <p className="text-xl font-semibold">Already used</p>
        <p className="text-navy-300">{message}</p>
      </>
    );
  }
  if (code === 'PASS_NOT_YET_VALID') {
    return (
      <>
        <Clock size={64} className="text-amber-400" />
        <p className="text-xl font-semibold">Not valid yet</p>
        <p className="text-navy-300">{message}</p>
      </>
    );
  }
  return (
    <>
      <XCircle size={64} className="text-red-400" />
      <p className="text-xl font-semibold">Scan failed</p>
      <p className="text-navy-300">{message}</p>
    </>
  );
}
