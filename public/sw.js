/* MYGLOW — service worker (Fase 1) + notificações push (Fase 7). Sem cache offline. */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough: existir um handler de fetch torna a app instalável; a rede trata do resto.
self.addEventListener('fetch', () => {});

// Push (F7): payload JSON { title, body, url, tag, icon, badge } enviado pelo servidor (web-push).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data ? event.data.text() : 'MYGLOW' };
  }
  const title = data.title || 'MYGLOW';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/today' },
      renotify: false,
    }),
  );
});

// Tocar na notificação: foca uma janela da app aberta e navega para o url; senão abre uma nova.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/today', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find((c) => new URL(c.url).origin === self.location.origin);
      if (client) {
        await client.focus();
        if ('navigate' in client) return client.navigate(url);
        return undefined;
      }
      return self.clients.openWindow(url);
    })(),
  );
});

