# Slotio Dünya Kupası Mini App

Telegram kanal takibi, Slotio kullanıcı adı kaydı, grup sıralaması ve eleme bracket'i içeren Dünya Kupası etkinlik mini uygulaması.

## Özellikler

- Telegram kanal üyeliği kontrolü (`getChatMember`)
- Tek seferlik kayıt (Telegram ID + Slotio username)
- 12 grup × 4 takım — sadece sıralama (skor/puan yok)
- Admin: en iyi 8 üçüncü + Son 32 3X yerleşimi
- Eleme turları: sadece kazanan seçimi, otomatik bracket ilerlemesi
- Koyu neon arayüz, mobil öncelikli mini app
- Basit admin panel (`/admin`)

## Gereksinimler

- Node.js 18+
- Docker (PostgreSQL)
- Telegram Bot Token
- Kanal: [@slotiosocial](https://t.me/slotiosocial) — bot kanalda **yönetici** olmalı
- Kanal ID: `npm run channel-id` (`.env` içinde `BOT_TOKEN` gerekli)

## Kurulum

```bash
cd slotio-etkinlik-bot
npm install
cp .env.example .env
# .env dosyasını doldurun
docker compose up -d
npm run migrate
npm run seed
npm run dev
```

### .env

| Değişken | Açıklama |
|----------|----------|
| `BOT_TOKEN` | @BotFather token |
| `CHANNEL_ID` | `-100...` kanal ID |
| `CHANNEL_URL` | `https://t.me/slotiosocial` |
| `VITE_CHANNEL_URL` | Mini app “Kanala Git” linki |
| `WEBAPP_URL` | Mini app URL (dev: `http://localhost:5173`) |
| `DATABASE_URL` | PostgreSQL bağlantı dizesi |
| `ADMIN_PASSWORD` | Backoffice şifresi (kullanıcı adı yok) |
| `ADMIN_TELEGRAM_IDS` | Virgülle ayrılmış admin Telegram ID (`/admin` bot komutu) |
| `JWT_SECRET` | Admin JWT secret |
| `PORT` | API portu (varsayılan 3000) |

### Geliştirme

`npm run dev` üç süreci başlatır:

- API: `http://localhost:3000`
- Mini app: `http://localhost:5173`
- Telegram bot

**Backoffice (yalnızca local):** `http://localhost:5173/admin` — production’a deploy edilmez; `ADMIN_PASSWORD` sadece `.env` dosyasında tutulur (repoya commit etmeyin).

### Production

```bash
npm run build:client
# WEBAPP_URL ve API'yi HTTPS domain'e ayarlayın
npm start          # API + static frontend
npm run bot        # Telegram bot (ayrı process)
```

BotFather'da Web App URL'ini `WEBAPP_URL` ile eşleştirin.

## API Özeti

**Public**

- `GET /api/auth/telegram`
- `POST /api/check-channel-membership`
- `POST /api/register`
- `GET /api/me`
- `GET /api/groups`
- `GET /api/bracket`
- `GET /api/bonus-status`

**Admin** (Bearer JWT)

- `POST /api/admin/login`
- `GET /api/admin/users`
- `GET /api/admin/users/export`
- `POST /api/admin/users/:id/recheck-channel`
- `POST /api/admin/group-results`
- `POST /api/admin/best-thirds`
- `POST /api/admin/bracket/setup-third-teams`
- `POST /api/admin/bracket/build-round32`
- `POST /api/admin/bracket/:matchNo/winner`
- `GET /api/admin/champion`

## Admin iş akışı

1. Tüm gruplarda 1–4 sıralamasını kaydet
2. En iyi 8 üçüncüyü seç (tam 8)
3. Son 32'de 8 adet 3X takımını maçlara ata
4. **Son 32'yi Oluştur** ile bracket'i doldur
5. Maçlar ekranından kazananları seç (M73 → … → M104)

## Proje yapısı

```
slotio-etkinlik-bot/
├── bot/                 # Telegraf bot
├── client/              # React mini app + admin
├── server/              # Express API
├── migrations/          # PostgreSQL şema
├── docker-compose.yml
└── package.json
```

## Notlar

- Kullanıcı arayüzünde skor, puan ve averaj gösterilmez
- Bonus dağıtımında kanal üyeliği tekrar kontrol edilir
- Geliştirmede Telegram dışı test için `NODE_ENV=development` ve `X-Dev-Telegram-Id` header kullanılabilir
