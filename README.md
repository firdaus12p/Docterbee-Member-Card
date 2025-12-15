# 🚀 Quick Deploy via Git Clone

Panduan singkat untuk deploy DocterBee ke VPS menggunakan Git Clone.

## 📋 Prerequisites

1. VPS dengan Apache, PHP 7.4+, MySQL/MariaDB
2. Git installed di VPS
3. Repository sudah di-push ke GitHub

---

## 🔧 Deployment Steps

### 1. Setup Database di VPS

```bash
# Login ke MySQL
mysql -u root -p

# Buat database dan user
CREATE DATABASE docterbee_members CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'docterbee_user'@'localhost' IDENTIFIED BY 'Password_Kuat_Anda!';
GRANT ALL PRIVILEGES ON docterbee_members.* TO 'docterbee_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Clone Repository ke VPS

```bash
# SSH ke VPS
ssh user@your-vps-ip

# Pindah ke document root
cd /var/www/html

# Backup folder lama jika ada
sudo mv /var/www/html /var/www/html.backup.$(date +%Y%m%d)

# Clone repository
sudo git clone https://github.com/username/repo-name.git /var/www/html

# Set ownership
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo chmod -R 775 /var/www/html/gambar_kartu
```

### 3. Import Database Setup

```bash
# Import schema database
mysql -u docterbee_user -p docterbee_members < /var/www/html/database/setup.sql
```

**⚠️ PENTING:** File `setup.sql` hanya berisi struktur tabel, BUKAN data pelanggan!

### 4. Import Data Pelanggan (Manual)

Karena file SQL backup di-ignore dari Git (untuk keamanan), Anda perlu upload manual:

```bash
# Dari komputer lokal, upload file SQL
scp "c:\Projek\Pembuat Kartu\database\u508442634_data_pelanggan.sql" user@vps-ip:/tmp/

# Di VPS, import data
mysql -u docterbee_user -p docterbee_members < /tmp/u508442634_data_pelanggan.sql

# Hapus file SQL dari /tmp
rm /tmp/u508442634_data_pelanggan.sql
```

### 5. Konfigurasi Environment

```bash
# Edit file environment.php
sudo nano /var/www/html/config/environment.php
```

**Update bagian production (baris 70-108):**
- Database host: `localhost`
- Database username: `docterbee_user`
- Database password: `Password_Kuat_Anda!`
- Database name: `docterbee_members`
- Base URL: `https://your-domain.com` atau `http://your-vps-ip`
- Allowed origins: sesuaikan dengan domain/IP Anda

**Update hostname detection (baris 14-25):**
```php
if (strpos($hostname, 'memberdocterbee.site') !== false 
    || strpos($hostname, 'your-vps-ip') !== false) {
    $this->environment = 'production';
}
```

### 6. Setup Apache

```bash
# Enable required modules
sudo a2enmod rewrite headers expires deflate

# Edit virtual host
sudo nano /etc/apache2/sites-available/000-default.conf
```

**Tambahkan:**
```apache
<Directory /var/www/html>
    Options -Indexes +FollowSymLinks
    AllowOverride All
    Require all granted
</Directory>
```

```bash
# Test dan restart Apache
sudo apache2ctl configtest
sudo systemctl restart apache2
```

### 7. Verifikasi

```bash
# Cek jumlah data
mysql -u docterbee_user -p docterbee_members -e "SELECT COUNT(*) as total_members FROM members;"
mysql -u docterbee_user -p docterbee_members -e "SELECT COUNT(*) as total_admins FROM admin_users;"
```

**✅ Pastikan jumlahnya sesuai dengan data lama!**

### 8. Test di Browser

1. Akses: `http://your-vps-ip/admin/`
2. Login dengan kredensial admin lama
3. Verifikasi semua data member ada
4. Test semua fungsionalitas

---

## 🔄 Update Deployment (Pull Changes)

Jika ada perubahan di repository:

```bash
# SSH ke VPS
ssh user@your-vps-ip

# Pindah ke folder project
cd /var/www/html

# Pull latest changes
sudo git pull origin main

# Set permission lagi
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Restart Apache
sudo systemctl restart apache2
```

---

## 📝 File yang Tidak Di-Push ke GitHub

File-file berikut **TIDAK** ada di repository (sudah di-ignore):

### Dokumentasi & Workflow
- ❌ `*.md` (kecuali README.md)
- ❌ `.github/` folder
- ❌ `.agent/` folder
- ❌ `DEPLOY_CHECKLIST.md`
- ❌ `deploy-helper.sh`
- ❌ `test-db-connection.php`

### Database & Backup
- ❌ `database/*.sql` (kecuali setup.sql)
- ❌ `*.zip`, `*.rar`, dll

### Upload & Cache
- ❌ `gambar_kartu/*` (isi folder, tapi struktur folder tetap ada)
- ❌ `uploads/`, `cache/`, `temp/`

### File Sensitif
- ❌ `.env` files
- ❌ `*.pem`, `*.key` (SSH keys)
- ❌ `*.crt`, `*.cert` (SSL certificates)

---

## ✅ File yang PERLU Di-Push

File-file penting yang **HARUS** ada di repository:

- ✅ `config/config.php`
- ✅ `config/environment.php`
- ✅ `database/setup.sql` (struktur tabel)
- ✅ `api/*.php` (semua API files)
- ✅ `admin/*.html`, `admin/*.php`
- ✅ `css/`, `js/` (semua assets)
- ✅ `.htaccess`
- ✅ `README.md`

---

## 🔐 Keamanan

### File Sensitif yang Perlu Diupload Manual:
1. **Database backup** (`u508442634_data_pelanggan.sql`)
   - Upload via SCP
   - Import manual
   - Hapus setelah import

2. **SSL Certificates** (jika ada)
   - Upload via SCP
   - Simpan di `/etc/ssl/` atau sesuai kebutuhan

### Jangan Pernah Commit:
- ❌ Password atau credentials
- ❌ Database dumps dengan data real
- ❌ SSH private keys
- ❌ SSL private keys
- ❌ `.env` files dengan data production

---

## 🆘 Troubleshooting

### Git Clone Error
```bash
# Jika ada error permission
sudo chown -R $USER:$USER /var/www/html
git clone https://github.com/username/repo-name.git /var/www/html
sudo chown -R www-data:www-data /var/www/html
```

### Database Import Error
```bash
# Cek apakah database ada
mysql -u docterbee_user -p -e "SHOW DATABASES;"

# Cek apakah user punya akses
mysql -u docterbee_user -p -e "SHOW GRANTS;"
```

### Apache 403 Forbidden
```bash
# Cek permission
ls -la /var/www/html

# Set ulang permission
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

---

## 📞 Support

Untuk panduan lengkap, lihat dokumentasi lokal:
- `README.md` (di repository)
- `.agent/workflows/deploy-to-vps.md` (di lokal, tidak di-push)

---

**Catatan:** Panduan ini mengasumsikan Anda menggunakan Git untuk deployment. File dokumentasi lengkap tetap ada di lokal untuk referensi, tapi tidak di-push ke GitHub untuk menjaga repository tetap bersih.
