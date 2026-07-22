-- تنظیمات اولیه PostgreSQL
-- این فایل هنگام اولین اجرای Docker اجرا می‌شود

-- ایجاد کاربر (در صورت نیاز)
-- CREATE USER golduser WITH PASSWORD 'goldpass123';

-- ایجاد دیتابیس (در صورت نیاز)
-- CREATE DATABASE goldplatform OWNER golduser;

-- تنظیم Timezone
SET timezone = 'Asia/Tehran';

-- فعال‌سازی extension برای UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
