# FocusFlow — Daily Goals & Time Tracking PWA

Moderní, responzivní webová a mobilní aplikace (PWA) pro plánování denních cílů, časový tracking se stopkami a hloubkovou sebereflexi (před, během a po výkonu).

## 🚀 Klíčové funkce

1. **Kalendář a Plánovač**: Denní, týdenní a měsíční rozvrh s časovými bloky (od–do), kategoriemi a upozorněními.
2. **Živý odpočet k úkolu**: Dynamický banner s odpočtem v reálném čase, indikátorem urgence a okamžitým check-inem.
3. **3-fázový Tracking systém**:
   - **Fáze PŘED**: Bleskový check-in energie (1–10), nálady a hlavního záměru.
   - **Fáze BĚHEM**: Stopky v reálném čase, pauza/pokračování, audio signály a vizuální progress bar vůči plánu.
   - **Fáze PO**: Sebereflexe (hodnocení soustředění 1–10, zbytková energie 1–10, potvrzení splnění cíle, poznámky, konfety a výpočet rozdílu oproti plánu).
4. **Analytika a Statistiky**:
   - Procento úspěšnosti plnění cílů
   - Celkový čas v hluboké práci
   - Srovnávací graf energie Před vs. Po
   - Kompletní historie proběhlých měření s reflexemi
   - Export dat do JSON pro zálohu
5. **Device-Friendly (Mobil & Tablet)**:
   - Mobilní spodní navigační lišta
   - Podpora Safe Area pro iPhone
   - PWA Manifest + Service Worker pro instalaci na plochu
   - Přepínání Dark / Light režimu
   - Offline fungování díky LocalStorage

## 📦 Lokální spuštění

```bash
# Instalace závislostí
npm install

# Spuštění vývojového serveru
npm run dev

# Sestavení produkčního buildu
npm run build

# Lokální náhled produkčního buildu
npm run preview
```

## 🌐 Možnosti hostingu

### 1. Cloudflare Quick Tunnel (Okamžitý živý odkaz zdarma)
V projektu je připraven skript pro spuštění tunelu na libovolném zařízení:
```bash
cloudflared tunnel --url http://localhost:3000
```

### 2. Vercel (Doporučeno)
1. Zaregistrujte se na [Vercel](https://vercel.com)
2. Importujte tento repozitář nebo spusťte v terminálu `npx vercel`
3. Vercel automaticky detekuje konfiguraci v `vercel.json`

### 3. Netlify
- Otevřete [Netlify Drop](https://app.netlify.com/drop)
- Přetáhněte složku `dist` přímo do prohlížeče pro okamžitý web za 5 sekund!

### 4. GitHub Pages
- Nahrajte kód na GitHub
- Workflow v `.github/workflows/deploy.yml` automaticky publikuje aplikaci na vaši `github.io` doménu.
