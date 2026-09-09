const CACHE_NAME = 'mango-ai-v1';

// รายการไฟล์ที่ต้องแคชไว้ใช้ตอน Offline
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './ui.js',
    './weather.js',
    './orchard.js',
    './tasks.js',
    './decision.js',
    './fertilizer.js',
    './pwa-install.js'
];

// ติดตั้ง Service Worker และบันทึกไฟล์ลง Cache
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching app shell and assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// ล้าง Cache เก่าเมื่อมีการอัปเดตเวอร์ชันใหม่
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// ดึงข้อมูลจาก Cache ก่อน หากไม่มีจึงค่อยดึงจาก Network
self.addEventListener('fetch', (event) => {
    // ข้ามการแคช API สภาพอากาศภายนอก เพื่อให้ได้ข้อมูล Real-time เสมอ
    if (event.request.url.includes('api.open-meteo.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                // บันทึกไฟล์ใหม่ๆ เข้า Cache อัตโนมัติ
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // กรณีไม่มีเน็ตและไม่มีใน Cache
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
