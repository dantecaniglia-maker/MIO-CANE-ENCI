# ARCHITETTURA BREEDPED
## Documento definitivo — Da leggere PRIMA di qualsiasi modifica al codice
### Versione 1.0 — Aprile 2026

---

## 1. IDENTITÀ DELL'APP

**BreedPed** è una PWA single-file (`index.html`) per la gestione completa di cani da lavoro, famiglia, allevamento e sport.

- **Stack:** Vanilla JS, HTML/CSS, PWA
- **Backend:** Supabase (Auth + DB + Storage)
- **Deploy:** Vercel (auto-deploy da GitHub push)
- **Service Worker:** `sw.js` — network-first per HTML, cache-first per assets
- **Versione attuale:** 12.x

---

## 2. PRINCIPIO FONDAMENTALE — IL CANE È AL CENTRO

Un utente può avere lo stesso cane in più moduli. Esempio:
- Birba è un cane di famiglia → modulo Famiglia
- Birba va a caccia → modulo Caccia
- Birba è un riproduttore → modulo Allevatore

**Il cane ha un'unica identità digitale. I moduli sono lens sul cane.**

---

## 3. ARCHITETTURA A 3 LIVELLI

```
┌─────────────────────────────────────────┐
│           LIVELLO 1 — NUCLEO            │
│  Auth · Profilo · Cani · Storage        │
│  Condiviso da TUTTI i moduli            │
└─────────────────────────────────────────┘
              ↓ usa
┌─────────────────────────────────────────┐
│         LIVELLO 2 — MODULI              │
│  Famiglia · Allevatore · Caccia · Agility│
│  Ognuno con sue tab, sue tabelle        │
└─────────────────────────────────────────┘
              ↓ mostra
┌─────────────────────────────────────────┐
│          LIVELLO 3 — UI                 │
│  Header · Bottom Nav · Tab Content      │
│  Uguale per tutti i moduli              │
└─────────────────────────────────────────┘
```

---

## 4. CICLO DI VITA DELL'APP — REGOLA ASSOLUTA

### Fase 1 — AVVIO IMMEDIATO (0ms, sincrono)
```javascript
// All'apertura dell'app, PRIMA di qualsiasi async:
1. Leggi localStorage → trova modalità salvata (es. 'caccia')
2. Costruisci UI del modulo immediatamente
3. Mostra dati cached da localStorage (anche se sono vecchi)
4. NON aspettare Supabase per mostrare UI
```

### Fase 2 — AUTH (asincrono, ~200-500ms)
```javascript
// Una sola chiamata, nessun timeout:
_supabase.auth.getSession() → chi sei?
  → Se loggato: onUserSignedIn(user)
  → Se non loggato: mostra modal-login

// onAuthStateChange solo per eventi reali:
  → SIGNED_IN: nuovo login
  → SIGNED_OUT: logout
  → TOKEN_REFRESHED: aggiorna _currentUser silenziosamente
```

### Fase 3 — SYNC DATI (asincrono, background)
```javascript
// Dopo auth confermata:
1. Carica dati freschi da Supabase
2. Salva in localStorage con user_id
3. Aggiorna UI silenziosamente (senza flickering)
4. Se errore Supabase → usa localStorage, mostra warning
```

---

## 5. REGOLE STORAGE — OBBLIGATORIE

### localStorage — chiavi standardizzate
```
bp_modalita                    // modalità attiva: 'famiglia'|'caccia'|'allevatore'|'agility'
bp_uid                         // user_id corrente
bp_{modulo}_stato_v1           // stato completo modulo (JSON con uid)
bp_{modulo}_cani               // lista cani del modulo
bp_{modulo}_dati               // dati principali del modulo
```

### Regola anti-mix account
```javascript
// SEMPRE prima di leggere localStorage:
var raw = localStorage.getItem('bp_caccia_stato_v1');
var d = JSON.parse(raw);
if(d.uid !== _currentUser.id) {
  // Dati di un altro account — ignora
  localStorage.removeItem('bp_caccia_stato_v1');
  return false;
}
```

### Regola salvataggio
```javascript
// SEMPRE salvare con uid:
localStorage.setItem('bp_caccia_stato_v1', JSON.stringify({
  uid: _currentUser.id,
  dati: {...},
  ts: Date.now()
}));
```

---

