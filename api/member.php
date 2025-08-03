<?php
// API untuk Member dengan keamanan CORS yang ditingkatkan
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

class DatabaseConnection {
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
            
            $this->connection->set_charset("utf8");
            
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

class MemberManager {
    private $db;
    
    public function __construct($db_connection) {
        $this->db = $db_connection;
        $this->createTableIfNotExists();
    }
    
    private function createTableIfNotExists() {
        $sql = "CREATE TABLE IF NOT EXISTS members (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nama VARCHAR(255) NOT NULL,
            whatsapp VARCHAR(20) NOT NULL,
            umur INT NOT NULL,
            kegiatan VARCHAR(255) NOT NULL,
            jenis_kartu ENUM('active_worker', 'family_member', 'healthy_smart_kids', 'mums_baby', 'new_couple', 'pregnant_preparation', 'senja_ceria') NOT NULL,
            kode_unik VARCHAR(50) UNIQUE NOT NULL,
            tanggal_berlaku VARCHAR(100) NOT NULL,
            jumlah_pembelian INT DEFAULT 0 COMMENT 'Jumlah transaksi pembelian pelanggan',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_kode_unik (kode_unik),
            INDEX idx_whatsapp (whatsapp),
            INDEX idx_created_at (created_at),
            INDEX idx_jumlah_pembelian (jumlah_pembelian)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";
        
        if (!$this->db->query($sql)) {
            throw new Exception("Error creating table: " . $this->db->error);
        }
        
        // Tambahkan kolom jumlah_pembelian jika tabel sudah ada tapi belum ada kolom ini
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
    
    public function saveMember($data) {
        // Validate required fields
        $required_fields = ['nama', 'whatsapp', 'umur', 'kegiatan', 'jenisKartu', 'kodeUnik', 'tanggalBerlaku'];
        foreach ($required_fields as $field) {
            if (empty($data[$field])) {
                throw new Exception("Field '$field' is required");
            }
        }
        
        // Sanitize input
        $nama = $this->sanitizeInput($data['nama']);
        $whatsapp = $this->sanitizeInput($data['whatsapp']);
        $umur = (int)$data['umur'];
        $kegiatan = $this->sanitizeInput($data['kegiatan']);
        $jenis_kartu = $this->sanitizeInput($data['jenisKartu']);
        $kode_unik = $this->sanitizeInput($data['kodeUnik']);
        $tanggal_berlaku = $this->sanitizeInput($data['tanggalBerlaku']);
        
        // Validate data
        if ($umur < 1 || $umur > 120) {
            throw new Exception("Invalid age");
        }
        
        if (!in_array($jenis_kartu, ['active_worker', 'family_member', 'healthy_smart_kids', 'mums_baby', 'new_couple', 'pregnant_preparation', 'senja_ceria'])) {
            throw new Exception("Invalid card type");
        }
        
        // Validasi format nomor WhatsApp harus diawali dengan 0
        $clean_whatsapp = str_replace(' ', '', $whatsapp);
        
        // Cek apakah menggunakan format +62 atau 62
        if (preg_match('/^(\+62|62)/', $clean_whatsapp)) {
            throw new Exception("Format nomor harus berawalan angka 0. Silahkan coba lagi.");
        }
        
        // Validasi format nomor dengan awalan 0
        if (!preg_match('/^0[0-9]{9,13}$/', $clean_whatsapp)) {
            throw new Exception("Format nomor harus berawalan angka 0. Silahkan coba lagi.");
        }
        
        // Validasi nomor WhatsApp tidak boleh duplicate - cek apakah sudah digunakan
        $check_whatsapp_sql = "SELECT nama FROM members WHERE whatsapp = ?";
        $stmt_check = $this->db->prepare($check_whatsapp_sql);
        $stmt_check->bind_param("s", $whatsapp);
        $stmt_check->execute();
        $existing_member = $stmt_check->get_result()->fetch_assoc();
        
        if ($existing_member) {
            throw new Exception("Maaf, nomor yang anda daftarkan telah digunakan oleh " . $existing_member['nama'] . ". Silahkan gunakan nomor yang lain.");
        }
        
        // Check if code is unique
        if (!$this->isCodeUnique($kode_unik)) {
            throw new Exception("Code already exists");
        }
        
        // Insert into database
        $stmt = $this->db->prepare("INSERT INTO members (nama, whatsapp, umur, kegiatan, jenis_kartu, kode_unik, tanggal_berlaku) VALUES (?, ?, ?, ?, ?, ?, ?)");
        
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $this->db->error);
        }
        
        $stmt->bind_param("ssissss", $nama, $whatsapp, $umur, $kegiatan, $jenis_kartu, $kode_unik, $tanggal_berlaku);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        $member_id = $this->db->insert_id;
        $stmt->close();
        
        return $member_id;
    }
    
    public function isCodeUnique($code) {
        $stmt = $this->db->prepare("SELECT id FROM members WHERE kode_unik = ? LIMIT 1");
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();
        $exists = $result->num_rows > 0;
        $stmt->close();
        
        return !$exists; // Return true if unique (not exists)
    }
    
