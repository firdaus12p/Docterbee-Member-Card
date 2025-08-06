# 🌿 DocterBee Member Card Generator

Website pembuat kartu member otomatis untuk DocterBee dengan sistem manajemen admin yang komprehensif.

## 📋 Deskripsi Project

Sistem pembuat kartu member digital untuk DocterBee yang memungkinkan pendaftaran member baru, pencarian data member, dan pengelolaan lengkap melalui dashboard admin. Website ini dirancang responsive untuk semua device dan dilengkapi dengan fitur-fitur modern untuk memberikan pengalaman user yang optimal.

## ✨ Fitur Utama

### 🎯 Halaman Publik (index.html)

#### 🔍 Fitur Pencarian Member

- **Pencarian Real-time**: Cari data member berdasarkan nomor WhatsApp
- **Auto-fill Form**: Otomatis mengisi form jika data ditemukan
- **Validasi Data**: Sistem validasi komprehensif untuk semua input

#### 📝 Pendaftaran Member Baru

- **Form Lengkap**: Nama, WhatsApp, Email, Alamat, Umur, Kegiatan
- **7 Jenis Kartu Member**:
  - Active Worker
  - Family Member
  - Healthy & Smart Kids
  - Mums & Baby
  - New Couple
  - Pregnant Preparation
  - Senja Ceria

#### 🎨 Preview Kartu Real-time

- **Live Preview**: Melihat kartu secara real-time saat mengisi form
- **Flip Animation**: Animasi 3D untuk melihat depan/belakang kartu
- **Design Responsif**: Kartu menyesuaikan ukuran layar device

#### 📄 Generator PDF

- **Dual Side PDF**: Otomatis membuat PDF dengan depan dan belakang kartu
- **High Quality**: Kualitas tinggi menggunakan html2canvas
- **Custom Naming**: File PDF dengan nama sesuai data member

#### 💾 Penyimpanan Data

- **Database MySQL**: Penyimpanan permanen di database
- **Auto Backup**: Sistem backup otomatis untuk keamanan data
- **Validasi Server**: Validasi ganda di client dan server

#### 💬 Integrasi WhatsApp

- **Join Group**: Tombol langsung bergabung ke group WhatsApp DocterBee
- **Auto Detection**: Deteksi device mobile untuk experience optimal
- **Copy Fallback**: Auto copy link jika gagal membuka aplikasi

### 🛡️ Dashboard Admin (dashboard.html)

#### 📊 Statistik Comprehensive

- **Total Pelanggan**: Jumlah keseluruhan member terdaftar
- **Pendaftar Hari Ini**: Member yang daftar hari ini (clickable untuk detail)
- **Total Transaksi**: Akumulasi semua transaksi member
- **Pelanggan Terbaik**: Member dengan transaksi terbanyak

#### 🔍 Pencarian & Filter Advanced

- **Real-time Search**: Pencarian member berdasarkan nomor WhatsApp
- **Auto Suggestion**: Saran otomatis saat mengetik
- **Filter Lengkap**: Filter berdasarkan periode, jenis kartu, dll

#### 👥 Manajemen Member Lengkap

- **List View**: Tampilan card dengan sorting berdasarkan transaksi
- **Detail Modal**: Modal lengkap dengan semua informasi member
- **Edit Data**: Edit langsung data member dengan validasi
- **Delete Member**: Hapus member dengan konfirmasi

#### 💰 Manajemen Transaksi

- **Tracking Pembelian**: Sistem tracking jumlah pembelian per member
- **Tambah/Kurang**: Tombol mudah untuk adjust transaksi
- **History Log**: Riwayat semua perubahan transaksi
- **Statistics**: Statistik transaksi per periode

#### 📈 Activity Log System

- **Real-time Monitoring**: Log semua aktivitas admin
- **Filter Activities**: Filter berdasarkan jenis aktivitas
- **Admin Tracking**: Tracking aktivitas per admin
- **Detailed Logs**: Log detail dengan IP address dan timestamp

#### 👨‍💼 Multi Admin Management

- **Create Admin**: Buat admin baru dengan role management
- **Delete Admin**: Hapus admin dengan security validation
- **Admin List**: Daftar semua admin dengan status
- **Session Management**: Sistem login/logout yang aman

#### 📂 Export & Import

- **CSV Download**: Export semua data member ke CSV
- **UTF-8 Support**: Dukungan karakter Indonesia
- **Auto Logging**: Log otomatis setiap download

#### 📱 Mobile Optimization

- **Touch Friendly**: Interface optimal untuk perangkat mobile
- **Responsive Grid**: Layout yang menyesuaikan layar
- **Android Specific**: Optimasi khusus untuk Android
- **Gesture Support**: Dukungan gesture touch

### 🔐 Sistem Keamanan

#### 🛡️ Authentication System

- **Secure Login**: Sistem login dengan hash password
- **Session Management**: Manajemen sesi yang aman
- **Auto Logout**: Logout otomatis untuk keamanan
- **Access Control**: Kontrol akses berbasis role

#### 🔍 Validation & Security

- **Input Validation**: Validasi ketat di client dan server
- **SQL Injection Protection**: Perlindungan dari SQL injection
- **XSS Protection**: Perlindungan dari serangan XSS
- **CSRF Protection**: Token CSRF untuk form submissions

### 🌐 Teknologi & Framework

#### Frontend Technologies

