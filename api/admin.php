<?php
// API untuk Admin Dashboard DocterBee dengan keamanan CORS yang ditingkatkan
header('Content-Type: application/json');

// Load config untuk mendapatkan allowed origins
$config = require_once '../config/config.php';
$allowed_origins = $config['security']['allowed_origins'] ?? ['*'];

// Set CORS header yang aman berdasarkan origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins) || in_array('*', $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: null');
}

header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Tangani preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Load konfigurasi database (sudah dimuat di atas untuk CORS)
$db_config = $config['database'];

// Class untuk koneksi database
class AdminDatabaseConnection {
    private $connection;
    
    public function __construct($config) {
        try {
            $this->connection = new mysqli(
                $config['host'],
                $config['username'],
                $config['password'],
                $config['database']
            );
            
            if ($this->connection->connect_error) {
                throw new Exception("Connection failed: " . $this->connection->connect_error);
            }
            
            $this->connection->set_charset("utf8mb4");
            
        } catch (Exception $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function close() {
        if ($this->connection) {
            $this->connection->close();
        }
    }
}

// Class untuk manajemen admin
class AdminManager {
    private $db;
    
    public function __construct($db_connection) {
        $this->db = $db_connection;
        $this->createAdminTableIfNotExists();
    }
    
    private function createAdminTableIfNotExists() {
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
        
        if (!$this->db->query($sql)) {
            throw new Exception("Error creating admin table: " . $this->db->error);
        }
        
        // Buat admin default jika belum ada
        $this->createDefaultAdmin();
    }
    
    private function createDefaultAdmin() {
        // Cek apakah sudah ada admin
        $result = $this->db->query("SELECT COUNT(*) as count FROM admin_users");
        $row = $result->fetch_assoc();
        
        if ($row['count'] == 0) {
            // Buat admin default dengan password: admin123
            $username = 'admin';
            $password_hash = password_hash('admin123', PASSWORD_DEFAULT);
            $email = 'admin@memberdocterbee.site';
            
            $stmt = $this->db->prepare("INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, 'admin')");
            $stmt->bind_param("sss", $username, $password_hash, $email);
            $stmt->execute();
            $stmt->close();
        }
    }
    
    public function login($username, $password) {
        $stmt = $this->db->prepare("SELECT id, username, password_hash, role, is_active FROM admin_users WHERE username = ? AND is_active = TRUE");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            throw new Exception("Username tidak ditemukan atau tidak aktif");
        }
        
        $admin = $result->fetch_assoc();
        $stmt->close();
        
        if (!password_verify($password, $admin['password_hash'])) {
            throw new Exception("Password salah");
        }
        
        // Update last login
        $this->updateLastLogin($admin['id']);
        
        return [
            'id' => $admin['id'],
            'username' => $admin['username'],
            'role' => $admin['role']
        ];
    }
    
    private function updateLastLogin($admin_id) {
        $stmt = $this->db->prepare("UPDATE admin_users SET last_login = NOW() WHERE id = ?");
        $stmt->bind_param("i", $admin_id);
        $stmt->execute();
        $stmt->close();
    }
    
    public function createAdmin($data) {
        // Validasi input
        if (empty($data['username']) || empty($data['password'])) {
            throw new Exception("Username dan password harus diisi");
        }
        
        if (strlen($data['password']) < 6) {
            throw new Exception("Password minimal 6 karakter");
        }
        
        // Cek apakah username sudah ada
        $stmt = $this->db->prepare("SELECT id FROM admin_users WHERE username = ?");
        $stmt->bind_param("s", $data['username']);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            throw new Exception("Username sudah digunakan");
        }
        $stmt->close();
        
        // Hash password
        $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
        
        // Insert admin baru
        $stmt = $this->db->prepare("INSERT INTO admin_users (username, password_hash, email, role) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", 
            $data['username'], 
            $password_hash, 
            $data['email'], 
            $data['role']
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Gagal membuat admin baru: " . $stmt->error);
        }
        
        $admin_id = $this->db->insert_id;
        $stmt->close();
        
        return $admin_id;
    }
    
