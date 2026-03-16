# Mio Cane ENCI

## Progetto
- **Nome app:** Mio Cane ENCI *(nome internazionale da decidere)*
- **Versione attuale:** 5.0

## Stack
- HTML / CSS / JS vanilla — nessun framework
- PWA (Service Worker in `sw.js`, manifest in `manifest.json`)

## Deploy
- **Piattaforma:** Vercel (auto-deploy da GitHub)
- **Repository:** `dantecaniglia-maker/MIO-CANE-ENCI`
- **Branch:** `main`
- **Per deployare:**
  ```
  git add -A && git commit -m "messaggio" && git push
  ```

## Convenzioni importanti
- **Razza:** usare sempre **"Pastore Abruzzese Maremmano"** — MAI "Maremmano Abruzzese" o "Cane da Pastore Maremmano Abruzzese"
- **DEBUG_MODE:** `true` durante lo sviluppo, `false` prima del lancio in produzione (definita in cima a `index.html`)
- **APP_VERSION:** aggiornare in `index.html` (variabile JS in cima) e in `sw.js` (`const VERSION`) ad ogni release
