# BreedPed (ex Mio Cane ENCI)

## Progetto
- **Nome app:** BreedPed
- **Versione attuale:** 11.2
- **Dominio:** breedped.com
- **Social:** @breedped su Instagram, Facebook, TikTok, YouTube
- **Sviluppatore:** Dante Caniglia — Avezzano (AQ)

## Repository

| Repo | Descrizione | Deploy |
|------|-------------|--------|
| `dantecaniglia-maker/MIO-CANE-ENCI` | App PWA principale | Vercel (auto-deploy) |
| `dantecaniglia-maker/breedped-website` | Sito landing breedped.com | Vercel (auto-deploy) |

## Stack
- HTML / CSS / JS vanilla — nessun framework
- PWA (Service Worker in `sw.js`, manifest in `manifest.json`)
- Single-file app: tutta la logica è in `index.html` (~11.000 righe)
- **Backend:** Supabase (database + auth + storage)
- **AI:** Gemini 2.5-flash per OCR pedigree + Chatbot

## Deploy
```
# App
cd "/c/Users/DANTE CANIGLIA/Downloads/APP MIO CANE ENCI/files"
git add -A && git commit -m "messaggio" && git push

# Sito
cd "/c/Users/DANTE CANIGLIA/breedped-website"
git add -A && git commit -m "messaggio" && git push
```

## Supabase
- **URL:** https://rjiymkharnwxpdeytshu.supabase.co
- **Key:** sb_publishable_v7r-AM_JP5EoPKjKHd6ImQ_w5sNVcOQ
- **Tabelle:** profili, cani, cucciolate, annunci, annunci_clicks,
  famiglie, famiglia_membri, famiglia_cani, famiglia_log,
  famiglia_compiti, famiglia_percorsi
- **Storage bucket:** breedped-foto (pubblico)

## Autenticazione
- Login Google OAuth (configurato su Google Cloud Console)
- Login Email/Password
- Sessione persistente — non richiede login ad ogni accesso
- Logout pulisce tutto: localStorage, sessionStorage, cookie, SW cache

## Convenzioni importanti
- **Razza:** usare sempre **"Pastore Abruzzese Maremmano"**
- **Nome brand:** sempre **BreedPed** (MAI "Breed Ped" con spazio)
- **Logo:** file `logo.jpeg` nella cartella app e sito
- **Colori:** #0D47A1 (blu) + #C9A961 (oro)
- **Font:** Playfair Display + DM Sans
- **Credits:** sempre "Powered by Dante Caniglia"
- **DEBUG_MODE:** `true` sviluppo, `false` produzione
- **APP_VERSION:** aggiornare in `index.html` e `sw.js` ad ogni release

## Architettura dati (localStorage)
- Chiave principale: `miocane_enci_v1`
- Variabili: `cani[]`, `guestCani[]`, `cucciolate[]`, `esposizioni[]`,
  `tessere{}`, `profilo{}`, `registro{}`
- `salvaDB()` / `caricaDB()` — persistenza locale
- Sync automatica su Supabase ad ogni salvataggio (quando loggato)

## Modalità app
Selezione al primo login:
- 🏆 **Allevatore** — attiva (pedigree, cucciolate, ENCI, breeding)
- 🏠 **Cane di Famiglia** — in sviluppo
- 🏃 **Agility** — prossimamente
- 🎯 **Caccia** — prossimamente

## Funzionalità attive (v11.2)
- Scheda cane con foto cliccabile per upload
- Pedigree AI (OCR foto/PDF con Gemini)
- Cucciolate con gestione cuccioli completa
- Breeding Planner COI + qualità linea 0-100
- Moduli ENCI A e B auto-compilati
- Registro Finanziario
- Calendario Esposizioni
- Chatbot AI (Gemini) con prompt arricchito
- Vetrina marketplace cuccioli (Supabase)
- Login Google + Email con sessione persistente
- Notifiche push reali (vaccini, trattamenti, esposizioni)
- Selezione modalità al login

## Piani abbonamento (da implementare)

### Allevatore
| Piano | Prezzo | Feature |
|-------|--------|---------|
| Free | €0 | Base (1 cane) |
| Pro | €9,99/mese | Tutto incluso |

### Famiglia
| Piano | Prezzo | Cani | Membri |
|-------|--------|------|--------|
| Free | €0 | 1 | 1 |
| Family | €4,99/mese | 2 | 6 |
| +cane extra | +€1,99/mese | +1 | — |

### Bundle
- Pro Allevatore + Family = €11,99/mese
- Piano Totale = €12,99/mese

## Modulo Famiglia (in sviluppo)
- Sistema codice invito (FAM-XXXX)
- Ruoli: 👑 Admin / ✏️ Membro / 👀 Ospite
- Diario condiviso (pasti, uscite, note, foto, farmaci, visite)
- Compiti con notifica in-app + WhatsApp
- GPS percorsi 3D con altimetria
- Scheda emergenza PDF
- Grafici peso e attività
- Badge gamification
- Album foto milestones
- Integrazione collare GPS (Tractive/Weenect) — futuro

## Sito breedped.com
- `index.html` — landing page
- `survey.html` — questionario utenti (Google Sheets)
- `vetrina.html` — marketplace cuccioli pubblico
- `annuncio.html` — pagina annuncio dedicata
- `REGOLE.md` — regole brand per Claude Code
- `vercel.json` — no-cache headers su tutti i file HTML

## Prossime priorità
1. Piano Free/Pro con paywall
2. Modulo Famiglia completo
3. Indici morfologici professionali (scheda cane)
4. GDPR completo
5. Multi-lingua FCI (IT/EN/FR/DE/ES)
6. Modulo Agility
7. Modulo Caccia Pro + GPS collare

## File importanti
- App: `C:\Users\DANTE CANIGLIA\Downloads\APP MIO CANE ENCI\files`
- Sito: `C:\Users\DANTE CANIGLIA\breedped-website`
- Logo: `C:\Users\DANTE CANIGLIA\Downloads\APP MIO CANE ENCI\ALTRO\logo\`
