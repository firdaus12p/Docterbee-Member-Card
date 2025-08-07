-- Database setup untuk hosting memberdocterbee.site
-- Database: u508442634_data_pelanggan
-- Username: u508442634_docterbee  
-- Password: Alanwalker009#

-- Gunakan database yang sudah dibuat di hosting
USE u508442634_data_pelanggan;

-- Create members table untuk hosting
CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL COMMENT 'Nama lengkap anggota',
    whatsapp VARCHAR(20) NOT NULL COMMENT 'Nomor WhatsApp anggota',
    email VARCHAR(255) NOT NULL COMMENT 'Email anggota',
    alamat TEXT NOT NULL COMMENT 'Alamat lengkap anggota',
    umur INT NOT NULL COMMENT 'Umur anggota',
    kegiatan VARCHAR(255) NOT NULL COMMENT 'Kegiatan atau profesi anggota',
    jenis_kartu ENUM('active_worker', 'family_member', 'healthy_smart_kids', 'mums_baby', 'new_couple', 'pregnant_preparation', 'senja_ceria') NOT NULL COMMENT 'Jenis kartu anggota',
    kode_unik VARCHAR(50) UNIQUE NOT NULL COMMENT 'Kode unik untuk setiap kartu',
    tanggal_berlaku VARCHAR(100) NOT NULL COMMENT 'Tanggal berlaku kartu',
    jumlah_pembelian INT DEFAULT 0 COMMENT 'Jumlah transaksi pembelian pelanggan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Tanggal pendaftaran',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Tanggal update terakhir',
    
    -- Indexes for better performance
    INDEX idx_kode_unik (kode_unik),
    INDEX idx_whatsapp (whatsapp),
    INDEX idx_email (email),
    INDEX idx_alamat (alamat(100)),
    INDEX idx_umur (umur),
    INDEX idx_kegiatan (kegiatan),
    INDEX idx_jenis_kartu (jenis_kartu),
    INDEX idx_created_at (created_at),
    INDEX idx_jumlah_pembelian (jumlah_pembelian)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel data anggota DocterBee';

-- Create admin user table (optional for future admin panel)
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT 'Username admin',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Hash password admin',
    email VARCHAR(100) COMMENT 'Email admin',
    role ENUM('admin', 'moderator') DEFAULT 'moderator' COMMENT 'Role admin',
    last_login TIMESTAMP NULL COMMENT 'Login terakhir',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Tanggal dibuat',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Status aktif admin',
    
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel admin users';

