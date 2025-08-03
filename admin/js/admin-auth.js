// JavaScript untuk Autentikasi Admin DocterBee
class AdminAuth {
  constructor() {
    this.apiEndpoint = "../api/admin.php";
    this.initializeAuth();
    this.setupNavigationSecurity(); // Tambah keamanan navigasi
  }

  initializeAuth() {
    // Cek apakah sudah login saat halaman dimuat
    if (window.location.pathname.includes("dashboard.html")) {
      this.checkAuthStatus();
    }

    // Event listener untuk form login
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }
  }

  // ===== KEAMANAN NAVIGASI BROWSER =====
  setupNavigationSecurity() {
    // Cegah cache halaman dashboard
    if (window.location.pathname.includes("dashboard.html")) {
      // Disable cache untuk halaman dashboard
      window.addEventListener("beforeunload", () => {
        // Hapus cache halaman ini
        if ("caches" in window) {
          caches.delete("dashboard-cache");
        }
      });

      // Handle tombol back browser
      window.addEventListener("popstate", (event) => {
        // Cek session saat tombol back ditekan
        const session = this.getSession();
        if (!session) {
          // Jika tidak ada session, paksa ke login
          window.location.replace("login.html");
          return;
        }

        // Cek apakah session masih valid
        const sessionAge = new Date().getTime() - session.loginTime;
        const maxAge = 24 * 60 * 60 * 1000; // 24 jam

        if (sessionAge > maxAge) {
          this.logout();
          return;
        }
      });

      // Push state baru untuk mencegah kembali ke login setelah logout
      if (!window.history.state || !window.history.state.dashboardAccess) {
        window.history.pushState(
          { dashboardAccess: true },
          "Dashboard",
          "dashboard.html"
        );
      }
    }

    // Untuk halaman login
    if (window.location.pathname.includes("login.html")) {
      // Cek apakah sudah login, jika ya redirect ke dashboard
      const session = this.getSession();
      if (session) {
        const sessionAge = new Date().getTime() - session.loginTime;
        const maxAge = 24 * 60 * 60 * 1000; // 24 jam

        if (sessionAge <= maxAge) {
          window.location.replace("dashboard.html");
          return;
        }
      }

      // Handle back dari login - cegah cache
      window.addEventListener("pageshow", (event) => {
        if (event.persisted) {
          // Halaman dimuat dari cache, reload untuk memastikan fresh
          window.location.reload();
        }
      });
    }

    // Set no-cache headers via meta tag (jika belum ada)
    this.setCacheControl();
  }

  setCacheControl() {
    // Tambahkan meta tag untuk disable cache jika belum ada
    if (!document.querySelector('meta[http-equiv="Cache-Control"]')) {
      const meta1 = document.createElement("meta");
      meta1.httpEquiv = "Cache-Control";
      meta1.content = "no-cache, no-store, must-revalidate";
      document.head.appendChild(meta1);

      const meta2 = document.createElement("meta");
      meta2.httpEquiv = "Pragma";
      meta2.content = "no-cache";
      document.head.appendChild(meta2);

      const meta3 = document.createElement("meta");
      meta3.httpEquiv = "Expires";
      meta3.content = "0";
      document.head.appendChild(meta3);
    }
  }

  async handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (!username || !password) {
      this.showAlert("Error", "Username dan password harus diisi!", "error");
      return;
    }

    this.showLoading();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "login",
          username: username,
          password: password,
        }),
      });

      const result = await response.json();
      this.hideLoading();

      if (result.success) {
        // Simpan session data
        localStorage.setItem(
          "docterbee_admin_session",
          JSON.stringify({
            username: result.admin.username,
            role: result.admin.role,
            loginTime: new Date().getTime(),
          })
        );

        this.showAlert(
          "Berhasil",
          "Login berhasil! Mengalihkan ke dashboard...",
          "success"
        );

        // Redirect ke dashboard setelah 1.5 detik dengan replace
        setTimeout(() => {
          window.location.replace("dashboard.html");
        }, 1500);
      } else {
        this.showAlert(
          "Login Gagal",
          result.message || "Username atau password salah!",
          "error"
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      this.hideLoading();
      this.showAlert(
        "Error",
        "Terjadi kesalahan koneksi. Silakan coba lagi.",
        "error"
      );
    }
  }

  checkAuthStatus() {
    const session = this.getSession();

    if (!session) {
      // Redirect ke halaman login jika tidak ada session dengan replace
      window.location.replace("login.html");
      return false;
    }

    // Cek apakah session masih valid (24 jam)
    const sessionAge = new Date().getTime() - session.loginTime;
    const maxAge = 24 * 60 * 60 * 1000; // 24 jam dalam milliseconds

    if (sessionAge > maxAge) {
      this.logout();
      return false;
    }

    // Update nama admin di dashboard
    const adminNameElement = document.getElementById("adminName");
    if (adminNameElement) {
      adminNameElement.textContent = session.username;
    }

    return true;
  }

  getSession() {
    try {
      const sessionData = localStorage.getItem("docterbee_admin_session");
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error("Error parsing session data:", error);
      return null;
    }
  }

  logout() {
    // Hapus session data
    localStorage.removeItem("docterbee_admin_session");

    // Clear browser history untuk mencegah back button
    if (window.history.length > 1) {
      // Replace history state agar back button tidak kembali ke dashboard
      window.history.replaceState(null, null, "login.html");
    }

    // Tambahkan delay kecil untuk memastikan localStorage cleared
    setTimeout(() => {
      // Redirect ke halaman login dengan replace (tidak bisa back)
      window.location.replace("login.html");
    }, 100);
  }

  showLoading() {
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
      loadingOverlay.classList.add("show");
    }
  }

  hideLoading() {
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
      loadingOverlay.classList.remove("show");
    }
  }

  showAlert(title, message, type = "info") {
    const modal = document.getElementById("alertModal");
    const titleElement = document.getElementById("alertTitle");
    const messageElement = document.getElementById("alertMessage");

    if (!modal || !titleElement || !messageElement) return;

    // Set icon berdasarkan type
    let icon = "fas fa-info-circle";
    if (type === "success") icon = "fas fa-check-circle";
    else if (type === "error") icon = "fas fa-exclamation-triangle";
    else if (type === "warning") icon = "fas fa-exclamation-circle";

    titleElement.innerHTML = `<i class="${icon}"></i> ${title}`;
    messageElement.textContent = message;

    modal.classList.add("show");

    // Auto close setelah 3 detik untuk success
    if (type === "success") {
      setTimeout(() => {
        this.closeAlert();
      }, 3000);
    }
  }

  closeAlert() {
    const modal = document.getElementById("alertModal");
    if (modal) {
      modal.classList.remove("show");
    }
  }
}

// Fungsi global untuk toggle password visibility
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const toggleIcon = document.getElementById("toggleIcon");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.className = "fas fa-eye-slash";
  } else {
    passwordInput.type = "password";
    toggleIcon.className = "fas fa-eye";
  }
}

// Fungsi global untuk close alert - Konsolidasi dengan admin-dashboard.js
function closeAlert() {
  // Cek apakah ada instance AdminAuth atau AdminDashboard yang aktif
  if (window.adminAuth) {
    window.adminAuth.closeAlert();
  } else if (window.adminDashboard) {
    window.adminDashboard.closeAlert();
  } else {
    // Fallback jika tidak ada instance aktif
    const modal = document.getElementById("alertModal");
    if (modal) {
      modal.classList.remove("show");
    }
  }
}

// Fungsi global untuk logout - Konsolidasi pengelolaan logout
function logout() {
  if (window.adminAuth) {
    window.adminAuth.logout();
  } else {
    // Fallback manual logout
    localStorage.removeItem("docterbee_admin_session");
    window.location.replace("login.html");
  }
}

// Initialize auth saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  // Buat instance global untuk digunakan oleh fungsi lain
  window.adminAuth = new AdminAuth();
});

// Export untuk use di file lain
window.AdminAuth = AdminAuth;
