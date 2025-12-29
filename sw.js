// Service Worker برای اپلیکیشن تناوب علفکش‌های گندم
const CACHE_NAME = 'wheat-weed-control-v2.1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2'
];

// نصب Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] نصب');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] کش کردن فایل‌های اصلی');
        return cache.addAll(urlsToCache).catch(error => {
          console.log('[Service Worker] خطا در کش کردن:', error);
        });
      })
      .then(() => {
        console.log('[Service Worker] نصب کامل شد');
        return self.skipWaiting();
      })
  );
});

// فعال‌سازی Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] فعال‌سازی');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] حذف کش قدیمی:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] فعال‌سازی کامل شد');
      return self.clients.claim();
    })
  );
});

// مدیریت درخواست‌های شبکه
self.addEventListener('fetch', event => {
  // برای درخواست‌های کراس-اورجین
  if (event.request.url.startsWith('http') && 
      self.location.origin !== new URL(event.request.url).origin) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // اگر در کش بود برگردان
        if (response) {
          return response;
        }
        
        // در غیر این صورت از شبکه بگیر
        return fetch(event.request)
          .then(response => {
            // بررسی که پاسخ معتبر باشد
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // کش کردن پاسخ برای استفاده بعدی
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('[Service Worker] خطا در fetch:', error);
            
            // برای درخواست‌های HTML صفحه اصلی را برگردان
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            
            // برای سایر فایل‌ها خطا برگردان
            return new Response('خطا در اتصال. لطفاً اینترنت خود را بررسی کنید.', {
              status: 408,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
          });
      })
  );
});

// دریافت پیام‌ها از صفحه اصلی
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// مدیریت push notification (برای آینده)
self.addEventListener('push', event => {
  console.log('[Service Worker] پیام push دریافت شد:', event);
  
  const options = {
    body: 'سیستم تناوب علفکش‌های گندم',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('یادآوری تناوب علفکش', options)
  );
});

// مدیریت کلیک روی notification
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] notification کلیک شد');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url === './' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('./');
        }
      })
  );
});