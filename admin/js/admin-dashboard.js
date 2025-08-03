// JavaScript untuk Dashboard Admin DocterBee

// Global functions (fallback jika dipanggil sebelum DOM ready)
window.sendLinkToWhatsApp = function () {
  if (window.adminDashboard && window.adminDashboard.sendLinkToWhatsApp) {
    window.adminDashboard.sendLinkToWhatsApp();
  } else {
    console.warn("AdminDashboard belum siap, mencoba lagi dalam 100ms...");
    setTimeout(() => {
      if (window.adminDashboard && window.adminDashboard.sendLinkToWhatsApp) {
        window.adminDashboard.sendLinkToWhatsApp();
      } else {
        alert("Fitur WhatsApp belum tersedia. Silakan refresh halaman.");
      }
    }, 100);
  }
};

class AdminDashboard {
  constructor() {
    this.apiEndpoint = "../api/admin.php";
    this.memberApiEndpoint = "../api/member.php";
    this.currentMember = null;
    this.allMembers = [];
    this.filteredMembers = [];

    this.initialize();
  }

  async initialize() {
    // Cek autentikasi terlebih dahulu
    const adminAuth = new AdminAuth();
    if (!adminAuth.checkAuthStatus()) {
      return;
    }

    // Load data awal
    await this.loadStatistics();
    await this.loadMembers();

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Search input untuk real-time filtering
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) =>
        this.handleSearch(e.target.value)
      );
      searchInput.addEventListener("keyup", (e) => {
        const clearBtn = document.getElementById("clearSearch");
        if (clearBtn) {
          clearBtn.style.display = e.target.value ? "block" : "none";
        }
      });
    }

    // Form untuk membuat admin baru
    const createAdminForm = document.getElementById("createAdminForm");
    if (createAdminForm) {
      createAdminForm.addEventListener("submit", (e) =>
        this.handleCreateAdmin(e)
      );
    }
  }

  async loadStatistics() {
    try {
      const response = await fetch(this.memberApiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ action: "stats" }),
      });

      const result = await response.json();

      if (result.success) {
        this.updateStatistics(result.data);
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  }

  updateStatistics(stats) {
    // Update total members - gunakan jumlah member yang sudah diload
    const totalMembersElement = document.getElementById("totalMembers");
    if (totalMembersElement) {
      // Gunakan allMembers.length untuk mendapatkan jumlah real member yang diload
      totalMembersElement.textContent = this.allMembers
        ? this.allMembers.length
        : 0;
    }

    // Update today registrations
    const todayRegistrationsElement =
      document.getElementById("todayRegistrations");
    if (todayRegistrationsElement) {
      todayRegistrationsElement.textContent = stats.today_registrations || 0;
    }

    // Calculate total transactions dari semua members
    const totalTransactions = this.allMembers.reduce((total, member) => {
      return total + (parseInt(member.jumlah_pembelian) || 0);
    }, 0);

    const totalTransactionsElement =
      document.getElementById("totalTransactions");
    if (totalTransactionsElement) {
      totalTransactionsElement.textContent = totalTransactions;
    }

    // Find top customer berdasarkan jumlah pembelian
    let topCustomer = "-";
    if (this.allMembers.length > 0) {
      const sortedMembers = [...this.allMembers].sort((a, b) => {
        return (
          (parseInt(b.jumlah_pembelian) || 0) -
          (parseInt(a.jumlah_pembelian) || 0)
        );
      });

      if (sortedMembers[0] && parseInt(sortedMembers[0].jumlah_pembelian) > 0) {
        topCustomer = sortedMembers[0].nama;
      }
    }

    const topCustomerElement = document.getElementById("topCustomerName");
    if (topCustomerElement) {
      topCustomerElement.textContent = topCustomer;
    }
  }

  async loadMembers() {
    try {
      this.showLoadingMembers();

      const response = await fetch(this.memberApiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ action: "get_all", limit: 1000 }),
      });

      const result = await response.json();

      if (result.success) {
        this.allMembers = result.data || [];
        this.filteredMembers = [...this.allMembers];
        this.renderMembers();
        // Load ulang statistik setelah data member dimuat untuk mendapatkan data real-time
        await this.loadStatistics();
      } else {
        this.showAlert(
          "Error",
          "Gagal memuat data member: " + result.message,
          "error"
        );
      }
    } catch (error) {
      console.error("Error loading members:", error);
      this.showAlert(
        "Error",
        "Terjadi kesalahan saat memuat data member",
        "error"
      );
    } finally {
      this.hideLoadingMembers();
    }
  }

  showLoadingMembers() {
    const container = document.getElementById("membersContainer");
    if (container) {
      container.innerHTML = `
                <div class="loading-members">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Memuat data pelanggan...</p>
                </div>
            `;
    }
  }

  hideLoadingMembers() {
    // Loading akan dihapus saat renderMembers() dipanggil
  }

  renderMembers() {
    const container = document.getElementById("membersContainer");
    if (!container) return;

    if (this.filteredMembers.length === 0) {
      container.innerHTML = `
                <div class="no-members">
                    <i class="fas fa-users-slash"></i>
                    <p>Tidak ada data member yang ditemukan</p>
                </div>
            `;
      return;
    }

    // Sort berdasarkan jumlah pembelian (terbanyak dulu)
    const sortedMembers = [...this.filteredMembers].sort((a, b) => {
      return (
        (parseInt(b.jumlah_pembelian) || 0) -
        (parseInt(a.jumlah_pembelian) || 0)
      );
    });

    const membersHTML = sortedMembers
      .map((member) => this.createMemberCard(member))
      .join("");
    container.innerHTML = membersHTML;
  }

  createMemberCard(member) {
    const cardTypeName = this.getCardTypeName(member.jenis_kartu);
    const badgeClass = `badge-${member.jenis_kartu}`;
    const createdAt = new Date(member.created_at).toLocaleDateString("id-ID");

    return `
            <div class="member-card" onclick="adminDashboard.showMemberModal(${
              member.id
            })">
                <div class="member-card-header">
                    <div class="member-basic-info">
                        <h4>${this.escapeHtml(member.nama)}</h4>
                        <p><i class="fas fa-phone"></i> ${this.escapeHtml(
                          member.whatsapp
                        )}</p>
                    </div>
                    <div class="member-badge ${badgeClass}">
                        ${cardTypeName}
                    </div>
                </div>
                
                <div class="member-details-grid">
                    <div class="member-detail-item">
                        <label>Umur:</label>
                        <span>${member.umur} tahun</span>
                    </div>
                    <div class="member-detail-item">
                        <label>Kegiatan:</label>
                        <span>${this.escapeHtml(member.kegiatan)}</span>
                    </div>
                    <div class="member-detail-item">
                        <label>Kode Unik:</label>
                        <span>${this.escapeHtml(member.kode_unik)}</span>
                    </div>
                    <div class="member-detail-item">
                        <label>Tanggal Daftar:</label>
                        <span>${createdAt}</span>
                    </div>
                </div>
                
                <div class="transaction-count-display">
                    <i class="fas fa-shopping-cart"></i> 
                    ${parseInt(member.jumlah_pembelian) || 0} Transaksi
                </div>
            </div>
        `;
  }

  handleSearch(searchTerm) {
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
      this.filteredMembers = [...this.allMembers];
    } else {
      this.filteredMembers = this.allMembers.filter(
        (member) =>
          member.whatsapp.toLowerCase().includes(term) ||
          member.nama.toLowerCase().includes(term)
      );
    }

    this.renderMembers();
  }

  clearSearch() {
    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearSearch");

    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }

    if (clearBtn) {
      clearBtn.style.display = "none";
    }

    this.filteredMembers = [...this.allMembers];
    this.renderMembers();
  }

  showMemberModal(memberId) {
    const member = this.allMembers.find((m) => m.id == memberId);
    if (!member) return;

    this.currentMember = member;

    // Populate modal dengan data member
    document.getElementById("modalNama").textContent = member.nama;
    document.getElementById("modalWhatsapp").textContent = member.whatsapp;
    document.getElementById("modalUmur").textContent = member.umur + " tahun";
    document.getElementById("modalKegiatan").textContent = member.kegiatan;
    document.getElementById("modalJenisKartu").textContent =
      this.getCardTypeName(member.jenis_kartu);
    document.getElementById("modalKodeUnik").textContent = member.kode_unik;
    document.getElementById("modalTanggalBerlaku").textContent =
      member.tanggal_berlaku;
    document.getElementById("modalCreatedAt").textContent = new Date(
      member.created_at
    ).toLocaleDateString("id-ID");
    document.getElementById("modalJumlahPembelian").textContent =
      parseInt(member.jumlah_pembelian) || 0;

    // Show modal
    const modal = document.getElementById("memberModal");
    if (modal) {
      modal.classList.add("show");
    }
  }

  closeMemberModal() {
    const modal = document.getElementById("memberModal");
    if (modal) {
      modal.classList.remove("show");
    }
    this.currentMember = null;
  }

  async adjustTransaction(amount) {
    if (!this.currentMember) return;

    const currentAmount = parseInt(this.currentMember.jumlah_pembelian) || 0;
    const newAmount = Math.max(0, currentAmount + amount); // Tidak boleh negatif

    this.showLoading();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "update_transaction",
          member_id: this.currentMember.id,
          jumlah_pembelian: newAmount,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update current member data
        this.currentMember.jumlah_pembelian = newAmount;

        // Update di array allMembers
        const memberIndex = this.allMembers.findIndex(
          (m) => m.id == this.currentMember.id
        );
        if (memberIndex !== -1) {
          this.allMembers[memberIndex].jumlah_pembelian = newAmount;
        }

        // Update modal display
        document.getElementById("modalJumlahPembelian").textContent = newAmount;

        // Refresh tampilan members dan statistics
        this.renderMembers();
        this.updateStatistics({});

        this.showAlert(
          "Berhasil",
          `Jumlah pembelian berhasil ${amount > 0 ? "ditambah" : "dikurangi"}`,
          "success"
        );
      } else {
        this.showAlert(
          "Error",
          result.message || "Gagal mengupdate transaksi",
          "error"
        );
      }
    } catch (error) {
      console.error("Error adjusting transaction:", error);
      this.showAlert(
        "Error",
        "Terjadi kesalahan saat mengupdate transaksi",
        "error"
      );
    } finally {
      this.hideLoading();
    }
  }

  async sendLinkToWhatsApp() {
    if (!this.currentMember) return;

    // Nomor WhatsApp pelanggan
    let whatsappNumber = this.currentMember.whatsapp;

    // Ubah nomor yang berawalan 0 menjadi 62 untuk format internasional
    if (whatsappNumber.startsWith("0")) {
      whatsappNumber = "62" + whatsappNumber.substring(1);
    }

    // Link group yang akan dikirim
    const groupLink =
      "https://chat.whatsapp.com/K2LvoY38WDkLaXkfy2vKmE?mode=ac_t";

    // Pesan yang akan dikirim dengan link group
    const message = `Halo ${this.currentMember.nama}! 🌟\n\nTerima kasih telah menjadi member setia kami. Silakan bergabung dengan grup WhatsApp eksklusif kami:\n\n${groupLink}\n\nDi grup ini Anda akan mendapatkan:\n✅ Update produk terbaru\n✅ Promo khusus member\n✅ Kelas Edukasi Kesehatan Gratis\n✅ Tips kesehatan\n✅ Konsultasi gratis\n\nSampai jumpa di grup! 😊`;

    // Encode message untuk URL
    const encodedMessage = encodeURIComponent(message);

    // Buat URL WhatsApp dengan nomor dan pesan
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    // Buka WhatsApp dengan pesan otomatis
    window.open(whatsappUrl, "_blank");

    this.showAlert(
      "Success",
      `Link group telah disiapkan untuk dikirim ke ${this.currentMember.nama} (${whatsappNumber})`,
      "success"
    );
  }

  confirmDeleteMember() {
    if (!this.currentMember) return;

    this.showConfirmation(
      "Hapus Member",
      `Apakah Anda yakin ingin menghapus member "${this.currentMember.nama}"? Tindakan ini tidak dapat dibatalkan.`,
      () => this.deleteMember()
    );
  }

  async deleteMember() {
    if (!this.currentMember) return;

    this.showLoading();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "delete_member",
          member_id: this.currentMember.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Remove dari arrays
        this.allMembers = this.allMembers.filter(
          (m) => m.id != this.currentMember.id
        );
        this.filteredMembers = this.filteredMembers.filter(
          (m) => m.id != this.currentMember.id
        );

        // Close modal dan refresh tampilan
        this.closeMemberModal();
        this.renderMembers();
        this.updateStatistics({});

        this.showAlert("Berhasil", "Member berhasil dihapus", "success");
      } else {
        this.showAlert(
          "Error",
          result.message || "Gagal menghapus member",
          "error"
        );
      }
    } catch (error) {
      console.error("Error deleting member:", error);
      this.showAlert(
        "Error",
        "Terjadi kesalahan saat menghapus member",
        "error"
      );
    } finally {
      this.hideLoading();
    }
  }

  showCreateAdminModal() {
    const modal = document.getElementById("createAdminModal");
    if (modal) {
      modal.classList.add("show");
    }
  }

  closeCreateAdminModal() {
    const modal = document.getElementById("createAdminModal");
    if (modal) {
      modal.classList.remove("show");
    }

    // Reset form
    const form = document.getElementById("createAdminForm");
    if (form) {
      form.reset();
    }
  }

  async handleCreateAdmin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const adminData = {
      username: formData.get("username"),
      password: formData.get("password"),
      email: formData.get("email"),
      role: formData.get("role"),
    };

    this.showLoading();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "create_admin",
          data: adminData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.closeCreateAdminModal();
        this.showAlert("Berhasil", "Admin baru berhasil dibuat", "success");
      } else {
        this.showAlert(
          "Error",
          result.message || "Gagal membuat admin baru",
          "error"
        );
      }
    } catch (error) {
      console.error("Error creating admin:", error);
      this.showAlert(
        "Error",
        "Terjadi kesalahan saat membuat admin baru",
        "error"
      );
    } finally {
      this.hideLoading();
    }
  }

  showConfirmation(title, message, onConfirm) {
    const modal = document.getElementById("confirmModal");
    const titleElement = document.getElementById("confirmTitle");
    const messageElement = document.getElementById("confirmMessage");
    const confirmBtn = document.getElementById("confirmBtn");

    if (!modal || !titleElement || !messageElement || !confirmBtn) return;

    titleElement.innerHTML = `<i class="fas fa-question-circle"></i> ${title}`;
    messageElement.textContent = message;

    // Remove existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Add new event listener
    newConfirmBtn.addEventListener("click", () => {
      this.closeConfirmModal();
      onConfirm();
    });

    modal.classList.add("show");
  }

  closeConfirmModal() {
    const modal = document.getElementById("confirmModal");
    if (modal) {
      modal.classList.remove("show");
    }
  }

  getCardTypeName(cardType) {
    const types = {
      active_worker: "Active Worker",
      family_member: "Family Member",
      healthy_smart_kids: "Healthy & Smart Kids",
      mums_baby: "Mums & Baby",
      new_couple: "New Couple",
      pregnant_preparation: "Pregnant Preparation",
      senja_ceria: "Senja Ceria",
    };
    return types[cardType] || cardType;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
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

    let icon = "fas fa-info-circle";
    if (type === "success") icon = "fas fa-check-circle";
    else if (type === "error") icon = "fas fa-exclamation-triangle";
    else if (type === "warning") icon = "fas fa-exclamation-circle";

    titleElement.innerHTML = `<i class="${icon}"></i> ${title}`;
    messageElement.textContent = message;

    modal.classList.add("show");

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

// Fungsi global yang diperlukan
function clearSearch() {
  if (window.adminDashboard) {
    window.adminDashboard.clearSearch();
  }
}

function loadMembers() {
  if (window.adminDashboard) {
    window.adminDashboard.loadMembers();
  }
}

function showCreateAdminModal() {
  if (window.adminDashboard) {
    window.adminDashboard.showCreateAdminModal();
  }
}

function closeCreateAdminModal() {
  if (window.adminDashboard) {
    window.adminDashboard.closeCreateAdminModal();
  }
}

function closeMemberModal() {
  if (window.adminDashboard) {
    window.adminDashboard.closeMemberModal();
  }
}

function adjustTransaction(amount) {
  if (window.adminDashboard) {
    window.adminDashboard.adjustTransaction(amount);
  }
}

function confirmDeleteMember() {
  if (window.adminDashboard) {
    window.adminDashboard.confirmDeleteMember();
  }
}

function closeConfirmModal() {
  if (window.adminDashboard) {
    window.adminDashboard.closeConfirmModal();
  }
}

// Hapus fungsi closeAlert() duplikat - sudah dikonsolidasi di admin-auth.js
// function closeAlert() sudah ada di admin-auth.js sebagai fungsi global

// Initialize dashboard saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  window.adminDashboard = new AdminDashboard();

  // ===== FITUR MOBILE RESPONSIF =====
  setupMobileFeatures();
});

