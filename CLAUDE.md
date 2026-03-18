# Mio Cane ENCI

## Progetto
- **Nome app:** Mio Cane ENCI *(nome internazionale da decidere)*
- **Versione attuale:** 8.7

## Stack
- HTML / CSS / JS vanilla — nessun framework
- PWA (Service Worker in `sw.js`, manifest in `manifest.json`)
- Single-file app: tutta la logica è in `index.html` (~8000 righe)

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
- **IIFE scope:** le funzioni dentro l'IIFE (righe ~5762-6324) non sono globali — vanno esposte con `window.nomeFunc = nomeFunc` alla fine dell'IIFE

## Architettura dati (localStorage)
- Chiave: `miocane_enci_v1`
- Variabili principali: `cani[]`, `guestCani[]`, `cucciolate[]`, `esposizioni[]`, `tessere{}`, `profilo{}`, `registro{}`
- `salvaDB()` / `caricaDB()` gestiscono la persistenza

## Struttura `registro` (Registro Finanziario)
```js
registro = {
  movimenti: [
    {
      id: Number,          // Date.now()
      data: 'YYYY-MM-DD',
      tipo: 'entrata'|'uscita',   // SEMPRE singolare
      importo: Number,
      categoria: 'vendita_cucciolo'|'altro_entrata'|'veterinario'|'alimentazione'|'enci'|'farmaci'|'altro',
      descrizione: String,
      fonte: 'manuale'|'cucciolo'|'auto',
      // solo per fonte:'cucciolo':
      puppyId: Number,     // p.id del cucciolo
      _key: 'cucciolo_vendita_<puppyId>'|'cucciolo_acconto_<puppyId>'  // dedup
    }
  ]
}
```
- Le voci `fonte:'auto'` sono **virtuali** (calcolate da cucciolate, non persistite) — mostrate solo se non esiste già una entry `fonte:'cucciolo'` per quel puppy
- `_autoRegistroEntrataCucciolo(puppyId, nome, cuccNome, importo, sottoTipo, data)` aggiunge entries persistite quando un cucciolo viene ceduto in `saveCucciolo()`

## Funzionalità principali (v8.0)
- Scheda cane: info, salute, titoli, pedigree (OCR/AI), riproduzione, prole
- Cucciolate: gestione cuccioli con stati (disponibile/prenotato/ceduto/mio_cane)
- Cuccioli: pedigree automatico 4 generazioni, sezione finanziaria, contratto ENCI
- Dashboard cuccioli (sidebar): statistiche vendite, filtri per stato
- Moduli ENCI A e B: auto-compilazione da cucciolata
- Breeding Planner potenziato: COI con priorità LOI>microchip>nome, GENETIC_DB 5 razze, avvisi genetici 🔴🟡🟢, qualità linea 0-100
- Calendario Esposizioni, Moduli ENCI
- OCR pedigree via Tesseract + Gemini AI

## Nome internazionale
- **Nome scelto:** PrimeBreed
- **Dominio da registrare:** primebreed.com, primebreed.app, primebreed.it
- **Social da creare:** @primebreed su Instagram, Facebook, TikTok

## Bug aperti da risolvere
- Alert notifiche non si disattivano in cucciolate
- "Trattamenti cuccioli" scritto male in home
- "Clicca per dettagli" in home non funziona
- Campi editabili post-scansione PDF/foto ancora incompleti
- Grafico peso cuccioli non funziona
- Logo da sostituire con immagine fornita da Dante
- Sigle LOI internazionali (PT, VDH, LOF, KC ecc.) da testare

## Funzionalità da completare
- Notifiche push reali (toggle presente ma non funziona)
- Modalità FCI configurata ma vuota
- Contratto vendita cucciolo digitale
- Chat allevatori
- Marketplace cuccioli con Supabase
- Multi-lingua FCI (Francia, Germania, Spagna)
- Database genetico completo tutte razze FCI
- Piano abbonamento Free/Pro
- GDPR completo
- Analytics base
- Vetrina cuccioli automatica su Facebook/sito

## Filosofia app
- NON bloccare mai l'allevatore — solo avvisi semaforo 🔴🟡🟢
- Piano gratuito: funzioni base
- Piano Pro: OCR, Breeding avanzato, Export PDF, FCI internazionale
