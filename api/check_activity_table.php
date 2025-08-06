<?php
// Script untuk mengecek dan membuat tabel admin_activity_log jika belum ada
require_once '../config/config.php';

try {
    // Check if table exists
    $check_table = $db_connection->query("SHOW TABLES LIKE 'admin_activity_log'");
    
    if ($check_table->num_rows == 0) {
        echo "Tabel admin_activity_log tidak ditemukan. Membuat tabel...\n";
        
        $create_table_sql = "
        CREATE TABLE admin_activity_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NOT NULL COMMENT 'ID admin yang melakukan aktivitas',
            admin_name VARCHAR(100) NOT NULL COMMENT 'Nama admin yang melakukan aktivitas',
            activity_type ENUM('login', 'member_add', 'member_edit', 'member_delete', 'admin_create', 'admin_delete', 'transaction') NOT NULL COMMENT 'Jenis aktivitas',
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log aktivitas admin'
        ";
        
        if ($db_connection->query($create_table_sql)) {
            echo "Tabel admin_activity_log berhasil dibuat!\n";
        } else {
            echo "Error membuat tabel: " . $db_connection->error . "\n";
        }
    } else {
        echo "Tabel admin_activity_log sudah ada.\n";
        
        // Check table structure
        $desc_result = $db_connection->query("DESCRIBE admin_activity_log");
        echo "Struktur tabel:\n";
        while ($row = $desc_result->fetch_assoc()) {
            echo "- {$row['Field']}: {$row['Type']}\n";
        }
    }
    
    // Test basic query
    $test_query = $db_connection->query("SELECT COUNT(*) as count FROM admin_activity_log");
    if ($test_query) {
        $count = $test_query->fetch_assoc()['count'];
        echo "Jumlah record dalam tabel: $count\n";
    } else {
        echo "Error saat test query: " . $db_connection->error . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
