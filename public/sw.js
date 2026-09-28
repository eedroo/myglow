/* MYGLOW — service worker mínimo (Fase 1). Sem cache offline nem push (Fase 7). */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough: existir um handler de fetch torna a app instalável; a rede trata do resto.
self.addEventListener('fetch', () => {});
