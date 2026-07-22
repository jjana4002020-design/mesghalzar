# 🥇 راهنمای نصب کامل پلتفرم طلا

## پیش‌نیازها

- Ubuntu 22.04 LTS (روی VPS)
- دامنه .ir یا .com (ثبت‌شده)
- دسترسی root به سرور

---

## مرحله ۱: نصب Docker و Docker Compose

```bash
# به‌روزرسانی سیستم
sudo apt update && sudo apt upgrade -y

# نصب Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# نصب Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# بررسی نصب
docker --version
docker-compose --version
```

---

## مرحله ۲: Clone پروژه

```bash
# نصب git
sudo apt install git -y

# Clone پروژه (یا آپلود دستی)
cd /opt
sudo git clone <your-repo-url> gold-platform
sudo chown -R $USER:$USER gold-platform
cd gold-platform
```

---

## مرحله ۳: تنظیم متغیرهای محیطی

```bash
# ایجاد فایل .env
cat > .env << 'EOF'
# Database
DB_PASSWORD=your-secure-password-32-chars-here

# JWT Secrets (از https://generate-secret.vercel.app/32)
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Kavenegar SMS
KAVENEGAR_API_KEY=your-kavenegar-api-key

# Zarinpal
ZARINPAL_MERCHANT=your-merchant-id
ZARINPAL_SANDBOX=true

# Frontend
FRONTEND_URL=https://yourdomain.ir
EOF
```

**⚠️ مهم:** حتماً Secrets را از generate-secret.vercel.app/32 بگیرید.

---

## مرحله ۴: راه‌اندازی سرویس‌ها

```bash
# اجرای Docker Compose
docker-compose up -d postgres redis

# انتظار برای آماده‌شدن PostgreSQL (۳۰ ثانیه)
sleep 30

# اجرای migrations
cd backend
docker-compose exec backend npx prisma migrate dev --name init

# ساخت و اجرای Backend
cd ..
docker-compose up -d backend

# ساخت و اجرای Frontend
docker-compose up -d frontend

# بررسی وضعیت
docker-compose ps
```

---

## مرحله ۵: تنظیم Nginx + SSL (Certbot)

```bash
# نصب Nginx
sudo apt install nginx -y

# نصب Certbot
sudo apt install certbot python3-certbot-nginx -y

# تنظیم Nginx
sudo tee /etc/nginx/sites-available/gold-platform << 'EOF'
server {
    listen 80;
    server_name yourdomain.ir www.yourdomain.ir;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# فعال‌سازی
sudo ln -s /etc/nginx/sites-available/gold-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# دریافت SSL
sudo certbot --nginx -d yourdomain.ir -d www.yourdomain.ir
```

---

## مرحله ۶: تنظیم Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

---

## مرحله ۷: Backup خودکار

```bash
# ایجاد اسکریپت backup
sudo tee /opt/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec gold-postgres pg_dump -U golduser goldplatform > $BACKUP_DIR/db_$DATE.sql

# Backup Redis
docker exec gold-redis redis-cli SAVE
docker cp gold-redis:/data/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# فشرده‌سازی
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR db_$DATE.sql redis_$DATE.rdb
rm $BACKUP_DIR/db_$DATE.sql $BACKUP_DIR/redis_$DATE.rdb

# نگهداری ۷ روز آخر
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
EOF

sudo chmod +x /opt/backup.sh

# Cron job روزانه
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/backup.sh") | crontab -
```

---

## مرحله ۸: مانیتورینگ

```bash
# نصب UptimeRobot (از سایت)
# یا نصب Prometheus + Grafana (پیشرفته)

# اسکریپت ساده چک سلامت
cat > /opt/health-check.sh << 'EOF'
#!/bin/bash
if ! curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "Frontend down at $(date)" | tee -a /opt/health.log
fi
if ! curl -f http://localhost:3001/api/v1/gold/price > /dev/null 2>&1; then
    echo "Backend down at $(date)" | tee -a /opt/health.log
fi
EOF
chmod +x /opt/health-check.sh

# هر ۵ دقیقه
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/health-check.sh") | crontab -
```

---

## دستورات مفید روزانه

```bash
# مشاهده لاگ‌ها
docker-compose logs -f backend
docker-compose logs -f frontend

# ری‌استارت سرویس
docker-compose restart backend

# به‌روزرسانی کد
git pull
docker-compose up -d --build

# دسترسی به دیتابیس
docker-compose exec postgres psql -U golduser -d goldplatform

# دسترسی به Redis
docker-compose exec redis redis-cli
```

---

## عیب‌یابی

### مشکل: پورت‌ها اشغال هستند
```bash
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5432
sudo lsof -i :6379
# بستن پروسه: sudo kill -9 <PID>
```

### مشکل: Permission Denied
```bash
sudo chown -R $USER:$USER /opt/gold-platform
```

### مشکل: PostgreSQL اجرا نمی‌شود
```bash
docker-compose logs postgres
# معمولاً به دلیل conflict در data volume
sudo rm -rf postgres_data
docker-compose up -d postgres
```

---

## پشتیبانی

- **ایمیل:** support@yourdomain.ir
- **تلفن:** ۰۲۱-XXXXXXX
- **تلگرام:** @yourgold_support