// ===== SETUP FITUR MOBILE =====
function setupMobileFeatures() {
  // Deteksi perangkat mobile
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    // Tambahkan class mobile ke body
    document.body.classList.add("mobile-device");

    // Optimasi viewport untuk Android
    setupAndroidViewport();

    // Setup touch gestures
    setupTouchGestures();

    // Optimasi input untuk mobile
    optimizeMobileInputs();

    // Handle orientation change
    setupOrientationHandler();
  }

  // Setup responsive grid adjustment
  setupResponsiveGrid();

  // Fix whitespace issues
  fixWhitespaceIssues();
}

// ===== OPTIMASI VIEWPORT ANDROID =====
function setupAndroidViewport() {
  // Pastikan tidak ada horizontal scroll
  document.body.style.overflowX = "hidden";
  document.documentElement.style.overflowX = "hidden";

  // Set viewport untuk Android
  let viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    );
  }
}

// ===== TOUCH GESTURES PERBAIKAN =====
function setupTouchGestures() {
  // Hapus swipe down untuk tutup modal - hanya gunakan tombol X

  // Optimasi scroll modal untuk touch
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    // Cegah scroll background saat modal terbuka
    modal.addEventListener(
      "touchmove",
      function (e) {
        e.preventDefault();
      },
      { passive: false }
    );

    // Izinkan scroll di dalam modal content
    const modalContent = modal.querySelector(".modal-content");
    if (modalContent) {
      modalContent.addEventListener(
        "touchmove",
        function (e) {
          e.stopPropagation();
        },
        { passive: true }
      );
    }
  });

  // Handle click backdrop untuk tutup modal
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        // Tutup modal hanya jika klik backdrop
        const modalId = modal.id;
        if (modalId === "memberModal") closeMemberModal();
        else if (modalId === "createAdminModal") closeCreateAdminModal();
        else if (modalId === "confirmModal") closeConfirmModal();
        else if (modalId === "alertModal") closeAlert();
      }
    });
  });
}

