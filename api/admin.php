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
            $response = [
                'success' => true,
                'message' => 'Admin berhasil dibuat',
                'admin_id' => $admin_id
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
