# Slotio Dünya Kupası

| Katman | Konum |
|--------|--------|
| **Mini App (frontend)** | https://pusucore.github.io/io-etkinlik/ |
| **API + DB + Bot** | Render / Railway / VPS (`server/`) |

---

## Mini App URL (BotFather)

```
https://pusucore.github.io/io-etkinlik/
```

1. [@BotFather](https://t.me/BotFather) → bot → **Menu Button** → **Web App**
2. URL’yi yapıştırın
3. `WEBAPP_URL` aynı adres olmalı

---

## GitHub Pages deploy

**Settings → Pages → Source: GitHub Actions** (README branch değil!)

**Secrets:** `VITE_API_BASE_URL` = `https://SIZIN-API.com`

`main` push → workflow `Deploy Mini App to GitHub Pages` → `client/dist` yayınlanır.

Manuel:

```bash
cd client
npm install
npm run build
```

---

## Kurulum (local)

```bash
npm run install:all
cp .env.example .env
cp client/.env.example client/.env
docker compose up -d
npm run migrate
npm run seed
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:3001 (varsayılan port)  
- Admin: http://localhost:5173/#/admin  

---

## Port 3000 dolu (Windows)

```powershell
netstat -ano | findstr :3000
taskkill /PID PID_NUMARASI /F
```

Veya `.env`:

```
PORT=3001
```

---

## Proje yapısı

```
client/     → Vite React mini app (GitHub Pages)
server/     → Express API
bot/        → Telegram bot
migrations/
```

---

## Ortam

**client/.env**

```
VITE_API_BASE_URL=
VITE_CHANNEL_URL=https://t.me/slotiosocial
```

**Kök `.env` (backend)**

```
PORT=3001
CORS_ORIGIN=https://pusucore.github.io
BOT_TOKEN=
CHANNEL_ID=
```

`BOT_TOKEN` asla `client/` içine yazılmaz.