    public function getAllMembers($limit = 1000, $offset = 0) {
        $stmt = $this->db->prepare("SELECT * FROM members ORDER BY created_at DESC LIMIT ? OFFSET ?");
        $stmt->bind_param("ii", $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $members = [];
        while ($row = $result->fetch_assoc()) {
            $members[] = $row;
        }
        
        $stmt->close();
        return $members;
    }
    
    public function getMemberByCode($code) {
        $stmt = $this->db->prepare("SELECT * FROM members WHERE kode_unik = ? LIMIT 1");
        $stmt->bind_param("s", $code);
        $stmt->execute();
        $result = $stmt->get_result();
        $member = $result->fetch_assoc();
        $stmt->close();
        
        return $member;
    }
    
    public function getMemberByWhatsApp($whatsapp) {
        // Sanitasi nomor WhatsApp - hapus semua non-digit
        $cleanWhatsApp = preg_replace('/\D/', '', $whatsapp);
        
        // Buat query yang fleksibel untuk mencari nomor dengan berbagai format
        $stmt = $this->db->prepare("SELECT * FROM members WHERE REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '+', ''), '-', '') LIKE ? OR REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '+', ''), '-', '') LIKE ? LIMIT 1");
        
        // Cari dengan format asli dan format dengan awalan 62
        $searchPattern1 = "%$cleanWhatsApp%";
        $searchPattern2 = "%62$cleanWhatsApp%";
        
        $stmt->bind_param("ss", $searchPattern1, $searchPattern2);
        $stmt->execute();
        $result = $stmt->get_result();
        $member = $result->fetch_assoc();
        $stmt->close();
        
        return $member;
    }
    
    public function bulkSave($members_data) {
        $saved_count = 0;
        $errors = [];
        
        foreach ($members_data as $index => $data) {
            try {
                $this->saveMember($data);
                $saved_count++;
            } catch (Exception $e) {
                $errors[] = "Record " . ($index + 1) . ": " . $e->getMessage();
            }
        }
        
        return [
            'saved' => $saved_count,
            'errors' => $errors
        ];
    }
    
    private function sanitizeInput($input) {
        return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
    
    public function getStats() {
        $sql = "SELECT 
                    COUNT(*) as total_members,
                    COUNT(CASE WHEN jenis_kartu = 'active_worker' THEN 1 END) as active_worker_count,
                    COUNT(CASE WHEN jenis_kartu = 'family_member' THEN 1 END) as family_member_count,
                    COUNT(CASE WHEN jenis_kartu = 'healthy_smart_kids' THEN 1 END) as healthy_smart_kids_count,
                    COUNT(CASE WHEN jenis_kartu = 'mums_baby' THEN 1 END) as mums_baby_count,
                    COUNT(CASE WHEN jenis_kartu = 'new_couple' THEN 1 END) as new_couple_count,
                    COUNT(CASE WHEN jenis_kartu = 'pregnant_preparation' THEN 1 END) as pregnant_preparation_count,
                    COUNT(CASE WHEN jenis_kartu = 'senja_ceria' THEN 1 END) as senja_ceria_count,
                    COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_registrations
                FROM members";
                
        $result = $this->db->query($sql);
        return $result->fetch_assoc();
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
    $db_connection = new DatabaseConnection($db_config);
    $member_manager = new MemberManager($db_connection->getConnection());
    
    $response = ['success' => false];
    
    switch ($request_data['action']) {
        case 'save':
            if (!isset($request_data['data'])) {
                throw new Exception('Member data not provided');
            }
            
            $member_id = $member_manager->saveMember($request_data['data']);
            $response = [
                'success' => true,
                'message' => 'Member saved successfully',
                'member_id' => $member_id
            ];
            break;
            
        case 'check_code':
            if (!isset($request_data['code'])) {
                throw new Exception('Code not provided');
            }
            
            $is_unique = $member_manager->isCodeUnique($request_data['code']);
            $response = [
                'success' => true,
                'unique' => $is_unique
            ];
            break;
            
        case 'get_all':
            $limit = isset($request_data['limit']) ? (int)$request_data['limit'] : 1000;
            $offset = isset($request_data['offset']) ? (int)$request_data['offset'] : 0;
            
            $members = $member_manager->getAllMembers($limit, $offset);
            $response = [
                'success' => true,
                'data' => $members,
                'count' => count($members)
            ];
            break;
            
        case 'get_by_code':
            if (!isset($request_data['code'])) {
                throw new Exception('Code not provided');
            }
            
            $member = $member_manager->getMemberByCode($request_data['code']);
            $response = [
                'success' => true,
                'data' => $member
            ];
            break;
            
        case 'search_by_whatsapp':
            if (!isset($request_data['whatsapp'])) {
                throw new Exception('WhatsApp number not provided');
            }
            
            $member = $member_manager->getMemberByWhatsApp($request_data['whatsapp']);
            if ($member) {
                $response = [
                    'success' => true,
                    'data' => $member,
                    'found' => true
                ];
            } else {
                $response = [
                    'success' => false,
                    'data' => null,
                    'found' => false,
                    'message' => 'Member tidak ditemukan'
                ];
            }
            break;
            
        case 'bulk_save':
            if (!isset($request_data['data']) || !is_array($request_data['data'])) {
                throw new Exception('Bulk data not provided or invalid');
            }
            
            $result = $member_manager->bulkSave($request_data['data']);
            $response = [
                'success' => true,
                'message' => "Saved {$result['saved']} records",
                'synced' => $result['saved'],
                'errors' => $result['errors']
            ];
            break;
            
        case 'stats':
            $stats = $member_manager->getStats();
            $response = [
                'success' => true,
                'data' => $stats
            ];
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
    $db_connection->close();
    
} catch (Exception $e) {
    $response = [
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => $e->getCode()
    ];
    
    // Log error for debugging
    error_log("API Error: " . $e->getMessage());
    
    // Return appropriate HTTP status code
    if (strpos($e->getMessage(), 'not found') !== false) {
        http_response_code(404);
    } elseif (strpos($e->getMessage(), 'Invalid') !== false) {
        http_response_code(400);
    } else {
        http_response_code(500);
    }
}

// Return JSON response
echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit();
?>
