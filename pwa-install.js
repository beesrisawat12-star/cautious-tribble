let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // ป้องกันบราวเซอร์ขึ้นแถบติดตั้งอัตโนมัติ
  e.preventDefault();
  deferredPrompt = e;

  // แสดงแถบแจ้งเตือนติดตั้ง PWA
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.classList.remove('hidden');
});

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('pwa-install-btn');
  
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      // แสดง Popup ติดตั้งของระบบ
      deferredPrompt.prompt();
      
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the PWA install prompt');
      }
      
      deferredPrompt = null;
      document.getElementById('pwa-install-banner')?.classList.add('hidden');
    });
  }
});

// ซ่อนแถบเมื่อติดตั้งสำเร็จแล้ว
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.getElementById('pwa-install-banner')?.classList.add('hidden');
  console.log('PWA was installed');
});