    public function getAllAdmins() {
        $stmt = $this->db->prepare("SELECT id, username, email, role, last_login, created_at, is_active FROM admin_users ORDER BY created_at DESC");
        $stmt->execute();
        $result = $stmt->get_result();
        
        $admins = [];
        while ($row = $result->fetch_assoc()) {
            $admins[] = $row;
        }
        
        $stmt->close();
        return $admins;
    }
    
    public function deleteAdmin($admin_id, $current_admin_id) {
        // Validasi input
        if (!is_numeric($admin_id)) {
            throw new Exception("ID admin tidak valid");
        }
        
        // Prevent admin from deleting themselves
        if ($admin_id == $current_admin_id) {
            throw new Exception("Tidak dapat menghapus akun sendiri");
        }
        
        // Cek apakah admin ada
        $stmt = $this->db->prepare("SELECT id, username FROM admin_users WHERE id = ?");
        $stmt->bind_param("i", $admin_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows == 0) {
            throw new Exception("Admin tidak ditemukan");
        }
        $stmt->close();
        
        // Cek apakah ini admin terakhir
        $count_stmt = $this->db->prepare("SELECT COUNT(*) as total FROM admin_users WHERE is_active = TRUE");
        $count_stmt->execute();
        $count_result = $count_stmt->get_result();
        $count_row = $count_result->fetch_assoc();
        $count_stmt->close();
        
        if ($count_row['total'] <= 1) {
            throw new Exception("Tidak dapat menghapus admin terakhir");
        }
        
        // Hapus admin
        $stmt = $this->db->prepare("DELETE FROM admin_users WHERE id = ?");
        $stmt->bind_param("i", $admin_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus admin: " . $stmt->error);
        }
        
        $stmt->close();
        return true;
    }
}

// Class untuk manajemen member dari admin
class AdminMemberManager {
    private $db;
    
    public function __construct($db_connection) {
        $this->db = $db_connection;
        $this->addJumlahPembelianColumn();
    }
    
    private function addJumlahPembelianColumn() {
        // Cek apakah kolom jumlah_pembelian sudah ada
        $result = $this->db->query("SHOW COLUMNS FROM members LIKE 'jumlah_pembelian'");
        
        if ($result->num_rows == 0) {
            // Tambah kolom jumlah_pembelian jika belum ada
            $sql = "ALTER TABLE members ADD COLUMN jumlah_pembelian INT DEFAULT 0 COMMENT 'Jumlah transaksi pembelian pelanggan'";
            $this->db->query($sql);
            
            // Tambah index untuk performance
            $this->db->query("ALTER TABLE members ADD INDEX idx_jumlah_pembelian (jumlah_pembelian)");
        }
    }
    
    public function updateTransaction($member_id, $jumlah_pembelian) {
        // Validasi input
        if (!is_numeric($member_id) || !is_numeric($jumlah_pembelian)) {
            throw new Exception("Data tidak valid");
        }
        
        if ($jumlah_pembelian < 0) {
            throw new Exception("Jumlah pembelian tidak boleh negatif");
        }
        
        // Update jumlah pembelian
        $stmt = $this->db->prepare("UPDATE members SET jumlah_pembelian = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param("ii", $jumlah_pembelian, $member_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Gagal mengupdate transaksi: " . $stmt->error);
        }
        
        $affected_rows = $stmt->affected_rows;
        $stmt->close();
        
        if ($affected_rows == 0) {
            throw new Exception("Member tidak ditemukan");
        }
        
