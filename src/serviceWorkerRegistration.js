/**
 * Service Worker Registration
 * Enables offline support and caching strategies
 */

import { Workbox } from 'workbox-window';

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    // Wait for page load to register service worker
    window.addEventListener('load', () => {
      const swUrl = `/service-worker.js`;

      if (isLocalhost) {
        // Check if service worker exists in localhost
        checkValidServiceWorker(swUrl, config);

        navigator.serviceWorker.ready.then(() => {
          console.log(
            '🔧 This web app is being served cache-first by a service worker.'
          );
        });
      } else {
        // Register service worker in production
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  const wb = new Workbox(swUrl);

  // Add event listeners
  wb.addEventListener('installed', (event) => {
    if (event.isUpdate) {
      console.log('🔄 New content is available; please refresh.');

      if (config && config.onUpdate) {
        config.onUpdate(wb);
      }
    } else {
      console.log('✅ Content is cached for offline use.');

      if (config && config.onSuccess) {
        config.onSuccess(wb);
      }
    }
  });

  wb.addEventListener('waiting', () => {
    console.log('⏳ A new service worker is waiting to activate.');
  });

  wb.addEventListener('controlling', () => {
    console.log('🎉 Service worker is now controlling the page.');
    window.location.reload();
  });

  wb.addEventListener('activated', (event) => {
    if (!event.isUpdate) {
      console.log('🚀 Service worker activated for the first time!');
    }
  });

  // Register the service worker
  wb.register()
    .then((registration) => {
      console.log('✅ Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('❌ Service Worker registration failed:', error);
    });

  return wb;
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        '🔌 No internet connection found. App is running in offline mode.'
      );
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Helper to skip waiting and activate new service worker
export function skipWaiting(wb) {
  wb.addEventListener('controlling', () => {
    window.location.reload();
  });

  wb.messageSkipWaiting();
}
