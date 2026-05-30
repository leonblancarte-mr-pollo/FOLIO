// Folio — Daily notification scheduler
// Imported by the Workbox-generated service worker via importScripts

const PHRASES = [
  "📖 Regálate 5 minutos. Tu libro te está esperando.",
  "🔥 Tu racha sigue viva. No la dejes morir hoy.",
  "✨ Los mejores lectores no leen mucho. Leen seguido.",
  "📚 5 páginas hoy. Eso es todo lo que necesitas.",
  "🌙 Antes de dormir, una página. Solo una.",
  "⏰ Tienes 5 minutos libres ahora mismo. Úsalos.",
];

let notifTimerId = null;

function msUntilNextEightPM() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(20, 0, 0, 0);
  if (now >= target) target.setDate(target.getDate() + 1);
  return target - now;
}

function scheduleNotification() {
  if (notifTimerId) clearTimeout(notifTimerId);
  notifTimerId = setTimeout(() => {
    const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)];
    self.registration.showNotification('Folio 📚', {
      body: phrase,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'folio-daily',
      renotify: true,
      data: { url: '/?action=log' },
    });
    scheduleNotification();
  }, msUntilNextEightPM());
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FOLIO_SCHEDULE_NOTIF') {
    scheduleNotification();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const focusable = clientList.find(c => 'focus' in c);
      if (focusable) return focusable.focus().then(() => focusable.navigate(url));
      return self.clients.openWindow(url);
    })
  );
});