        return true;
    }
    
    public function updateMember($member_id, $data) {
        // Validasi input
        if (!is_numeric($member_id)) {
            throw new Exception("ID member tidak valid");
        }
        
        if (empty($data['nama'])) {
            throw new Exception("Nama tidak boleh kosong");
        }
        
        if (empty($data['whatsapp'])) {
            throw new Exception("WhatsApp tidak boleh kosong");
        }
        
        
        if (!is_numeric($data['umur']) || $data['umur'] < 1 || $data['umur'] > 120) {
            throw new Exception("Umur harus antara 1-120 tahun");
        }
        
        // Cek apakah member ada
        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ?");
        $stmt->bind_param("i", $member_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows == 0) {
            throw new Exception("Member tidak ditemukan");
        }
        $stmt->close();
        
        // Update member data
        $stmt = $this->db->prepare("UPDATE members SET nama = ?, whatsapp = ?, email = ?, umur = ?, kegiatan = ?, updated_at = NOW() WHERE id = ?");
        $stmt->bind_param("sssisi", 
            $data['nama'],
            $data['whatsapp'],
            $data['email'],
            $data['umur'],
            $data['kegiatan'],
            $member_id
        );
        
        if (!$stmt->execute()) {
            throw new Exception("Gagal mengupdate member: " . $stmt->error);
        }
        
        $stmt->close();
        return true;
    }
    
    public function deleteMember($member_id) {
        // Validasi input
        if (!is_numeric($member_id)) {
            throw new Exception("ID member tidak valid");
        }
        
        // Cek apakah member ada
        $stmt = $this->db->prepare("SELECT id FROM members WHERE id = ?");
        $stmt->bind_param("i", $member_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows == 0) {
            throw new Exception("Member tidak ditemukan");
        }
        $stmt->close();
        
        // Hapus member
        $stmt = $this->db->prepare("DELETE FROM members WHERE id = ?");
        $stmt->bind_param("i", $member_id);
        
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus member: " . $stmt->error);
        }
        
        $stmt->close();
        return true;
    }
    
    public function searchByPhone($phone) {
        $phone = "%" . $phone . "%";
        $stmt = $this->db->prepare("SELECT * FROM members WHERE whatsapp LIKE ? ORDER BY jumlah_pembelian DESC, created_at DESC");
        $stmt->bind_param("s", $phone);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $members = [];
        while ($row = $result->fetch_assoc()) {
            $members[] = $row;
        }
        
        $stmt->close();
        return $members;
    }
    
    public function downloadMembersCSV() {
        // Get all members data
        $stmt = $this->db->prepare("SELECT * FROM members ORDER BY created_at DESC");
        $stmt->execute();
        $result = $stmt->get_result();
        
        // Count total records for logging
        $total_records = $result->num_rows;
        
        // Set headers for CSV download
        $filename = 'data_pelanggan_' . date('Y-m-d') . '.csv';
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-cache, must-revalidate');
        header('Pragma: no-cache');
        
        // Create output stream
        $output = fopen('php://output', 'w');
        
        // Add BOM for UTF-8 (to handle Indonesian characters properly in Excel)
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        // CSV headers based on setup.sql structure
        $headers = [
            'ID',
            'Nama Lengkap',
            'WhatsApp',
            'Email',
            'Alamat',
            'Umur',
            'Jenis Kartu',
            'Kode Unik',
            'Tanggal Berlaku',
            'Jumlah Pembelian',
            'Tanggal Daftar',
            'Tanggal Update'
        ];
        
        fputcsv($output, $headers);
        
        // Add data rows
        while ($row = $result->fetch_assoc()) {
            $data = [
                $row['id'],
                $row['nama'],
                $row['whatsapp'],
                $row['email'],
                $row['alamat'],
                $row['umur'],
                $row['jenis_kartu'],
                $row['kode_unik'],
                $row['tanggal_berlaku'],
                $row['jumlah_pembelian'],
                $row['created_at'],
                $row['updated_at']
            ];
            fputcsv($output, $data);
        }
        
        fclose($output);
        $stmt->close();
        
        // Stop script execution after CSV download
        exit();
    }
}

// Activity Manager Class
class ActivityManager {
    private $db;
    