## 6. DATABASE SUPABASE — STRUTTURA DEFINITIVA

### Tabelle NUCLEO (condivise)
```sql
-- Profili utente
profili (
  id uuid PK → auth.users.id,
  nome text,
  email text,
  modalita text,           -- ultima modalità usata
  modalita_attive text[],  -- es. ['famiglia','caccia']
  created_at timestamptz
)

-- Cani (tabella centrale unica)
bp_cani (
  id uuid PK,
  user_id uuid → auth.users,
  nome text NOT NULL,
  razza text,
  sesso text,
  data_nascita date,
  microchip text,
  foto_url text,
  moduli text[],           -- es. ['famiglia','caccia']
  created_at timestamptz
)
```

### Tabelle MODULO FAMIGLIA
```sql
famiglia_log, famiglia_compiti, famiglia_percorsi,
famiglia_membri, famiglie, famiglia_cani
```

### Tabelle MODULO CACCIA
```sql
caccia_uscite, caccia_cani, caccia_prove,
caccia_carniere, caccia_condivisioni
```

### Tabelle MODULO ALLEVATORE
```sql
cani (vecchio sistema), cucciolate, annunci, profili
```

### Tabelle MODULO AGILITY (futuro)
```sql
agility_gare, agility_cani, agility_risultati,
agility_allenamenti
```

### RLS — Regola unica per TUTTE le tabelle
```sql
-- Ogni tabella con user_id deve avere:
alter table {tabella} enable row level security;
create policy "owner" on {tabella}
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ECCEZIONE: tabelle condivise (es. caccia_condivisioni)
-- lettura pubblica, scrittura solo propria
```

---

## 7. PATTERN STANDARD PER OGNI MODULO

### Pattern caricaModulo() — IDENTICO per tutti
```javascript
async function carica{Modulo}(){
  // PASSO 1: mostra UI con localStorage (0ms)
  var cached = _leggiLocale('{modulo}');
  if(cached) _applicaDati{Modulo}(cached);
  _renderHome{Modulo}();

  // PASSO 2: aspetta auth se non pronta
  if(!_currentUser) {
    await _aspettaAuth(); // max 3s
    if(!_currentUser) return; // offline/guest
  }

  // PASSO 3: sync Supabase in background
  try {
    var dati = await _syncSupabase{Modulo}(_currentUser.id);
    _applicaDati{Modulo}(dati);
    _salvaLocale('{modulo}', dati);
    _renderHome{Modulo}(); // aggiorna UI con dati freschi
  } catch(e) {
    console.warn('[{modulo}] sync error:', e.message);
    // UI già mostrata con localStorage — nessun problema
  }
}
```

### Pattern _leggiLocale() — IDENTICO per tutti
```javascript
function _leggiLocale(modulo){
  try {
    var raw = localStorage.getItem('bp_'+modulo+'_stato_v1');
    if(!raw) return null;
    var d = JSON.parse(raw);
    // Verifica che i dati siano di questo utente
    if(_currentUser && d.uid && d.uid !== _currentUser.id) {
      localStorage.removeItem('bp_'+modulo+'_stato_v1');
      return null;
    }
    return d.dati || null;
  } catch(e){ return null; }
}
```

### Pattern _salvaLocale() — IDENTICO per tutti
```javascript
function _salvaLocale(modulo, dati){
  try {
    localStorage.setItem('bp_'+modulo+'_stato_v1', JSON.stringify({
      uid: _currentUser ? _currentUser.id : null,
      dati: dati,
      ts: Date.now()
    }));
  } catch(e){ console.warn('localStorage pieno'); }
}
```

### Pattern renderTab() — IDENTICO per tutti
```javascript
async function render{Modulo}{Tab}(container){
  // 1. Mostra subito con dati in memoria
  var dati = window._{modulo}DatiLocali || [];
  _renderLista(container, dati);

  // 2. Se non loggato, esci (UI già mostrata)
  if(!_currentUser) return;

  // 3. Refresh da Supabase
  try {
    var res = await _supabase.from('{tabella}')
      .select('*').eq('user_id', _currentUser.id)
      .order('created_at', {ascending: false});
    if(res.error) throw res.error;
    window._{modulo}DatiLocali = res.data || [];
    _salvaLocale('{modulo}', {dati: window._{modulo}DatiLocali});
    _renderLista(container, window._{modulo}DatiLocali);
  } catch(e){
    console.warn('[{modulo}] load error:', e.message);
    // mostra dati locali già visibili, non fare nulla
  }
}
```

