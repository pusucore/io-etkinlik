# Slotio Dünya Kupası Bracket Etkinliği

| Katman | URL |
|--------|-----|
| **Mini App (kullanıcı)** | https://pusucore.github.io/io-etkinlik/ |
| **Backoffice (admin)** | http://localhost:5174/admin/ (GitHub Pages'te YOK) |
| **API + Bot** | VPS / Render (`server/` + `bot/`) |

---

## Mimari

- `client/` — Telegram Mini App (React + Vite, GitHub Pages)
- `backoffice/` — Admin panel (local/private, JWT)
- `server/` — Express API + PostgreSQL
- `bot/` — Telegram `/start` kampanya mesajı

Kullanıcı Mini App içinde **Admin sekmesi yok**. Teknik env hataları gösterilmez.

---

## Kurulum

```bash
npm run install:all
cp .env.example .env
cp client/.env.example client/.env
docker compose up -d   # PostgreSQL
npm run migrate
npm run seed
npm run dev
```

| Servis | Adres |
|--------|--------|
| Mini App | http://localhost:5173 |
| API | http://localhost:3001 |
| Backoffice | http://localhost:5174/admin/ |
| Bot | `npm run bot` (ayrı process) |

---

## GitHub Pages

1. Repo secret: `VITE_API_BASE_URL` = canlı API URL (ör. `https://api.example.com`)
2. `main` push → workflow `client/dist` deploy
3. BotFather Web App URL: `https://pusucore.github.io/io-etkinlik/`

API yoksa kullanıcıya: *"Etkinlik bağlantısı hazırlanıyor. Lütfen daha sonra tekrar dene."*

---

## Ortam değişkenleri

`BOT_TOKEN` ve `ADMIN_PASSWORD` **asla** `client/` veya `backoffice/` içine yazılmaz.

```
PORT=3001
BOT_TOKEN=
CHANNEL_ID=
DATABASE_URL=
JWT_SECRET=
ADMIN_PASSWORD=
MINI_APP_URL=https://pusucore.github.io/io-etkinlik/
CORS_ORIGINS=https://pusucore.github.io,http://localhost:5173,http://localhost:5174
```

---

## Port 3000 dolu (Windows)

```powershell
netstat -ano | findstr :3000
taskkill /PID PID_NUMARASI /F
```

Veya `.env` içinde `PORT=3001`.

---

## Kullanıcı akışı

1. `/start` → kampanya mesajı (backoffice'ten düzenlenir)
2. Mini App → kanal takibi → Slotio kullanıcı adı
3. 12 grup sıralaması → 8 üçüncü → bracket → onay
4. Liderlik tablosu + ödül uygunluk

Yatırım kontrolü: backoffice CSV import (`slotio_username`, `amount`).