// ===== OPTIMASI INPUT MOBILE =====
function optimizeMobileInputs() {
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="number"], input[type="tel"]'
  );

  inputs.forEach((input) => {
    // Set inputmode untuk nomor WhatsApp
    if (
      input.name === "whatsapp" ||
      input.placeholder.toLowerCase().includes("whatsapp") ||
      input.id === "searchInput"
    ) {
      input.setAttribute("inputmode", "tel");
      input.setAttribute("autocomplete", "tel");
    }

    // Cegah zoom di iOS dengan font-size minimum 16px
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      if (parseInt(getComputedStyle(input).fontSize) < 16) {
        input.style.fontSize = "16px";
      }
    }

    // Android optimization
    if (/Android/.test(navigator.userAgent)) {
      input.setAttribute("autocapitalize", "off");
      input.setAttribute("autocorrect", "off");
      input.setAttribute("spellcheck", "false");
    }
  });
}

// ===== RESPONSIVE GRID ADJUSTMENT =====
function setupResponsiveGrid() {
  function adjustGridLayout() {
    const statsGrid = document.querySelector(".stats-grid");
    const screenWidth = window.innerWidth;

    if (statsGrid) {
      if (screenWidth <= 480) {
        statsGrid.style.gridTemplateColumns = "1fr";
      } else if (screenWidth <= 768) {
        statsGrid.style.gridTemplateColumns = "1fr 1fr";
      } else if (screenWidth <= 1024) {
        statsGrid.style.gridTemplateColumns = "repeat(2, 1fr)";
      } else {
        statsGrid.style.gridTemplateColumns =
          "repeat(auto-fit, minmax(250px, 1fr))";
      }
    }
  }

  // Jalankan saat load dan resize
  adjustGridLayout();
  window.addEventListener("resize", adjustGridLayout);
}