- **HTML5**: Semantic markup modern
- **CSS3**: Advanced styling dengan flexbox/grid
- **JavaScript ES6+**: Modern JavaScript dengan modules
- **Responsive Design**: Mobile-first approach

#### Backend Technologies

- **PHP 7.4+**: Server-side processing
- **MySQL**: Database management
- **PDO**: Secure database connections
- **JSON API**: RESTful API architecture

#### Libraries & Tools

- **FontAwesome**: Icon system (dengan emoji fallback)
- **jsPDF**: PDF generation
- **html2canvas**: Canvas rendering
- **Poppins Font**: Typography

## 🚀 Installation & Setup

### Prerequisites

- PHP 7.4 atau lebih tinggi
- MySQL 5.7 atau lebih tinggi
- Web server (Apache/Nginx)
- Modern browser dengan JavaScript enabled

### Database Setup

```sql
-- Import database structure
SOURCE database/setup.sql;
```

### Configuration

1. Edit `config/config.php` untuk database credentials
2. Edit `config/environment.php` untuk environment settings
3. Pastikan folder `gambar_kartu/` readable
4. Set proper permissions untuk upload/download

### Default Admin

- Username: `adminku`
- Password: `adminku321` (Ganti di production!)

## 📁 Struktur Project

```
├── index.html              # Halaman utama publik
├── admin/
│   ├── dashboard.html      # Dashboard admin
│   ├── login.html         # Login admin
│   ├── css/               # Styling admin
│   └── js/                # JavaScript admin
├── api/
│   ├── admin.php          # API endpoint admin
│   ├── member.php         # API endpoint member
│   └── check_activity_table.php
├── config/
│   ├── config.php         # Database config
│   └── environment.php    # Environment settings
├── css/
│   ├── style.css          # Main stylesheet
│   └── card-positioning.css # Card layout
├── js/
│   ├── main.js            # Main application
│   ├── cardGenerator.js   # Card generation
│   ├── pdfGenerator.js    # PDF creation
│   └── database.js        # Database management
├── gambar_kartu/          # Card background images
│   ├── depan/             # Front card images
│   └── belakang/          # Back card images
├── Logo/                  # Brand assets
└── database/
    └── setup.sql          # Database structure
```

## 🎨 Customization

### Card Types

Tambah jenis kartu baru di:

- `js/cardGenerator.js` - Card type definitions
- `gambar_kartu/` - Background images
- `css/style.css` - CSS classes

### Color Themes

Edit color schemes di:

- `css/style.css` - Main colors
- `admin/css/admin.css` - Admin theme

### Responsive Breakpoints

Adjust breakpoints di:

- `css/style.css` - Media queries
- `css/card-positioning.css` - Card layouts

## 🔧 API Endpoints

### Member API (`api/member.php`)

- `POST save` - Save new member
- `POST search` - Search member by phone
- `POST get_all` - Get all members

### Admin API (`api/admin.php`)

- `POST login` - Admin authentication
- `POST create_admin` - Create new admin
- `POST update_member` - Update member data
- `POST delete_member` - Delete member
- `POST update_transaction` - Update transactions
- `POST get_activity_log` - Get activity logs
- `POST download_csv` - Export CSV

## 📱 Browser Support

### Desktop

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

### Mobile

- Chrome Mobile 70+
- Safari iOS 12+
- Samsung Internet 10+
- Firefox Mobile 65+

## 🔄 Update History

### Version 1.0 Features

- ✅ Basic member registration
- ✅ PDF generation
- ✅ Admin dashboard
- ✅ Mobile responsive design

### Version 1.1 Features

- ✅ Member search functionality
- ✅ WhatsApp group integration
- ✅ Advanced admin statistics
- ✅ Activity logging system

### Version 1.2 Features

- ✅ Transaction management
- ✅ Multi-admin support
- ✅ CSV export functionality
- ✅ Enhanced mobile optimization

## 🎯 Performance Optimization

### Frontend

- Lazy loading untuk images
- Minified CSS/JS
- Optimized font loading
- Efficient DOM manipulation

### Backend

- Database indexing
- Prepared statements
- Connection pooling
- Caching strategies

### Mobile

- Touch-optimized interface
- Optimized viewport handling
- Gesture support
- Reduced bandwidth usage

## 🛠️ Troubleshooting

### Common Issues

1. **PDF Generation Error**: Pastikan html2canvas loaded
2. **Database Connection**: Check config.php credentials
3. **Image Loading**: Verify gambar_kartu/ permissions
4. **Mobile Layout**: Check viewport meta tag

### Debug Mode

Enable debug di `config/environment.php`:

```php
define('DEBUG_MODE', true);
```

## 📄 License

Project ini dikembangkan untuk DocterBee. All rights reserved.

## 👨‍💻 Developer Info

**Dikembangkan oleh:**

- Instagram: [@firdaus.py](https://instagram.com/firdaus.py)
- Instagram: [@firdaus.rar](https://instagram.com/firdaus.rar)

## 🤝 Contributing

Untuk kontribusi atau bug reports, silakan hubungi developer melalui Instagram yang tercantum di atas.

## 📞 Support

Untuk dukungan teknis atau pertanyaan, hubungi:

- Email: 105841101320@student.unismuh.ac.id
- WhatsApp: 081342619887

---

_© 2025 DocterBee Member Card Generator. Built with ❤️ for better member management._
