# 🥇 Gold Platform — پلتفرم خرید و فروش طلا

## ساختار پروژه

```
gold-platform/
├── docker-compose.yml          # زیرساخت Docker
├── .env.example                # نمونه متغیرهای محیطی
├── .gitignore                  # فایل‌های نادیده‌گرفته‌شده
├── init.sql                    # اسکریپت اولیه PostgreSQL
├── SETUP_GUIDE.md              # راهنمای نصب کامل
├── backend/                    # NestJS Backend
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma       # مدل داده‌ها
│   └── src/
│       ├── main.ts             # نقطه ورود
│       ├── app.module.ts       # ماژول اصلی
│       ├── auth/               # OTP + JWT + KYC
│       ├── gold/               # قیمت لحظه‌ای + WebSocket
│       ├── wallet/             # کیف پول + تراکنش
│       ├── payments/           # درگاه پرداخت
│       └── common/             # Prisma + Redis
└── frontend/                   # Next.js Frontend
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── app/                    # صفحات Next.js
    ├── components/             # کامپوننت‌ها
    └── hooks/                  # Custom Hooks
```

## شروع سریع

```bash
# ۱. Clone پروژه
git clone <repo-url>
cd gold-platform

# ۲. تنظیم env
cp .env.example .env
# ویرایش .env با مقادیر واقعی

# ۳. اجرا
docker-compose up -d

# ۴. Migrate دیتابیس
cd backend
npx prisma migrate dev --name init

# ۵. مشاهده
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# API Docs: http://localhost:3001/api/v1
```

## API Endpoints

### Auth
- `POST /api/v1/auth/send-otp` — ارسال کد OTP
- `POST /api/v1/auth/verify-otp` — تأیید OTP + صدور JWT
- `POST /api/v1/auth/refresh` — تمدید توکن

### Gold Price
- `GET /api/v1/gold/price` — قیمت لحظه‌ای
- `GET /api/v1/gold/history?period=24h` — تاریخچه قیمت

### Wallet
- `GET /api/v1/wallet` — موجودی کیف پول
- `GET /api/v1/wallet/transactions` — تاریخچه تراکنش
- `POST /api/v1/wallet/buy` — خرید طلا
- `POST /api/v1/wallet/sell` — فروش طلا

### Payments
- `POST /api/v1/payments/create` — درخواست پرداخت
- `POST /api/v1/payments/verify` — تأیید پرداخت
- `GET /api/v1/payments/callback` — Callback درگاه

## WebSocket
- `ws://localhost:3001/gold` — قیمت لحظه‌ای (real-time)

## تکنولوژی‌ها

| لایه | تکنولوژی |
|------|----------|
| Frontend | Next.js 14, Tailwind CSS, Framer Motion, Recharts |
| Backend | NestJS, TypeScript, Prisma, Socket.io |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT + OTP (Kavenegar) |
| Payment | Zarinpal + IDPay |
 Deployed via GitHub Actions
| Deploy | Docker, Nginx, Certbot |

## مجوز

این پروژه متعلق به [نام شما] است. کلیه حقوق محفوظ است.
