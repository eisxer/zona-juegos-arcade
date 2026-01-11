---
description: Setup PWA and Offline Support (Standard Procedure)
---
This workflow implements the standard PWA and Offline support configuration requested by the user ("perfecto esto siempre lo haras con todos los juegos").

1. **Create `public/manifest.json`**
```json
{
  "name": "App Name",
  "short_name": "AppShortName",
  "description": "App Description",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#020617",
  "theme_color": "#020617",
  "icons": [
    { "src": "/logo.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
    { "src": "/logo.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

2. **Create `public/offline.html`**
   - Use the standard "Arcade OS" dark theme.
   - Include a "Connection Lost" message and a Reload button.
   - Use scanlines effect.

3. **Create `public/sw.js`**
   - Implement `install` event to cache `offline.html`, `logo.png`, `manifest.json`.
   - Implement `activate` for cache cleanup.
   - Implement `fetch` with "Network First, then Cache, then Offline Page" strategy for navigation.
   - Implement "Stale-While-Revalidate" for assets.

4. **Create `app/components/ServiceWorkerRegister.js`**
```javascript
'use client';
import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js');
        });
    }
  }, []);
  return null;
}
```

5. **Update `app/layout.js`**
   - Add `manifest: "/manifest.json"` and icons to `metadata`.
   - Add `viewport` export with `themeColor`.
   - Import and render `<ServiceWorkerRegister />` inside `<LanguageProvider>` (or body).