// ===== ORIENTATION CHANGE HANDLER =====
function setupOrientationHandler() {
  window.addEventListener("orientationchange", function () {
    // Delay untuk menunggu orientasi selesai
    setTimeout(() => {
      setupResponsiveGrid();

      // Refresh modal yang terbuka
      const openModal = document.querySelector(".modal.show");
      if (openModal) {
        const modalContent = openModal.querySelector(".modal-content");
        if (modalContent) {
          modalContent.style.maxHeight = "90vh";
          modalContent.style.maxWidth = "calc(100vw - 20px)";
        }
      }

      // Fix viewport height untuk Android
      if (/Android/.test(navigator.userAgent)) {
        document.documentElement.style.height = window.innerHeight + "px";
      }
    }, 150);
  });
}

// ===== FIX WHITESPACE ISSUES =====
function fixWhitespaceIssues() {
  // Set body dan html untuk mencegah overflow
  document.body.style.maxWidth = "100vw";
  document.body.style.overflowX = "hidden";
  document.documentElement.style.maxWidth = "100vw";
  document.documentElement.style.overflowX = "hidden";

  // Pastikan semua container tidak melebihi viewport
  const containers = document.querySelectorAll(
    ".admin-header, .admin-main, .stats-grid, .members-container"
  );
  containers.forEach((container) => {
    container.style.maxWidth = "100%";
    container.style.overflowX = "hidden";
  });
}

// ===== HELPER FUNCTIONS =====
function getScreenSize() {
  const width = window.innerWidth;
  if (width <= 480) return "mobile-small";
  if (width <= 768) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

// Export untuk penggunaan global
window.setupMobileFeatures = setupMobileFeatures;