-- Create activity log table (optional for auditing)
CREATE TABLE IF NOT EXISTS activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT COMMENT 'ID anggota yang terkait',
    action VARCHAR(50) NOT NULL COMMENT 'Aksi yang dilakukan',
    details TEXT COMMENT 'Detail aksi',
    ip_address VARCHAR(45) COMMENT 'IP address pengguna',
    user_agent TEXT COMMENT 'User agent browser',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu aksi',
    
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE SET NULL,
    INDEX idx_member_id (member_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log aktivitas sistem';

-- Create admin activity log table for admin monitoring
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL COMMENT 'ID admin yang melakukan aktivitas',
    admin_name VARCHAR(100) NOT NULL COMMENT 'Nama admin yang melakukan aktivitas',
    activity_type ENUM('login', 'member_add', 'member_edit', 'member_delete', 'admin_create', 'admin_delete', 'transaction', 'download') NOT NULL COMMENT 'Jenis aktivitas',
    title VARCHAR(255) NOT NULL COMMENT 'Judul aktivitas',
    description TEXT COMMENT 'Deskripsi aktivitas',
    details JSON COMMENT 'Detail aktivitas dalam format JSON',
    ip_address VARCHAR(45) COMMENT 'IP address admin',
    user_agent TEXT COMMENT 'User agent admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu aktivitas',
    
    INDEX idx_admin_id (admin_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created_at (created_at),
    INDEX idx_admin_activity (admin_id, activity_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log aktivitas admin';

-- Insert sample admin user (password: adminku321)
-- CATATAN: Ganti password ini di production!
INSERT IGNORE INTO admin_users (username, password_hash, email, role) 
VALUES ('adminku', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@memberdocterbee.site', 'admin');

-- Sample data (optional - remove in production)
INSERT IGNORE INTO members (nama, whatsapp, email, alamat, umur, kegiatan, jenis_kartu, kode_unik, tanggal_berlaku) VALUES
('John Doe', '08123456789', 'john@email.com', 'Jl. Contoh No. 123, Jakarta', 25, 'Karyawan Swasta', 'active_worker', '1234567890123456789', 'VALID July 2025 - July 2030'),
('Jane Smith', '08234567890', 'jane@email.com', 'Jl. Sample No. 456, Bandung', 30, 'Ibu Rumah Tangga', 'family_member', '2345678901234567890', 'VALID July 2025 - July 2030'),
('Bob Johnson', '08345678901', 'bob@email.com', 'Jl. Test No. 789, Surabaya', 22, 'Mahasiswa', 'healthy_smart_kids', '3456789012345678901', 'VALID July 2025 - July 2030');

-- Add kegiatan column if it doesn't exist (for existing databases)
ALTER TABLE members ADD COLUMN IF NOT EXISTS kegiatan VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Kegiatan atau profesi anggota' AFTER umur;

-- Add index for kegiatan column if it doesn't exist
ALTER TABLE members ADD INDEX IF NOT EXISTS idx_kegiatan (kegiatan);

-- Create views for reporting (optional)
CREATE OR REPLACE VIEW member_statistics AS
SELECT 
    jenis_kartu,
    COUNT(*) as total_members,
    AVG(umur) as average_age,
    MIN(created_at) as first_registration,
    MAX(created_at) as latest_registration
FROM members 
GROUP BY jenis_kartu;

CREATE OR REPLACE VIEW daily_registrations AS
SELECT 
    DATE(created_at) as registration_date,
    COUNT(*) as registrations,
    COUNT(CASE WHEN jenis_kartu = 'active_worker' THEN 1 END) as active_worker_count,
    COUNT(CASE WHEN jenis_kartu = 'family_member' THEN 1 END) as family_member_count,
    COUNT(CASE WHEN jenis_kartu = 'healthy_smart_kids' THEN 1 END) as healthy_smart_kids_count,
    COUNT(CASE WHEN jenis_kartu = 'mums_baby' THEN 1 END) as mums_baby_count,
    COUNT(CASE WHEN jenis_kartu = 'new_couple' THEN 1 END) as new_couple_count,
    COUNT(CASE WHEN jenis_kartu = 'pregnant_preparation' THEN 1 END) as pregnant_preparation_count,
    COUNT(CASE WHEN jenis_kartu = 'senja_ceria' THEN 1 END) as senja_ceria_count
FROM members 
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY registration_date DESC;

-- Create stored procedures for common operations
DELIMITER //

CREATE PROCEDURE GetMemberByCode(IN p_kode_unik VARCHAR(50))
BEGIN
    SELECT * FROM members WHERE kode_unik = p_kode_unik;
END //

CREATE PROCEDURE GetMembersByCardType(IN p_jenis_kartu VARCHAR(20))
BEGIN
    SELECT * FROM members 
    WHERE jenis_kartu = p_jenis_kartu 
    ORDER BY created_at DESC;
END //

CREATE PROCEDURE GetRecentMembers(IN p_limit INT)
BEGIN
    SELECT * FROM members 
    ORDER BY created_at DESC 
    LIMIT p_limit;
END //

CREATE PROCEDURE GetMemberStats()
BEGIN
    SELECT 
        COUNT(*) as total_members,
        COUNT(CASE WHEN jenis_kartu = 'active_worker' THEN 1 END) as active_worker_members,
        COUNT(CASE WHEN jenis_kartu = 'family_member' THEN 1 END) as family_member_members,
        COUNT(CASE WHEN jenis_kartu = 'healthy_smart_kids' THEN 1 END) as healthy_smart_kids_members,
        COUNT(CASE WHEN jenis_kartu = 'mums_baby' THEN 1 END) as mums_baby_members,
        COUNT(CASE WHEN jenis_kartu = 'new_couple' THEN 1 END) as new_couple_members,
        COUNT(CASE WHEN jenis_kartu = 'pregnant_preparation' THEN 1 END) as pregnant_preparation_members,
        COUNT(CASE WHEN jenis_kartu = 'senja_ceria' THEN 1 END) as senja_ceria_members,
        COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_registrations,
        COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as week_registrations,
        COUNT(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as month_registrations,
        AVG(umur) as average_age,
        MIN(created_at) as first_member_date,
        MAX(created_at) as latest_member_date
    FROM members;
END //

DELIMITER ;

-- Create triggers for auditing (optional)
DELIMITER //

-- Trigger saat insert member baru  
CREATE TRIGGER member_insert_log 
AFTER INSERT ON members
FOR EACH ROW
BEGIN
    INSERT INTO activity_log (member_id, action, details, created_at)
    VALUES (NEW.id, 'INSERT', CONCAT('Anggota baru dibuat: ', NEW.nama), NOW());
END //

-- Trigger saat update member
CREATE TRIGGER member_update_log 
AFTER UPDATE ON members
FOR EACH ROW
BEGIN
    INSERT INTO activity_log (member_id, action, details, created_at)
    VALUES (NEW.id, 'UPDATE', CONCAT('Data anggota diupdate: ', NEW.nama), NOW());
END //

DELIMITER ;

-- Optimize tables
OPTIMIZE TABLE members;
OPTIMIZE TABLE admin_users;
OPTIMIZE TABLE activity_log;

-- Tampilkan informasi database
SELECT 'Database setup berhasil untuk hosting memberdocterbee.site' as status;