### Pattern salvaDato() — IDENTICO per tutti
```javascript
async function salva{Dato}{Modulo}(btn, record){
  if(!_currentUser){ toast('⚠️ Devi essere loggato'); return; }
  btn.disabled = true; btn.textContent = '⏳';

  // 1. Aggiorna UI subito (ottimistic update)
  record.id = 'tmp_' + Date.now();
  record.user_id = _currentUser.id;
  window._{modulo}DatiLocali = window._{modulo}DatiLocali || [];
  window._{modulo}DatiLocali.unshift(record);
  _salvaLocale('{modulo}', {dati: window._{modulo}DatiLocali});

  // Chiudi overlay e aggiorna UI immediatamente
  var ov = document.getElementById('ov-{dato}');
  if(ov) ov.remove();
  toast('✅ Salvato!');
  _renderTabAttiva();

  // 2. Salva su Supabase in background
  try {
    var recSupa = Object.assign({}, record);
    delete recSupa.id; // rimuovi id temporaneo
    var res = await _supabase.from('{tabella}').insert(recSupa);
    if(res.error) throw res.error;
    // Ricarica per avere ID reale da Supabase
    await render{Modulo}{Tab}(g('{modulo}-tab-content'));
  } catch(e){
    console.warn('[{modulo}] save error:', e.message);
    toast('⚠️ Salvato localmente. Sync non riuscito.');
  }
}
```

---

## 8. AUTH — REGOLE ASSOLUTE

### Una sola inizializzazione
```javascript
// CORRETTO — getSession subito, nessun timeout
_supabase.auth.getSession().then(async function(result){
  if(result.data?.session){
    _currentUser = result.data.session.user;
    await onUserSignedIn(_currentUser);
  } else {
    mostraLogin();
  }
});

// onAuthStateChange solo per eventi SUCCESSIVI
_supabase.auth.onAuthStateChange(async function(event, session){
  if(event === 'SIGNED_IN' && !_authHandled){
    _authHandled = true;
    _currentUser = session.user;
    await onUserSignedIn(_currentUser);
  } else if(event === 'TOKEN_REFRESHED'){
    _currentUser = session.user; // aggiorna silenziosamente
  } else if(event === 'SIGNED_OUT'){
    _currentUser = null;
    _authHandled = false;
    onUserSignedOut();
  }
});
```

### onUserSignedIn — flusso pulito
```javascript
async function onUserSignedIn(user){
  // 1. Nascondi login
  var ml = g('modal-login');
  if(ml) ml.style.display = 'none';

  // 2. Aggiorna info account in impostazioni
  var emailEl = g('user-email-display');
  if(emailEl) emailEl.textContent = user.email || '';

  // 3. Leggi modalità da localStorage
  var mod = localStorage.getItem('bp_modalita');

  // 4. Se non ha modalità → mostra selezione
  if(!mod){
    g('modal-modalita').style.display = 'flex';
    return;
  }

  // 5. Applica modalità immediatamente
  applicaModalita(mod);

  // 6. Sync profilo Supabase in background (non blocca)
  sincronizzaProfilo(user).catch(function(e){
    console.warn('sincronizzaProfilo:', e.message);
  });
}
```

### Logout — completo
```javascript
async function logout(){
  _loggingOut = true;

  // 1. Pulisci stato in memoria
  _currentUser = null;
  _authHandled = false;

  // 2. Pulisci localStorage (solo dati utente, non preferenze)
  ['bp_caccia_stato_v1','bp_famiglia_stato_v1',
   'bp_caccia_uscite','bp_caccia_cani_lista',
   'bp_caccia_prove'].forEach(function(k){
    localStorage.removeItem(k);
  });

  // 3. Logout Supabase
  await _supabase.auth.signOut({scope:'global'});

  // 4. Unregister Service Worker
  if(navigator.serviceWorker){
    var regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(function(r){ return r.unregister(); }));
  }

  // 5. Reload pulito
  window.location.href = '/?_logout=' + Date.now();
}
```

---

## 9. UI — REGOLE STANDARD

