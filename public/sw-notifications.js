// Folio — Daily notification scheduler

const PHRASES_DEFAULT = [
  "ese libro lleva días viéndote feo desde la mesa",
  "5 minutos. ni el tiempo de un tiktok decente",
  "tu cerebro pide algo que no sea instagram",
  "el libro de la mesa de noche no se va a leer solo",
  "literalmente solo 5 páginas",
  "leer es el reset que tu día necesita",
  "vamos, una página y ya. te conozco, acabas leyendo 30",
  "tu yo de las 2am también te lo agradecerá",
  "ni el tiempo de una serie. solo 5 minutos",
  "tu yo del lunes prometió leer hoy",
];

const PHRASES_STREAK = [
  "tu racha pide que no la abandones",
  "ni un día perdido, eres distinto",
  "no rompas lo que llevas construyendo",
  "hoy también cuenta. una página ya es victoria",
];

const PHRASES_BOOK = [
  "el cap 7 te está esperando",
  "tu personaje favorito también te extraña",
  "¿en qué parte quedaste? ya sé que lo recuerdas",
];

let ctx = { streak: 0, bookTitle: null };
let notifTimerId = null;

function pickPhrase() {
  const { streak, bookTitle } = ctx;

  if (streak >= 3) {
    const pool = [
      `tu racha de ${streak} días te observa`,
      ...PHRASES_STREAK,
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  if (bookTitle) {
    const pool = [
      `"${bookTitle.slice(0, 28)}" sigue donde lo dejaste`,
      ...PHRASES_BOOK,
      ...PHRASES_DEFAULT.slice(0, 4),
    ];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return PHRASES_DEFAULT[Math.floor(Math.random() * PHRASES_DEFAULT.length)];
}

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
    const body = pickPhrase();
    self.registration.showNotification('folio', {
      body,
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
    if (event.data.streak !== undefined) ctx.streak = event.data.streak;
    if (event.data.bookTitle !== undefined) ctx.bookTitle = event.data.bookTitle;
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