    public function __construct($db_connection) {
        $this->db = $db_connection;
        $this->createActivityTableIfNotExists();
    }
    
    private function createActivityTableIfNotExists() {
        $sql = "CREATE TABLE IF NOT EXISTS admin_activity_log (
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
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Log aktivitas admin'";
        
        if (!$this->db->query($sql)) {
            throw new Exception("Error creating activity log table: " . $this->db->error);
        }
    }
    
    public function logActivity($activity_type, $title, $details = null, $admin_id = null, $admin_name = null) {
        // Get admin info from session if not provided
        if (!$admin_id) {
            session_start();
            $admin_id = $_SESSION['admin_id'] ?? 1;
            $admin_name = $_SESSION['admin_username'] ?? 'Admin';
        }
        
        // Get client IP and user agent
        $ip_address = $this->getClientIP();
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        
        $stmt = $this->db->prepare("
            INSERT INTO admin_activity_log 
            (admin_id, admin_name, activity_type, title, details, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->bind_param("issssss", $admin_id, $admin_name, $activity_type, $title, $details, $ip_address, $user_agent);
        
        if (!$stmt->execute()) {
            error_log("Failed to log activity: " . $stmt->error);
        }
        
        $stmt->close();
    }
    
    public function getAllActivities($limit = 100) {
        try {
            // Check if table exists
            $check_table = $this->db->query("SHOW TABLES LIKE 'admin_activity_log'");
            if ($check_table->num_rows == 0) {
                throw new Exception("Tabel admin_activity_log tidak ditemukan. Silakan jalankan setup database.");
            }
            
            $stmt = $this->db->prepare("
                SELECT id, admin_id, admin_name, activity_type, title, description, details, 
                       ip_address, created_at 
                FROM admin_activity_log 
                ORDER BY created_at DESC 
                LIMIT ?
            ");
            
            if (!$stmt) {
                throw new Exception("Database prepare failed: " . $this->db->error);
            }
            
            $stmt->bind_param("i", $limit);
            
            if (!$stmt->execute()) {
                throw new Exception("Query execution failed: " . $stmt->error);
            }
            
            $result = $stmt->get_result();
            
            if (!$result) {
                throw new Exception("Failed to get result set: " . $stmt->error);
            }
            
            $activities = [];
            while ($row = $result->fetch_assoc()) {
                $activities[] = $row;
            }
            
            $stmt->close();
            return $activities;
            
        } catch (Exception $e) {
            error_log("ActivityManager::getAllActivities error: " . $e->getMessage());
            throw new Exception("Gagal mengambil data aktivitas: " . $e->getMessage());
        }
    }
    
    public function clearActivityLog() {
        $stmt = $this->db->prepare("DELETE FROM admin_activity_log");
        
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus log aktivitas: " . $stmt->error);
        }
        
        $stmt->close();
        return true;
    }
    
    public function clearUnknownActivityLogs() {
        $stmt = $this->db->prepare("DELETE FROM admin_activity_log WHERE admin_name = 'Unknown' OR title LIKE '%Unknown%'");
        
        if (!$stmt->execute()) {
            throw new Exception("Gagal menghapus log aktivitas dengan Unknown: " . $stmt->error);
        }
        
        $stmt->close();
        return true;
    }
    
    private function getClientIP() {
        // Check for shared internet
        if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
            return $_SERVER['HTTP_CLIENT_IP'];
        }
        // Check for remote IP passed from proxy
        elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            return $_SERVER['HTTP_X_FORWARDED_FOR'];
        }
        // Check for remote IP from remote address
        elseif (!empty($_SERVER['REMOTE_ADDR'])) {
            return $_SERVER['REMOTE_ADDR'];
        }
        
        return '0.0.0.0';
    }
}

