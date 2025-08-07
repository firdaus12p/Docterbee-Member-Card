<?php
/**
 * Script EMERGENCY untuk membuat admin ketika tidak ada admin di database
 * HAPUS FILE INI SETELAH SELESAI DIGUNAKAN!
 */

echo "<h1>🚨 EMERGENCY ADMIN CREATOR</h1>";
echo "<hr>";

// Kredensial database dari setup.sql
$host = 'localhost';
$username = 'u508442634_docterbee';
$password = 'Alanwalker009#';
$database = 'u508442634_data_pelanggan';

try {
    // Koneksi ke database
    $connection = new mysqli($host, $username, $password, $database);
    
    if ($connection->connect_error) {
        throw new Exception("Connection failed: " . $connection->connect_error);
    }
    
    $connection->set_charset("utf8mb4");
    
    echo "<div style='background: #d4edda; padding: 15px; border: 1px solid #c3e6cb; color: #155724;'>";
    echo "✅ <strong>Koneksi database berhasil!</strong><br>";
    echo "Host: " . $host . "<br>";
    echo "Database: " . $database;
    echo "</div><hr>";
    
    // Cek apakah tabel admin_users ada
    $check_table = $connection->query("SHOW TABLES LIKE 'admin_users'");
    if ($check_table->num_rows == 0) {
        echo "<h2>📋 MEMBUAT TABEL ADMIN_USERS:</h2>";
        
        // Buat tabel admin_users sesuai dengan setup.sql
        $create_table = "CREATE TABLE admin_users (
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
        
        if ($connection->query($create_table)) {
            echo "<p style='color: green;'>✅ Tabel admin_users berhasil dibuat!</p>";
        } else {
            echo "<p style='color: red;'>❌ Error membuat tabel: " . $connection->error . "</p>";
        }
    } else {
        echo "<p style='color: green;'>✅ Tabel admin_users sudah ada!</p>";
    }
    
    // Cek admin yang ada saat ini
    echo "<h2>👥 ADMIN YANG ADA SAAT INI:</h2>";
    $result = $connection->query("SELECT id, username, email, role, is_active, created_at FROM admin_users");
    
    if ($result->num_rows > 0) {
        echo "<table style='border-collapse: collapse; width: 100%; border: 1px solid #ddd;'>";
        echo "<tr style='background: #f8f9fa;'>";
        echo "<th style='border: 1px solid #ddd; padding: 8px;'>ID</th>";
        echo "<th style='border: 1px solid #ddd; padding: 8px;'>Username</th>";
        echo "<th style='border: 1px solid #ddd; padding: 8px;'>Email</th>";
        echo "<th style='border: 1px solid #ddd; padding: 8px;'>Role</th>";
        echo "<th style='border: 1px solid #ddd; padding: 8px;'>Active</th>";
        echo "<th style='border: 1px solid #ddd; padding: 8px;'>Created</th>";
        echo "</tr>";
        
        while ($row = $result->fetch_assoc()) {
            echo "<tr>";
            echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . $row['id'] . "</td>";
            echo "<td style='border: 1px solid #ddd; padding: 8px;'><strong>" . $row['username'] . "</strong></td>";
            echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . $row['email'] . "</td>";
            echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . $row['role'] . "</td>";
            echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . ($row['is_active'] ? 'Ya' : 'Tidak') . "</td>";
            echo "<td style='border: 1px solid #ddd; padding: 8px;'>" . $row['created_at'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "<div style='background: #fff3cd; padding: 15px; border: 1px solid #ffeeba; color: #856404;'>";
        echo "⚠️ <strong>TIDAK ADA ADMIN DI DATABASE!</strong><br>";
        echo "Database kosong, silakan buat admin baru di bawah.";
        echo "</div>";
    }
    
    echo "<hr>";
    
    // Form untuk membuat admin baru
    if (isset($_POST['create_admin'])) {
        $new_username = trim($_POST['admin_username']);
        $new_password = $_POST['admin_password'];
        $new_email = trim($_POST['admin_email']);
        
        if (empty($new_username) || empty($new_password)) {
            echo "<p style='color: red;'>❌ Username dan password harus diisi!</p>";
        } elseif (strlen($new_password) < 6) {
            echo "<p style='color: red;'>❌ Password minimal 6 karakter!</p>";
        } elseif (strlen($new_username) < 3) {
            echo "<p style='color: red;'>❌ Username minimal 3 karakter!</p>";
        } else {
            // Generate hash password
            $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
            
            // Insert admin baru dengan role 'admin' (default di setup.sql adalah 'moderator')
            $stmt = $connection->prepare("INSERT INTO admin_users (username, password_hash, email, role, is_active) VALUES (?, ?, ?, 'admin', 1)");
            $stmt->bind_param("sss", $new_username, $password_hash, $new_email);
            
            if ($stmt->execute()) {
                echo "<div style='background: #d4edda; padding: 15px; border: 1px solid #c3e6cb; color: #155724; margin: 10px 0;'>";
                echo "✅ <strong>ADMIN BERHASIL DIBUAT!</strong><br>";
                echo "Username: <strong>" . htmlspecialchars($new_username) . "</strong><br>";
                echo "Password: <strong>" . htmlspecialchars($new_password) . "</strong><br>";
                echo "Email: " . htmlspecialchars($new_email);
                echo "</div>";
                
                // Test login otomatis
                echo "<h3>🧪 TEST LOGIN OTOMATIS:</h3>";
                $test_stmt = $connection->prepare("SELECT id, username, password_hash, role, is_active FROM admin_users WHERE username = ? AND is_active = TRUE");
                $test_stmt->bind_param("s", $new_username);
                $test_stmt->execute();
                $test_result = $test_stmt->get_result();
                
                if ($test_result->num_rows > 0) {
                    $admin = $test_result->fetch_assoc();
                    if (password_verify($new_password, $admin['password_hash'])) {
                        echo "<p style='color: green; font-weight: bold;'>✅ TEST LOGIN BERHASIL! Admin siap digunakan!</p>";
                        
                        echo "<div style='background: #e7f3ff; padding: 15px; border: 1px solid #bee5eb; margin: 10px 0;'>";
                        echo "<h4>🚀 SEKARANG ANDA BISA LOGIN!</h4>";
                        echo "Gunakan kredensial berikut untuk login:<br>";
                        echo "• URL Login: <strong>https://memberdocterbee.site/admin/login.html</strong><br>";
                        echo "• Username: <strong>" . htmlspecialchars($new_username) . "</strong><br>";
                        echo "• Password: <strong>" . htmlspecialchars($new_password) . "</strong>";
                        echo "</div>";
                    } else {
                        echo "<p style='color: red; font-weight: bold;'>❌ Password hash tidak cocok!</p>";
                    }
                } else {
                    echo "<p style='color: red; font-weight: bold;'>❌ Admin tidak ditemukan setelah dibuat!</p>";
                }
                $test_stmt->close();
                
                // Refresh halaman untuk melihat hasil terbaru
                echo "<script>setTimeout(function(){ location.reload(); }, 3000);</script>";
                
            } else {
                echo "<p style='color: red;'>❌ Error membuat admin: " . $stmt->error . "</p>";
            }
            $stmt->close();
        }
    }
    
    echo "<h2>🛠️ BUAT ADMIN BARU:</h2>";
    echo "<form method='POST' style='background: #f8f9fa; padding: 20px; border: 1px solid #ddd; margin: 10px 0;'>";
    echo "<div style='margin-bottom: 15px;'>";
    echo "<label style='display: block; font-weight: bold; margin-bottom: 5px;'>Username:</label>";
    echo "<input type='text' name='admin_username' value='adminku' required style='width: 200px; padding: 8px; border: 1px solid #ccc;' placeholder='Masukkan username admin'>";
    echo "</div>";
    
    echo "<div style='margin-bottom: 15px;'>";
    echo "<label style='display: block; font-weight: bold; margin-bottom: 5px;'>Password:</label>";
    echo "<input type='password' name='admin_password' required style='width: 200px; padding: 8px; border: 1px solid #ccc;' placeholder='Masukkan password baru'>";
    echo "<br><small style='color: #666;'>Password default: adminku321 (ubah untuk keamanan lebih baik)</small>";
    echo "</div>";
    
    echo "<div style='margin-bottom: 15px;'>";
    echo "<label style='display: block; font-weight: bold; margin-bottom: 5px;'>Email:</label>";
    echo "<input type='email' name='admin_email' value='admin@memberdocterbee.site' style='width: 250px; padding: 8px; border: 1px solid #ccc;' placeholder='Email admin'>";
    echo "</div>";
    
    echo "<div style='margin-bottom: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffeeba; color: #856404;'>";
    echo "<strong>💡 Tips Keamanan:</strong><br>";
    echo "• Gunakan password minimal 8 karakter<br>";
    echo "• Kombinasikan huruf besar, kecil, angka, dan simbol<br>";
    echo "• Jangan gunakan password yang mudah ditebak";
    echo "</div>";
    
    // Generate password suggestion
    $suggested_password = 'Admin' . date('Y') . '#' . bin2hex(random_bytes(3));
    echo "<div style='margin-bottom: 15px; padding: 10px; background: #e7f3ff; border: 1px solid #bee5eb;'>";
    echo "<strong>🎲 Saran Password Aman:</strong> <span style='font-family: monospace; background: #f8f9fa; padding: 2px 6px;'>" . $suggested_password . "</span>";
    echo "<br><small>Klik tombol di bawah untuk menggunakan password ini</small>";
    echo "<br><button type='button' onclick='document.getElementsByName(\"admin_password\")[0].value=\"" . $suggested_password . "\"' style='padding: 5px 10px; background: #007bff; color: white; border: none; margin-top: 5px;'>Gunakan Password Ini</button>";
    echo "</div>";
    
    echo "<p><input type='submit' name='create_admin' value='🔧 BUAT ADMIN SEKARANG' style='padding: 12px 20px; background: #28a745; color: white; border: none; font-weight: bold; cursor: pointer; font-size: 14px;'></p>";
    echo "</form>";
    
    $connection->close();
    
} catch (Exception $e) {
    echo "<div style='background: #f8d7da; padding: 15px; border: 1px solid #f5c6cb; color: #721c24;'>";
    echo "❌ <strong>Error:</strong> " . $e->getMessage();
    echo "</div>";
    
    if (strpos($e->getMessage(), 'Access denied') !== false) {
        echo "<hr>";
        echo "<h2>🔧 SOLUSI MANUAL:</h2>";
        echo "<p>Karena tidak bisa koneksi otomatis, gunakan cara manual:</p>";
        echo "<ol>";
        echo "<li>Buka <strong>cPanel → phpMyAdmin</strong> di hostinger</li>";
        echo "<li>Pilih database <strong>u508442634_data_pelanggan</strong></li>";
        echo "<li>Jalankan SQL ini:</li>";
        echo "</ol>";
        
        $manual_password = 'adminku321';
        $manual_hash = password_hash($manual_password, PASSWORD_DEFAULT);
        
        echo "<pre style='background: #f5f5f5; padding: 15px; border: 1px solid #ddd; overflow: auto;'>";
        echo "-- Hapus admin lama (jika ada)\n";
        echo "DELETE FROM admin_users;\n\n";
        echo "-- Buat admin baru\n";
        echo "INSERT INTO admin_users (username, password_hash, email, role, is_active) \n";
        echo "VALUES ('adminku', '" . $manual_hash . "', 'admin@memberdocterbee.site', 'admin', 1);";
        echo "</pre>";
        
        echo "<p>Setelah menjalankan SQL di atas, login dengan:</p>";
        echo "<ul>";
        echo "<li>Username: <strong>adminku</strong></li>";
        echo "<li>Password: <strong>adminku321</strong></li>";
        echo "</ul>";
    }
}

echo "<hr>";
echo "<div style='background: #fff3cd; padding: 15px; border: 1px solid #ffeeba; color: #856404;'>";
echo "<strong>📋 SETELAH ADMIN DIBUAT:</strong><br>";
echo "1. Coba login di: <a href='https://memberdocterbee.site/admin/login.html' target='_blank' style='color: #007bff;'>https://memberdocterbee.site/admin/login.html</a><br>";
echo "2. Gunakan username dan password yang baru dibuat<br>";
echo "3. Jika login berhasil, hapus file ini untuk keamanan<br>";
echo "4. <strong style='color: red;'>HAPUS FILE setup_emergency_admin.php SETELAH BERHASIL LOGIN!</strong>";
echo "</div>";

echo "<hr>";
echo "<div style='background: #e2e3e5; padding: 15px; border: 1px solid #d6d8db; color: #383d41;'>";
echo "<strong>🔧 TROUBLESHOOTING:</strong><br>";
echo "• Jika tidak bisa login: Pastikan database dan tabel sudah dibuat<br>";
echo "• Jika error 'table not found': Jalankan setup.sql di phpMyAdmin<br>";
echo "• Jika admin dashboard error: Klik 'Setup Database' di activity log section<br>";
echo "• Untuk bantuan teknis: Hubungi developer";
echo "</div>";

echo "<hr>";
echo "<p style='color: red; font-weight: bold; font-size: 18px; text-align: center;'>🔥 HAPUS FILE setup_emergency_admin.php SETELAH BERHASIL LOGIN!</p>";
?>
