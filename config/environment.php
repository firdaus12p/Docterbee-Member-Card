<?php
// Environment detection dan konfigurasi yang sesuai
// File ini akan mendeteksi apakah running di development atau production

class EnvironmentDetector {
    private $environment;
    private $config;
    
    public function __construct() {
        $this->detectEnvironment();
        $this->loadConfig();
    }
    
    private function detectEnvironment() {
        // Deteksi berdasarkan hostname dan server
        $hostname = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? 'localhost';
        
        if (strpos($hostname, 'memberdocterbee.site') !== false) {
            $this->environment = 'production';
        } elseif (strpos($hostname, '127.0.0.1') !== false || strpos($hostname, 'localhost') !== false) {
            $this->environment = 'development';  
        } else {
            $this->environment = 'production'; // Default ke production untuk keamanan
        }
    }
    
    private function loadConfig() {
        if ($this->environment === 'development') {
            // Konfigurasi untuk development (localhost)
            $this->config = [
                'database' => [
                    'host' => 'localhost',
                    'username' => 'root',
                    'password' => '',
                    'database' => 'docterbee_members',
                    'charset' => 'utf8mb4',
                    'options' => [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                    ]
                ],
                'app' => [
                    'name' => 'DocterBee Membership Card System',
                    'version' => '1.0.0',
                    'debug' => true, // Debug aktif di development
                    'timezone' => 'Asia/Jakarta',
                    'upload_path' => 'uploads/',
                    'max_file_size' => 5 * 1024 * 1024,
                    'base_url' => 'http://127.0.0.1:5500'
                ],
                'security' => [
                    'allowed_origins' => [
                        'http://127.0.0.1:5500',
                        'http://localhost:5500',
                        'http://127.0.0.1',
                        'http://localhost'
                    ],
                    'session' => [
                        'name' => 'DOCTERBEE_DEV_SESSION',
                        'lifetime' => 3600,
                        'secure' => false, // HTTP untuk development
                        'httponly' => true,
                        'samesite' => 'Lax'
                    ]
                ]
            ];
        } else {
            // Konfigurasi untuk production (hosting)
            $this->config = [
                'database' => [
                    'host' => '127.0.0.1:3306',
                    'username' => 'u508442634_docterbee',
                    'password' => 'Alanwalker009#',
                    'database' => 'u508442634_data_pelanggan',
                    'charset' => 'utf8mb4',
                    'options' => [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                    ]
                ],
                'app' => [
                    'name' => 'DocterBee Membership Card System',
                    'version' => '1.0.0',
                    'debug' => false, // Debug nonaktif di production
                    'timezone' => 'Asia/Jakarta',
                    'upload_path' => 'uploads/',
                    'max_file_size' => 5 * 1024 * 1024,
                    'base_url' => 'https://memberdocterbee.site'
                ],
                'security' => [
                    'allowed_origins' => [
                        'https://memberdocterbee.site',
                        'http://memberdocterbee.site'
                    ],
                    'session' => [
                        'name' => 'DOCTERBEE_SESSION',
                        'lifetime' => 3600,
                        'secure' => true, // HTTPS untuk production
                        'httponly' => true,
                        'samesite' => 'Strict'
                    ]
                ]
            ];
        }
        
        // Konfigurasi umum yang sama untuk semua environment
        $common_config = [
            'card' => [
                'types' => [
                    'active_worker' => [
                        'name' => 'Active Worker',
                        'validity_years' => 5,
                        'color_scheme' => ['#2196F3', '#1565C0', '#0D47A1']
                    ],
                    'family_member' => [
                        'name' => 'Family Member', 
                        'validity_years' => 5,
                        'color_scheme' => ['#4CAF50', '#388E3C', '#1B5E20']
                    ],
                    'healthy_smart_kids' => [
                        'name' => 'Healthy & Smart Kids',
                        'validity_years' => 3,
                        'color_scheme' => ['#FFC107', '#FF9800', '#FF6F00']
                    ],
                    'mums_baby' => [
                        'name' => 'Mums & Baby',
                        'validity_years' => 3,
                        'color_scheme' => ['#E91E63', '#AD1457', '#880E4F']
                    ],
                    'new_couple' => [
                        'name' => 'New Couple',
                        'validity_years' => 5,
                        'color_scheme' => ['#9C27B0', '#7B1FA2', '#4A148C']
                    ],
                    'pregnant_preparation' => [
                        'name' => 'Pregnant Preparation',
                        'validity_years' => 2,
                        'color_scheme' => ['#673AB7', '#512DA8', '#311B92']
                    ],
                    'senja_ceria' => [
                        'name' => 'Senja Ceria',
                        'validity_years' => 5,
                        'color_scheme' => ['#FF5722', '#E64A19', '#BF360C']
                    ]
                ],
                'dimensions' => [
                    'width' => 85.60, // mm
                    'height' => 53.98 // mm
                ]
            ]
        ];
        
        // Merge konfigurasi umum dengan konfigurasi environment-specific
        $this->config = array_merge($this->config, $common_config);
        $this->config['environment'] = $this->environment;
    }
    
    public function getConfig() {
        return $this->config;
    }
    
    public function getEnvironment() {
        return $this->environment;
    }
    
    public function isDevelopment() {
        return $this->environment === 'development';
    }
    
    public function isProduction() {
        return $this->environment === 'production';
    }
}

// Export konfigurasi
$env = new EnvironmentDetector();
return $env->getConfig();
?>