// Main request handler
try {
    // Get JSON input
    $input = file_get_contents('php://input');
    $request_data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON input');
    }
    
    if (!isset($request_data['action'])) {
        throw new Exception('Action not specified');
    }
    
    // Initialize database connection
    $db_connection = new AdminDatabaseConnection($db_config);
    $admin_manager = new AdminManager($db_connection->getConnection());
    $member_manager = new AdminMemberManager($db_connection->getConnection());
    
    $response = ['success' => false];
    
    switch ($request_data['action']) {
        case 'login':
            if (!isset($request_data['username']) || !isset($request_data['password'])) {
                throw new Exception('Username dan password harus diisi');
            }
            
            $admin_data = $admin_manager->login($request_data['username'], $request_data['password']);
            $response = [
                'success' => true,
                'message' => 'Login berhasil',
                'admin' => $admin_data
            ];
            break;
            
        case 'create_admin':
            if (!isset($request_data['data'])) {
                throw new Exception('Data admin tidak ditemukan');
            }
            
            $admin_id = $admin_manager->createAdmin($request_data['data']);
            
            // Log activity for admin creation
            $activity_manager = new ActivityManager($db_connection->getConnection());
            $activity_manager->logActivity(
                'admin_create',
                "Admin Baru Dibuat\nNama Admin : " . $request_data['data']['username'],
                json_encode([
                    'new_admin_id' => $admin_id,
                    'new_admin_username' => $request_data['data']['username'],
                    'new_admin_email' => $request_data['data']['email'] ?? '',
                    'new_admin_role' => $request_data['data']['role'] ?? 'moderator'
                ]),
                $request_data['admin_id'] ?? 1,
                $request_data['admin_name'] ?? 'Admin'
            );
            
            $response = [
                'success' => true,
                'message' => 'Admin berhasil dibuat',
                'admin_id' => $admin_id
            ];
            break;
            
        case 'get_all_admins':
            $admins = $admin_manager->getAllAdmins();
            $response = [
                'success' => true,
                'data' => $admins,
                'count' => count($admins)
            ];
            break;
            
        case 'delete_admin':
            if (!isset($request_data['admin_id']) || !isset($request_data['current_admin_id'])) {
                throw new Exception('Data admin tidak lengkap');
            }
            
            $admin_manager->deleteAdmin($request_data['admin_id'], $request_data['current_admin_id']);
            $response = [
                'success' => true,
                'message' => 'Admin berhasil dihapus'
            ];
            break;
            
        case 'update_transaction':
            if (!isset($request_data['member_id']) || !isset($request_data['jumlah_pembelian'])) {
                throw new Exception('Data transaksi tidak lengkap');
            }
            
            $member_manager->updateTransaction($request_data['member_id'], $request_data['jumlah_pembelian']);
            $response = [
                'success' => true,
                'message' => 'Transaksi berhasil diupdate'
            ];
            break;
            
        case 'update_member':
            if (!isset($request_data['member_id']) || !isset($request_data['data'])) {
                throw new Exception('Data member tidak lengkap');
            }
            
            $member_manager->updateMember($request_data['member_id'], $request_data['data']);
            $response = [
                'success' => true,
                'message' => 'Data member berhasil diperbarui'
            ];
            break;
            
        case 'delete_member':
            if (!isset($request_data['member_id'])) {
                throw new Exception('ID member tidak ditemukan');
            }
            
            $member_manager->deleteMember($request_data['member_id']);
            $response = [
                'success' => true,
                'message' => 'Member berhasil dihapus'
            ];
            break;
            
        case 'search_member':
            if (!isset($request_data['phone'])) {
                throw new Exception('Nomor telepon tidak ditemukan');
            }
            
            $members = $member_manager->searchByPhone($request_data['phone']);
            $response = [
                'success' => true,
                'data' => $members,
                'count' => count($members)
            ];
            break;

        case 'setup_activity_table':
            try {
                // Check if table exists
                $check_table = $db_connection->getConnection()->query("SHOW TABLES LIKE 'admin_activity_log'");
                
                if ($check_table->num_rows == 0) {
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
                    
                    if ($db_connection->getConnection()->query($create_table_sql)) {
                        $response = [
                            'success' => true,
                            'message' => 'Tabel admin_activity_log berhasil dibuat'
                        ];
                    } else {
                        throw new Exception("Gagal membuat tabel: " . $db_connection->getConnection()->error);
                    }
                } else {
                    $response = [
                        'success' => true,
                        'message' => 'Tabel admin_activity_log sudah ada'
                    ];
                }
            } catch (Exception $e) {
                $response = [
                    'success' => false,
                    'message' => 'Error setup tabel: ' . $e->getMessage()
                ];
            }
            break;

        case 'get_activity_log':
            try {
                $activity_manager = new ActivityManager($db_connection->getConnection());
                $activities = $activity_manager->getAllActivities();
                
                $response = [
                    'success' => true,
                    'data' => $activities,
                    'count' => count($activities)
                ];
            } catch (Exception $e) {
                error_log("Activity log error: " . $e->getMessage());
                $response = [
                    'success' => false,
                    'message' => 'Gagal memuat log aktivitas: ' . $e->getMessage(),
                    'error_details' => $e->getFile() . ':' . $e->getLine()
                ];
            }
            break;

        case 'log_activity':
            if (!isset($request_data['activity_type']) || !isset($request_data['title'])) {
                throw new Exception('Data aktivitas tidak lengkap');
            }
            
            $activity_manager = new ActivityManager($db_connection->getConnection());
            $activity_manager->logActivity(
                $request_data['activity_type'],
                $request_data['title'],
                $request_data['details'] ?? null,
                $request_data['admin_id'] ?? 1,
                $request_data['admin_name'] ?? 'Admin'
            );
            
            $response = [
                'success' => true,
                'message' => 'Aktivitas berhasil dicatat'
            ];
            break;

        case 'clear_activity_log':
            $activity_manager = new ActivityManager($db_connection->getConnection());
            $activity_manager->clearActivityLog();
            $response = [
                'success' => true,
                'message' => 'Log aktivitas berhasil dihapus'
            ];
            break;

        case 'clear_unknown_activity_logs':
            $activity_manager = new ActivityManager($db_connection->getConnection());
            $activity_manager->clearUnknownActivityLogs();
            $response = [
                'success' => true,
                'message' => 'Log aktivitas dengan Unknown berhasil dihapus'
            ];
            break;

        case 'download_csv':
            // Log activity before download
            $activity_manager = new ActivityManager($db_connection->getConnection());
            
            // Get member count for logging
            $count_stmt = $db_connection->getConnection()->prepare("SELECT COUNT(*) as count FROM members");
            $count_stmt->execute();
            $count_result = $count_stmt->get_result();
            $count_data = $count_result->fetch_assoc();
            $total_records = $count_data['count'];
            $count_stmt->close();
            
            // Log the download activity
            $activity_manager->logActivity(
                'download',
                'Download Data CSV',
                json_encode([
                    'filename' => 'data_pelanggan_' . date('Y-m-d') . '.csv',
                    'total_records' => $total_records,
                    'download_time' => date('Y-m-d H:i:s')
                ]),
                $request_data['admin_id'] ?? 1,
                $request_data['admin_name'] ?? 'Admin'
            );
            
            // Proceed with download
            $member_manager->downloadMembersCSV();
            break;
            
        default:
            throw new Exception('Action tidak valid');
    }
    
    $db_connection->close();
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => $e->getCode()
    ];
    
    // Log error untuk debugging
    error_log("Admin API Error: " . $e->getMessage());
    
    // Return appropriate HTTP status code
    if (strpos($e->getMessage(), 'tidak ditemukan') !== false) {
        http_response_code(404);
    } elseif (strpos($e->getMessage(), 'tidak valid') !== false || strpos($e->getMessage(), 'harus diisi') !== false) {
        http_response_code(400);
    } elseif (strpos($e->getMessage(), 'salah') !== false) {
        http_response_code(401);
    } else {
        http_response_code(500);
    }
}

// Return JSON response
echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit();
?>