### Struttura HTML ogni modulo
```html
<div id="home-{modulo}" style="position:fixed;inset:0;z-index:9980;overflow-y:auto;padding-bottom:80px">
  <!-- Header fisso -->
  <div id="{modulo}-header">...</div>

  <!-- Contenuto tab (cambia) -->
  <div id="{modulo}-tab-content" style="padding:16px"></div>

  <!-- Footer brand -->
  <div style="text-align:center;padding:20px 0;font-size:10px;color:#9ab0cc">
    Powered by <strong style="color:#C9A961">Dante Caniglia</strong>
  </div>
</div>

<!-- Bottom nav fisso -->
<nav id="{modulo}-bottom-nav" style="position:fixed;bottom:0;width:100%;z-index:99982">
  ...tab buttons...
</nav>
```

### Bottom nav — pattern standard
```javascript
var TABS_{MODULO} = [
  {id:'home',    ico:'🏠', label:'Home'},
  {id:'...',     ico:'...', label:'...'},
  // max 5 tab
];

function switchTab{Modulo}(tabId){
  // 1. Aggiorna stile bottoni
  TABS_{MODULO}.forEach(function(t){
    var btn = g('tab-{modulo}-'+t.id);
    if(!btn) return;
    var attivo = t.id === tabId;
    btn.style.background = attivo ? '{colore_bg}' : 'transparent';
    btn.querySelector('span:last-child').style.color = attivo ? '{colore}' : '#9ab0cc';
  });

  // 2. Render contenuto
  var container = g('{modulo}-tab-content');
  if(!container) return;
  render{Modulo}_{Tab}(container);
}
```

### Colori per modulo
```
Allevatore: #0D47A1 (blu) + #C9A961 (oro)
Famiglia:   #0D47A1 (blu) + #C9A961 (oro)
Caccia:     #2E7D32 (verde) + #C9A961 (oro)
Agility:    #E65100 (arancio) + #C9A961 (oro)
```

---

## 10. SERVICE WORKER — REGOLE

### Strategia cache
```
/ e /index.html → SEMPRE dalla rete (no-cache)
/sw.js          → SEMPRE dalla rete (no-cache)
/manifest.json  → Cache 1 ora
Logo/icone      → Cache 1 anno
Leaflet/fonts   → Cache 30 giorni
```

### Versioning
```javascript
// sw.js riga 1:
const VERSION = '{APP_VERSION}';
// DEVE essere identica a APP_VERSION in index.html riga 2
// Se diversa → loop infinito di reload
```

### Regola aggiornamento
```
Ogni push su GitHub:
1. Aggiorna APP_VERSION in index.html riga 2
2. Aggiorna VERSION in sw.js riga 1
3. Devono essere IDENTICHE
```

---

## 11. TABELLE SUPABASE — REGOLE DI CREAZIONE

### Ogni tabella DEVE avere:
```sql
-- Schema standard
create table if not exists {tabella} (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  -- campi specifici --
  created_at timestamptz default now()
);

-- RLS sempre configurato
alter table {tabella} enable row level security;
create policy "owner_all" on {tabella}
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

### Tabelle da creare/verificare
```sql
-- NUCLEO
profili ✅ (esiste)
cani ✅ (esiste - allevatore)

-- FAMIGLIA
famiglie ✅, famiglia_membri ✅, famiglia_cani ✅
famiglia_log ✅, famiglia_compiti ✅, famiglia_percorsi ✅

-- CACCIA
caccia_uscite ✅, caccia_cani ✅, caccia_prove ✅
caccia_carniere ✅, caccia_condivisioni ✅

