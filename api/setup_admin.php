<?php
// File untuk membuat admin default di hosting
header('Content-Type: application/json');

// Load konfigurasi database
$config = require_once '../config/config.php';
$db_config = $config['database'];

try {
    // Koneksi ke database
    $connection = new mysqli(
        $db_config['host'],
        $db_config['username'],
        $db_config['password'],
        $db_config['database']
    );
    
    if ($connection->connect_error) {
        throw new Exception("Connection failed: " . $connection->connect_error);
    }
    
    $connection->set_charset("utf8mb4");
    
    // Buat tabel admin_users jika belum ada
    $sql = "CREATE TABLE IF NOT EXISTS admin_users (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabel admin users'";
    
    if (!$connection->query($sql)) {
        throw new Exception("Error creating admin table: " . $connection->error);
    }
    
    // Cek apakah admin default sudah ada
    $result = $connection->query("SELECT COUNT(*) as count FROM admin_users WHERE username = 'admin'");
    $row = $result->fetch_assoc();
    
    $message = "";
    
    if ($row['count'] == 0) {
        // Buat admin default dengan password yang aman
        $username = 'admin';
        // Generate password yang aman dan acak
        $default_password = 'DocterBee2025!' . bin2hex(random_bytes(4));
        $password_hash = password_hash($default_password, PASSWORD_DEFAULT);
        $email = 'admin@memberdocterbee.site';
        
        $stmt = $connection->prepare("INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, 'admin')");
        $stmt->bind_param("sss", $username, $password_hash, $email);
        
        if ($stmt->execute()) {
            $message = "Admin default berhasil dibuat dengan password: $default_password";
        } else {
            throw new Exception("Gagal membuat admin default: " . $stmt->error);
        }
        $stmt->close();
    } else {
        $message = "Admin default sudah ada";
    }
    
    // Ambil semua admin untuk verifikasi
    $result = $connection->query("SELECT id, username, email, role, created_at, is_active FROM admin_users");
    $admins = [];
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $admins[] = $row;
        }
    }
    
    // Response sukses
    $response = [
        'success' => true,
        'message' => $message,
        'admin_count' => count($admins),
        'admins' => $admins,
        'timestamp' => date('Y-m-d H:i:s')
    ];
    
} catch (Exception $e) {
    // Response error
    $response = [
        'success' => false,
        'message' => 'Setup admin gagal',
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ];
}

// Return JSON response
echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>
