'use client';

import { removePushSubscription, savePushSubscription } from '@/actions/push';

/** Push no browser: suporte, subscrição e cancelamento. Só depois de um gesto do utilizador. */
export type PushSupport = 'supported' | 'ios-needs-install' | 'unsupported' | 'denied';

export function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS apresenta-se como Mac com ecrã táctil.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function detectPushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIos() && !isStandalone()) return 'ios-needs-install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'supported';
}

function vapidKey(): Uint8Array<ArrayBuffer> | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return null;
  const padded = (key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** O SW só é registado automaticamente em produção; aqui garante-se que existe. */
async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/');
  if (!existing) await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (detectPushSupport() !== 'supported') return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Pede permissão → subscreve → grava no servidor. `true` se ficou activo neste dispositivo. */
export async function subscribePush(): Promise<boolean> {
  if (detectPushSupport() !== 'supported') return false;
  const key = vapidKey();
  if (!key) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  try {
    const reg = await registration();
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
    const json = sub.toJSON();
    const res = await savePushSubscription(
      { endpoint: json.endpoint ?? sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' } },
      navigator.userAgent,
    );
    return res.ok;
  } catch (err) {
    console.warn('[push] Falha na subscrição:', err);
    return false;
  }
}

export async function unsubscribePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await removePushSubscription(sub.endpoint);
  await sub.unsubscribe().catch(() => undefined);
}