-- AGILITY (da creare quando si inizia)
agility_cani, agility_gare, agility_risultati, agility_allenamenti
```

---

## 12. ERRORI FREQUENTI — DA NON RIPETERE MAI

### ❌ SBAGLIATO — setTimeout per aspettare auth
```javascript
// MAI FARE QUESTO
setTimeout(function(){
  if(!_currentUser){ setTimeout(..., 800); return; }
  renderCacciaHome(container);
}, 800);
```

### ✅ CORRETTO — promise che aspetta auth
```javascript
// SEMPRE COSÌ
async function render(container){
  // Mostra subito con localStorage
  var cached = _leggiLocale('caccia');
  if(cached) _mostraDati(container, cached);

  // Aspetta auth senza bloccare UI
  if(!_currentUser) await _aspettaAuth();
  if(!_currentUser) return;

  // Carica da Supabase
  var res = await _supabase.from('...')...;
  _mostraDati(container, res.data);
}
```

### ❌ SBAGLIATO — ottimistic update mancante
```javascript
// MAI FARE QUESTO
async function salva(btn){
  var res = await _supabase.from('...').insert(...);
  toast('✅ Salvato!'); // utente aspetta 1-2 secondi
}
```

### ✅ CORRETTO — UI aggiornata prima di Supabase
```javascript
// SEMPRE COSÌ
async function salva(btn){
  // 1. Aggiorna UI subito
  _datiLocali.unshift(record);
  _renderTabAttiva();
  toast('✅ Salvato!');
  ov.remove();

  // 2. Supabase in background
  await _supabase.from('...').insert(record);
}
```

### ❌ SBAGLIATO — localStorage senza uid
```javascript
localStorage.setItem('bp_caccia_uscite', JSON.stringify(data));
// Problema: dati di account diversi si mescolano
```

### ✅ CORRETTO — localStorage con uid
```javascript
localStorage.setItem('bp_caccia_stato_v1', JSON.stringify({
  uid: _currentUser.id,
  dati: data,
  ts: Date.now()
}));
```

---

## 13. FUNZIONI HELPER GLOBALI DA IMPLEMENTARE

```javascript
// Aspetta auth max 3 secondi
function _aspettaAuth(){
  if(_currentUser) return Promise.resolve();
  return new Promise(function(resolve){
    var t=0, iv=setInterval(function(){
      t+=100;
      if(_currentUser || t>=3000){ clearInterval(iv); resolve(); }
    }, 100);
  });
}

// Leggi localStorage con controllo uid
function _leggiLocale(modulo){
  try {
    var d = JSON.parse(localStorage.getItem('bp_'+modulo+'_stato_v1')||'null');
    if(!d) return null;
    if(_currentUser && d.uid && d.uid !== _currentUser.id) return null;
    return d.dati || null;
  } catch(e){ return null; }
}

// Scrivi localStorage con uid
function _salvaLocale(modulo, dati){
  try {
    localStorage.setItem('bp_'+modulo+'_stato_v1', JSON.stringify({
      uid: _currentUser ? _currentUser.id : null,
      dati: dati,
      ts: Date.now()
    }));
  } catch(e){}
}

// Render tab attiva del modulo corrente
function _renderTabAttiva(){
  var mod = localStorage.getItem('bp_modalita');
  var container = g(mod+'-tab-content');
  if(!container) return;
  var tab = window['_'+mod+'TabAttiva'] || mod+'-home';
  window['switch'+mod.charAt(0).toUpperCase()+mod.slice(1)+'Tab'](tab);
}
```

---

## 14. CHECKLIST PRIMA DI OGNI PROMPT

Prima di scrivere qualsiasi modifica al codice:

- [ ] Ho letto le righe esatte che devo modificare?
- [ ] Ho verificato che la tabella Supabase esiste?
- [ ] Ho usato il pattern localStorage con uid?
- [ ] Ho usato l'ottimistic update (UI prima di Supabase)?
- [ ] Ho aggiornato APP_VERSION e sw.js VERSION?
- [ ] Il git commit è incluso nel prompt?
- [ ] Sto facendo UN solo fix alla volta?

---

## 15. ORDINE DI LAVORO DEFINITIVO

### Da fare SUBITO (refactor nucleo)
1. Implementare `_aspettaAuth()`, `_leggiLocale()`, `_salvaLocale()` globali
2. Riscrivere flusso auth (getSession senza timeout)
3. Riscrivere `onUserSignedIn` pulito
4. Riscrivere `logout` completo
5. Aggiungere "mostra password" + "ricordami" al login

### Da fare per ogni modulo
Per Caccia, poi Famiglia, poi Allevatore:
1. Riscrivere `carica{Modulo}()` con nuovo pattern
2. Riscrivere ogni `render{Tab}()` con ottimistic update
3. Riscrivere ogni `salva{Dato}()` con ottimistic update
4. Allineare chiavi localStorage con uid

### Da fare per Agility (nuovo)
- Costruire da zero seguendo questo documento
- Nessun vecchio pattern — solo quello definito qui

---

*Documento creato da Claude Sonnet per BreedPed — Dante Caniglia*
*Powered by Dante Caniglia · breedped.com*
