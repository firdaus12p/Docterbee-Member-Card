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

    // Clear any Unknown activity logs on startup
    await this.clearUnknownActivityLogs();

    // Load data awal - PERBAIKAN: Load members dulu, baru statistics
    await this.loadMembers();
    await this.loadStatistics(); // Dipindah setelah loadMembers agar data member sudah tersedia
    await this.loadActivityLog();

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
    const totalTransactions = this.allMembers
      ? this.allMembers.reduce((total, member) => {
          return total + (parseInt(member.jumlah_pembelian) || 0);
        }, 0)
      : 0;

    const totalTransactionsElement =
      document.getElementById("totalTransactions");
    if (totalTransactionsElement) {
      totalTransactionsElement.textContent = totalTransactions;
    }

    // Find top customer berdasarkan jumlah pembelian
    let topCustomer = "-";
    if (this.allMembers && this.allMembers.length > 0) {
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

  // PERBAIKAN: Method baru untuk update statistik setelah member data dimuat
  updateStatisticsFromMembers() {
    if (!this.allMembers) {
      console.warn("allMembers data not available yet");
      return;
    }

    // Update total members
    const totalMembersElement = document.getElementById("totalMembers");
    if (totalMembersElement) {
      totalMembersElement.textContent = this.allMembers.length;
    }

    // Calculate today registrations from loaded member data
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format
    const todayRegistrations = this.allMembers.filter((member) => {
      const memberDate = new Date(member.created_at);
      const memberDateStr = memberDate.toISOString().split("T")[0];
      return memberDateStr === todayStr;
    }).length;

    const todayRegistrationsElement =
      document.getElementById("todayRegistrations");
    if (todayRegistrationsElement) {
      todayRegistrationsElement.textContent = todayRegistrations;
    }

    // Calculate total transactions
    const totalTransactions = this.allMembers.reduce((total, member) => {
      return total + (parseInt(member.jumlah_pembelian) || 0);
    }, 0);

    const totalTransactionsElement =
      document.getElementById("totalTransactions");
    if (totalTransactionsElement) {
      totalTransactionsElement.textContent = totalTransactions;
    }

    // Find top customer
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

    console.log("Statistics updated from member data:", {
      totalMembers: this.allMembers.length,
      todayRegistrations: todayRegistrations,
      totalTransactions: totalTransactions,
      topCustomer: topCustomer,
    });
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

        // DEBUG: Log data yang dimuat untuk debugging
        console.log("Members loaded:", this.allMembers.length);
        if (this.allMembers.length > 0) {
          console.log("Sample member data:", this.allMembers[0]);
        }

        this.renderMembers();
        // PERBAIKAN: Update statistik setelah data member berhasil dimuat
        this.updateStatisticsFromMembers();
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
                        ${
                          member.email
                            ? `<p><i class="fas fa-envelope"></i> ${this.escapeHtml(
                                member.email
                              )}</p>`
                            : ""
                        }
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
    this.editMode = false; // Start in view mode

    // Populate modal dengan data member
    this.populateModalFields(member);

    // Show modal
    const modal = document.getElementById("memberModal");
    if (modal) {
      modal.classList.add("show");
    }
  }

  populateModalFields(member) {
    // Populate all fields
    document.getElementById("modalNama").textContent = member.nama;
    document.getElementById("modalWhatsapp").textContent = member.whatsapp;
    document.getElementById("modalEmail").textContent = member.email || "-";
    document.getElementById("modalAlamat").textContent = member.alamat || "-";
    document.getElementById("modalUmur").textContent = member.umur + " tahun";
    document.getElementById("modalKegiatan").textContent =
      member.kegiatan || "-";

    document.getElementById("modalJenisKartu").textContent =
      this.getCardTypeName(member.jenis_kartu);
    document.getElementById("modalTanggalBerlaku").textContent =
      member.tanggal_berlaku;
    document.getElementById("modalCreatedAt").textContent = new Date(
      member.created_at
    ).toLocaleDateString("id-ID");
    document.getElementById("modalJumlahPembelian").textContent =
      parseInt(member.jumlah_pembelian) || 0;

    // Update edit button state
    this.updateEditButtonState();
  }

  updateEditButtonState() {
    // Check if edit button exists, if not create it
    let editButton = document.querySelector(".btn-edit-member");
    if (!editButton) {
      editButton = document.createElement("button");
      editButton.className = "btn btn-edit-member";
      editButton.onclick = () => this.toggleEditMode();

      // Insert before the send link button
      const memberActions = document.querySelector(".member-actions");
      const sendButton = document.querySelector(".btn-send-pdf");
      if (memberActions && sendButton) {
        memberActions.insertBefore(editButton, sendButton);
      }
    }

    if (this.editMode) {
      editButton.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
      editButton.classList.add("btn-save");
      this.makeFieldsEditable();
    } else {
      editButton.innerHTML = '<i class="fas fa-edit"></i> Edit Data';
      editButton.classList.remove("btn-save");
      this.makeFieldsReadonly();
    }
  }

  toggleEditMode() {
    if (this.editMode) {
      // Save changes
      this.saveEditedData();
    } else {
      // Enter edit mode
      this.editMode = true;
      this.updateEditButtonState();
    }
  }

  makeFieldsEditable() {
    const editableFields = [
      { id: "modalNama", field: "nama", type: "text" },
      { id: "modalWhatsapp", field: "whatsapp", type: "tel" },
      { id: "modalEmail", field: "email", type: "email" },
      { id: "modalAlamat", field: "alamat", type: "text" },
      { id: "modalUmur", field: "umur", type: "number" },
      { id: "modalKegiatan", field: "kegiatan", type: "text" },
    ];

    editableFields.forEach(({ id, field, type }) => {
      const element = document.getElementById(id);
      if (element) {
        const currentValue =
          field === "umur"
            ? this.currentMember[field]
            : field === "email" || field === "alamat" || field === "kegiatan"
            ? this.currentMember[field] || ""
            : this.currentMember[field];

        const input = document.createElement("input");
        input.type = type;
        input.value = currentValue;
        input.className = "edit-input";
        input.id = id + "_input";

        if (type === "tel") {
          input.placeholder = "Contoh: 08123456789";
        } else if (type === "email") {
          input.placeholder = "Contoh: nama@email.com";
        } else if (field === "alamat") {
          input.placeholder = "Contoh: Jl. Sudirman No. 123, Jakarta";
        } else if (field === "kegiatan") {
          input.placeholder =
            "Contoh: Karyawan, Ibu Rumah Tangga, Mahasiswa, dll";
        }

        element.style.display = "none";
        element.parentNode.insertBefore(input, element.nextSibling);
      }
    });
  }

  makeFieldsReadonly() {
    // Remove all input fields and show spans again
    const inputs = document.querySelectorAll(".edit-input");
    inputs.forEach((input) => {
      const spanId = input.id.replace("_input", "");
      const span = document.getElementById(spanId);
      if (span) {
        span.style.display = "inline";
      }
      input.remove();
    });
  }

  async saveEditedData() {
    try {
      // Collect data from input fields
      const updatedData = {
        nama:
          document.getElementById("modalNama_input")?.value ||
          this.currentMember.nama,
        whatsapp:
          document.getElementById("modalWhatsapp_input")?.value ||
          this.currentMember.whatsapp,
        email:
          document.getElementById("modalEmail_input")?.value ||
          this.currentMember.email,
        umur:
          parseInt(document.getElementById("modalUmur_input")?.value) ||
          this.currentMember.umur,
        kegiatan:
          document.getElementById("modalKegiatan_input")?.value ||
          this.currentMember.kegiatan,
      };

      // Validate data
      if (!updatedData.nama.trim()) {
        this.showAlert("Error", "Nama tidak boleh kosong", "error");
        return;
      }

      if (!updatedData.whatsapp.trim()) {
        this.showAlert("Error", "WhatsApp tidak boleh kosong", "error");
        return;
      }

      if (!updatedData.kegiatan.trim()) {
        this.showAlert("Error", "Kegiatan tidak boleh kosong", "error");
        return;
      }

      if (updatedData.umur < 1 || updatedData.umur > 120) {
        this.showAlert("Error", "Umur harus antara 1-120 tahun", "error");
        return;
      }

      this.showLoading();

      // Send update request
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "update_member",
          member_id: this.currentMember.id,
          data: updatedData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update current member object
        Object.assign(this.currentMember, updatedData);

        // Update in allMembers array
        const memberIndex = this.allMembers.findIndex(
          (m) => m.id == this.currentMember.id
        );
        if (memberIndex !== -1) {
          Object.assign(this.allMembers[memberIndex], updatedData);
        }

        // Exit edit mode and refresh display
        this.editMode = false;
        this.populateModalFields(this.currentMember);
        this.renderMembers(); // Refresh the member list

        this.showAlert(
          "Berhasil",
          "Data member berhasil diperbarui",
          "success"
        );

        // Log activity (non-blocking)
        this.logActivity("member_edit", "Data Member Diubah", {
          member_name: this.currentMember.nama,
          whatsapp: this.currentMember.whatsapp,
          member_id: this.currentMember.id,
          changes: "Data member diperbarui",
        }).catch((error) => {
          console.error("Failed to log activity:", error);
        });
      } else {
        this.showAlert(
          "Error",
          result.message || "Gagal memperbarui data member",
          "error"
        );
      }
    } catch (error) {
      console.error("Error saving member data:", error);
      this.showAlert("Error", "Terjadi kesalahan saat menyimpan data", "error");
    } finally {
      this.hideLoading();
    }
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
        this.updateStatisticsFromMembers(); // Gunakan method baru

        this.showAlert(
          "Berhasil",
          `Jumlah pembelian berhasil ${amount > 0 ? "ditambah" : "dikurangi"}`,
          "success"
        );

        // Log activity (non-blocking)
        this.logActivity("transaction", "Transaksi Diperbarui", {
          member_name: this.currentMember.nama,
          whatsapp: this.currentMember.whatsapp,
          member_id: this.currentMember.id,
          action: amount > 0 ? "ditambah" : "dikurangi",
          amount: Math.abs(amount),
          new_total: newAmount,
        }).catch((error) => {
          console.error("Failed to log activity:", error);
        });
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Store member info for logging before clearing
        const memberInfo = {
          member_name: this.currentMember.nama,
          whatsapp: this.currentMember.whatsapp,
          member_id: this.currentMember.id,
        };

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
        this.updateStatisticsFromMembers(); // Gunakan method baru

        this.showAlert("Berhasil", "Member berhasil dihapus", "success");

        // Log activity (completely separate, won't affect main operation)
        setTimeout(() => {
          this.logActivity("member_delete", "Member Dihapus", memberInfo).catch(
            (error) => {
              console.error("Failed to log activity:", error);
            }
          );
        }, 100);
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
    };

    this.showLoading();

    try {
      const session = this.getSession();
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "create_admin",
          data: adminData,
          admin_id: session.admin_id,
          admin_name: session.admin_name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.closeCreateAdminModal();

        this.showAlert("Berhasil", "Admin baru berhasil dibuat", "success");

        // Clear any Unknown activity logs
        await this.clearUnknownActivityLogs();

        // Refresh activity log to show clean results
        await this.loadActivityLog();
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

  async showDeleteAdminModal() {
    const modal = document.getElementById("deleteAdminModal");
    if (modal) {
      modal.classList.add("show");
      await this.loadAdminList();
    }
  }

  closeDeleteAdminModal() {
    const modal = document.getElementById("deleteAdminModal");
    if (modal) {
      modal.classList.remove("show");
    }
  }

  async loadAdminList() {
    const adminListContainer = document.getElementById("adminList");
    if (!adminListContainer) return;

    // Show loading
    adminListContainer.innerHTML = `
      <div class="loading-admins">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Memuat daftar admin...</p>
      </div>
    `;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "get_all_admins",
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        this.renderAdminList(result.data);
      } else {
        adminListContainer.innerHTML = `
          <div class="loading-admins">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Gagal memuat daftar admin</p>
          </div>
        `;
      }
    } catch (error) {
      console.error("Error loading admin list:", error);
      adminListContainer.innerHTML = `
        <div class="loading-admins">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Terjadi kesalahan saat memuat daftar admin</p>
        </div>
      `;
    }
  }

  renderAdminList(admins) {
    const adminListContainer = document.getElementById("adminList");
    if (!adminListContainer) return;

    // Get current admin info
    const currentAdminSession = JSON.parse(
      localStorage.getItem("docterbee_admin_session") || "{}"
    );
    const currentAdminUsername = currentAdminSession.username;

    if (admins.length === 0) {
      adminListContainer.innerHTML = `
        <div class="loading-admins">
          <i class="fas fa-user-slash"></i>
          <p>Tidak ada admin ditemukan</p>
        </div>
      `;
      return;
    }

    const adminItems = admins
      .map((admin) => {
        const isCurrentAdmin = admin.username === currentAdminUsername;
        const isOnlyAdmin = admins.length === 1;

        return `
        <div class="admin-item" data-admin-id="${admin.id}">
          <div class="admin-item-header">
            <div class="admin-username">
              <i class="fas fa-user"></i>
              ${this.escapeHtml(admin.username)}
              ${
                isCurrentAdmin
                  ? '<span style="color: #28a745; font-size: 12px;">(Anda)</span>'
                  : ""
              }
            </div>
            <div class="admin-role">${admin.role}</div>
          </div>
          <div class="admin-details">
            <div><strong>Email:</strong> ${admin.email || "-"}</div>
            <div><strong>Terakhir Login:</strong> ${
              admin.last_login
                ? new Date(admin.last_login).toLocaleString("id-ID")
                : "Belum pernah"
            }</div>
            <div><strong>Dibuat:</strong> ${new Date(
              admin.created_at
            ).toLocaleString("id-ID")}</div>
          </div>
          <div class="admin-actions">
            <button 
              class="btn-delete-confirm" 
              onclick="window.adminDashboard.confirmDeleteAdmin(${
                admin.id
              }, '${this.escapeHtml(admin.username)}')"
              ${isCurrentAdmin || isOnlyAdmin ? "disabled" : ""}
              title="${
                isCurrentAdmin
                  ? "Tidak dapat menghapus akun sendiri"
                  : isOnlyAdmin
                  ? "Tidak dapat menghapus admin terakhir"
                  : "Hapus admin ini"
              }"
            >
              <i class="fas fa-trash"></i>
              ${
                isCurrentAdmin
                  ? "Akun Anda"
                  : isOnlyAdmin
                  ? "Admin Terakhir"
                  : "Hapus Admin"
              }
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    adminListContainer.innerHTML = adminItems;
  }

  confirmDeleteAdmin(adminId, adminUsername) {
    this.pendingDeleteAdmin = { id: adminId, username: adminUsername };
    this.showConfirmation(
      "Hapus Admin",
      `Apakah Anda yakin ingin menghapus admin "${adminUsername}"? Aksi ini tidak dapat dibatalkan!`,
      () => this.deleteAdmin(adminId)
    );
  }

  async deleteAdmin(adminId) {
    this.showLoading();

    try {
      // Get current admin ID
      const currentAdminSession = JSON.parse(
        localStorage.getItem("docterbee_admin_session") || "{}"
      );
      const currentAdminId = currentAdminSession.id || 1; // fallback to 1 if not available

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "delete_admin",
          admin_id: adminId,
          current_admin_id: currentAdminId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reload admin list
        await this.loadAdminList();
        this.showAlert("Berhasil", "Admin berhasil dihapus", "success");

        // Log activity (non-blocking)
        if (this.pendingDeleteAdmin) {
          this.logActivity("admin_delete", "Admin Dihapus", {
            username: this.pendingDeleteAdmin.username,
            admin_id: this.pendingDeleteAdmin.id,
          }).catch((error) => {
            console.error("Failed to log activity:", error);
          });
          this.pendingDeleteAdmin = null;
        }
      } else {
        this.showAlert(
          "Error",
          result.message || "Gagal menghapus admin",
          "error"
        );
      }
    } catch (error) {
      console.error("Error deleting admin:", error);
      this.showAlert(
        "Error",
        "Terjadi kesalahan saat menghapus admin",
        "error"
      );
    } finally {
      this.hideLoading();
    }
  }

  // ===== FILTER MODAL FUNCTIONS =====
  showRegistrationModal() {
    const modal = document.getElementById("registrationModal");
    if (modal) {
      modal.classList.add("show");
      this.filterRegistrations("today");
    }
  }

  closeRegistrationModal() {
    const modal = document.getElementById("registrationModal");
    if (modal) {
      modal.classList.remove("show");
    }
  }

  showTransactionModal() {
    const modal = document.getElementById("transactionModal");
    if (modal) {
      modal.classList.add("show");
      this.filterTransactions("today");
    }
  }

  closeTransactionModal() {
    const modal = document.getElementById("transactionModal");
    if (modal) {
      modal.classList.remove("show");
    }
  }

  filterRegistrations(period) {
    // Update active button
    document
      .querySelectorAll("#registrationModal .filter-btn")
      .forEach((btn) => {
        btn.classList.remove("active");
      });
    document
      .querySelector(`#registrationModal .filter-btn[data-filter="${period}"]`)
      .classList.add("active");

    const filteredMembers = this.getFilteredData(period);
    const registrationCount = filteredMembers.length;

    // Update summary
    const summaryText = this.getPeriodText(period);
    document.getElementById(
      "registrationSummary"
    ).textContent = `Pendaftar ${summaryText}: ${registrationCount} orang`;

    // Render registration list
    this.renderRegistrationList(filteredMembers, period);
  }

  filterTransactions(period) {
    // Update active button
    document
      .querySelectorAll("#transactionModal .filter-btn")
      .forEach((btn) => {
        btn.classList.remove("active");
      });
    document
      .querySelector(`#transactionModal .filter-btn[data-filter="${period}"]`)
      .classList.add("active");

    const filteredMembers = this.getFilteredData(period);
    const totalTransactions = filteredMembers.reduce((total, member) => {
      return total + (parseInt(member.jumlah_pembelian) || 0);
    }, 0);

    // Update summary
    const summaryText = this.getPeriodText(period);
    document.getElementById(
      "transactionSummary"
    ).textContent = `Total Transaksi ${summaryText}: ${totalTransactions}`;

    // Render transaction list
    this.renderTransactionList(filteredMembers, period);
  }

  getFilteredData(period) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate;

    switch (period) {
      case "today":
        startDate = today;
        break;
      case "week":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case "month":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30);
        break;
      default:
        startDate = today;
    }

    return this.allMembers.filter((member) => {
      const memberDate = new Date(member.created_at);
      return memberDate >= startDate;
    });
  }

  getPeriodText(period) {
    switch (period) {
      case "today":
        return "Hari Ini";
      case "week":
        return "Minggu Ini";
      case "month":
        return "Bulan Ini";
      default:
        return "Hari Ini";
    }
  }

  renderRegistrationList(members, period) {
    const container = document.getElementById("registrationList");
    if (!container) return;

    if (members.length === 0) {
      container.innerHTML = `
        <div class="no-data">
          <i class="fas fa-user-slash"></i>
          <p>Tidak ada pendaftar ${this.getPeriodText(period).toLowerCase()}</p>
        </div>
      `;
      return;
    }

    // Sort by registration date (newest first)
    const sortedMembers = [...members].sort((a, b) => {
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const registrationHTML = sortedMembers
      .map((member) => {
        const registrationDate = new Date(member.created_at);
        const formattedDate = registrationDate.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const formattedTime = registrationDate.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return `
        <div class="data-item">
          <div class="data-item-header">
            <div class="data-item-name">${this.escapeHtml(member.nama)}</div>
            <div class="data-item-time">${formattedDate} ${formattedTime}</div>
          </div>
          <div class="data-item-details">
            <div><strong>WhatsApp:</strong> ${this.escapeHtml(
              member.whatsapp
            )}</div>
            <div><strong>Umur:</strong> ${member.umur} tahun</div>
            <div><strong>Jenis Kartu:</strong> ${this.getCardTypeName(
              member.jenis_kartu
            )}</div>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = registrationHTML;
  }

  renderTransactionList(members, period) {
    const container = document.getElementById("transactionList");
    if (!container) return;

    // Filter members who have transactions
    const membersWithTransactions = members.filter((member) => {
      return parseInt(member.jumlah_pembelian) > 0;
    });

    if (membersWithTransactions.length === 0) {
      container.innerHTML = `
        <div class="no-data">
          <i class="fas fa-shopping-cart"></i>
          <p>Tidak ada transaksi ${this.getPeriodText(period).toLowerCase()}</p>
        </div>
      `;
      return;
    }

    // Sort by transaction count (highest first)
    const sortedMembers = [...membersWithTransactions].sort((a, b) => {
      return (
        (parseInt(b.jumlah_pembelian) || 0) -
        (parseInt(a.jumlah_pembelian) || 0)
      );
    });

    const transactionHTML = sortedMembers
      .map((member) => {
        const registrationDate = new Date(member.created_at);
        const formattedDate = registrationDate.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const transactionCount = parseInt(member.jumlah_pembelian) || 0;

        return `
        <div class="data-item">
          <div class="data-item-header">
            <div class="data-item-name">${this.escapeHtml(member.nama)}</div>
            <div class="transaction-badge">${transactionCount} Transaksi</div>
          </div>
          <div class="data-item-details">
            <div><strong>WhatsApp:</strong> ${this.escapeHtml(
              member.whatsapp
            )}</div>
            <div><strong>Jenis Kartu:</strong> ${this.getCardTypeName(
              member.jenis_kartu
            )}</div>
            <div><strong>Bergabung:</strong> ${formattedDate}</div>
          </div>
        </div>
      `;
      })
      .join("");

    container.innerHTML = transactionHTML;
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

  // ===== ADMIN ACTIVITY LOG METHODS =====
  async setupActivityTable() {
    this.showLoading();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "setup_activity_table",
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showAlert("Berhasil", result.message, "success");
        // Try to load activity log after setup
        setTimeout(() => {
          this.loadActivityLog();
        }, 1000);
      } else {
        this.showAlert(
          "Error",
          result.message || "Gagal setup database",
          "error"
        );
      }
    } catch (error) {
      console.error("Error setting up activity table:", error);
      this.showAlert("Error", "Terjadi kesalahan saat setup database", "error");
    } finally {
      this.hideLoading();
    }
  }

  async loadActivityLog() {
    const activityContainer = document.getElementById("activityContainer");
    if (!activityContainer) return;

    activityContainer.innerHTML = `
      <div class="loading-activity">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Memuat log aktivitas...</p>
      </div>
    `;

    try {
      console.log("Loading activity log from:", this.apiEndpoint);

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "get_activity_log",
        }),
      });

      console.log("Activity log response status:", response.status);
      console.log("Activity log response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error text:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      let result;
      try {
        const responseText = await response.text();
        console.log("Raw response:", responseText);
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        throw new Error("Invalid JSON response from server");
      }

      console.log("Activity log result:", result);

      if (result.success && result.data && Array.isArray(result.data)) {
        this.allActivities = result.data;
        this.populateAdminFilter();
        this.filterActivities();
      } else if (result.success && (!result.data || result.data.length === 0)) {
        console.log("No activity data available");
        activityContainer.innerHTML = `
          <div class="no-activity">
            <i class="fas fa-history"></i>
            <p>Belum ada aktivitas yang tercatat</p>
          </div>
        `;
      } else {
        console.error("API error:", result);
        throw new Error(result.message || "Gagal memuat data aktivitas");
      }
    } catch (error) {
      console.error("Error loading activity log:", error);
      activityContainer.innerHTML = `
        <div class="no-activity">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Gagal memuat log aktivitas</p>
          <p style="font-size: 0.9em; color: #666; margin-top: 5px;">${error.message}</p>
          <button class="btn btn-refresh" onclick="loadActivityLog()" style="margin-top: 10px;">
            <i class="fas fa-refresh"></i> Coba Lagi
          </button>
          <button class="btn btn-primary" onclick="setupActivityTable()" style="margin-top: 5px; margin-left: 10px;">
            <i class="fas fa-tools"></i> Setup Database
          </button>
        </div>
      `;
    }
  }

  populateAdminFilter() {
    const adminFilter = document.getElementById("adminFilter");
    if (!adminFilter || !this.allActivities) return;

    // Get unique admin names
    const adminNames = [
      ...new Set(this.allActivities.map((activity) => activity.admin_name)),
    ];

    // Clear existing options except "Semua Admin"
    adminFilter.innerHTML = '<option value="all">Semua Admin</option>';

    // Add admin options
    adminNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      adminFilter.appendChild(option);
    });
  }

  filterActivities() {
    if (!this.allActivities) return;

    const activityFilter = document.getElementById("activityFilter").value;
    const adminFilter = document.getElementById("adminFilter").value;
    const periodFilter = document.getElementById("periodFilter").value;

    let filteredActivities = [...this.allActivities];

    // Filter by activity type
    if (activityFilter !== "all") {
      filteredActivities = filteredActivities.filter(
        (activity) => activity.activity_type === activityFilter
      );
    }

    // Filter by admin
    if (adminFilter !== "all") {
      filteredActivities = filteredActivities.filter(
        (activity) => activity.admin_name === adminFilter
      );
    }

    // Filter by period
    if (periodFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      switch (periodFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filteredActivities = filteredActivities.filter((activity) => {
        const activityDate = new Date(activity.created_at);
        return activityDate >= filterDate;
      });
    }

    this.renderActivityLog(filteredActivities);
  }

  renderActivityLog(activities) {
    const activityContainer = document.getElementById("activityContainer");
    if (!activityContainer) return;

    if (activities.length === 0) {
      activityContainer.innerHTML = `
        <div class="no-activity">
          <i class="fas fa-search"></i>
          <p>Tidak ada aktivitas yang sesuai dengan filter</p>
        </div>
      `;
      return;
    }

    const activityHTML = activities
      .map((activity) => this.createActivityHTML(activity))
      .join("");
    activityContainer.innerHTML = activityHTML;
  }

  createActivityHTML(activity) {
    const date = new Date(activity.created_at);
    const timeString = date.toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const iconClass = this.getActivityIcon(activity.activity_type);
    const description = this.getActivityDescription(activity);

    return `
      <div class="activity-item">
        <div class="activity-icon ${activity.activity_type}">
          <i class="${iconClass}"></i>
        </div>
        <div class="activity-content">
          <h4 class="activity-title">${activity.title.replace(
            /\n/g,
            "<br>"
          )}</h4>
          <p class="activity-description">${description}</p>
        </div>
        <div class="activity-meta">
          <span class="activity-time">${timeString}</span>
          <span class="activity-admin">${activity.admin_name}</span>
        </div>
      </div>
    `;
  }

  getActivityIcon(type) {
    const icons = {
      login: "fas fa-sign-in-alt",
      member_add: "fas fa-user-plus",
      member_edit: "fas fa-user-edit",
      member_delete: "fas fa-user-minus",
      admin_create: "fas fa-user-shield",
      admin_delete: "fas fa-user-times",
      transaction: "fas fa-shopping-cart",
      download: "fas fa-download",
    };
    return icons[type] || "fas fa-info-circle";
  }

  getActivityDescription(activity) {
    const details = activity.details ? JSON.parse(activity.details) : {};

    switch (activity.activity_type) {
      case "login":
        return `Login berhasil dari IP: ${details.ip || "Unknown"}`;
      case "member_add":
        return `Member baru ditambahkan: ${details.member_name || "Unknown"} (${
          details.whatsapp || "Unknown"
        })`;
      case "member_edit":
        return `Data member diubah: ${details.member_name || "Unknown"} - ${
          details.changes || "Perubahan data"
        }`;
      case "member_delete":
        return `Member dihapus: ${details.member_name || "Unknown"} (${
          details.whatsapp || "Unknown"
        })`;
      case "admin_create":
        return `Admin baru dibuat: ${details.username || "Unknown"}`;
      case "admin_delete":
        return `Admin dihapus: ${details.username || "Unknown"}`;
      case "transaction":
        return `Transaksi member: ${details.member_name || "Unknown"} - ${
          details.action || "Unknown"
        } (Total: ${details.new_total || 0})`;
      case "download":
        return `Download file CSV: ${
          details.filename || "data_pelanggan.csv"
        } - ${details.total_records || 0} records`;
      default:
        return activity.description || "Aktivitas tidak dikenal";
    }
  }

  async clearActivityLog() {
    const confirmResult = await this.showConfirmDialog(
      "Hapus Log Aktivitas",
      "Apakah Anda yakin ingin menghapus semua log aktivitas? Aksi ini tidak dapat dibatalkan.",
      "danger"
    );

    if (!confirmResult) return;

    this.showLoading();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "clear_activity_log",
        }),
      });

      const result = await response.json();

      if (result.success) {
        this.showAlert("Berhasil", "Log aktivitas berhasil dihapus", "success");
        await this.loadActivityLog();
      } else {
        this.showAlert(
          "Error",
          result.message || "Gagal menghapus log aktivitas",
          "error"
        );
      }
    } catch (error) {
      console.error("Error clearing activity log:", error);
      this.showAlert(
        "Error",
        "Terjadi kesalahan saat menghapus log aktivitas",
        "error"
      );
    } finally {
      this.hideLoading();
    }
  }

  async clearUnknownActivityLogs() {
    this.showLoading();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "clear_unknown_activity_logs",
        }),
      });

      const result = await response.json();

      if (result.success) {
        await this.loadActivityLog();
      }
    } catch (error) {
      console.error("Error clearing unknown activity logs:", error);
    } finally {
      this.hideLoading();
    }
  }

  async clearUnknownActivityLogs() {
    this.showLoading();

    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "clear_unknown_activity_logs",
        }),
      });

      const result = await response.json();

      if (result.success) {
        await this.loadActivityLog();
      }
    } catch (error) {
      console.error("Error clearing unknown activity logs:", error);
    } finally {
      this.hideLoading();
    }
  }

  showConfirmDialog(title, message, type = "info") {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmModal");
      const titleElement = document.getElementById("confirmTitle");
      const messageElement = document.getElementById("confirmMessage");
      const confirmBtn = document.getElementById("confirmBtn");

      if (!modal || !titleElement || !messageElement || !confirmBtn) {
        resolve(false);
        return;
      }

      let icon = "fas fa-question-circle";
      if (type === "danger") icon = "fas fa-exclamation-triangle";
      else if (type === "warning") icon = "fas fa-exclamation-circle";

      titleElement.innerHTML = `<i class="${icon}"></i> ${title}`;
      messageElement.textContent = message;

      modal.classList.add("show");

      const handleConfirm = () => {
        modal.classList.remove("show");
        confirmBtn.removeEventListener("click", handleConfirm);
        resolve(true);
      };

      const handleCancel = () => {
        modal.classList.remove("show");
        confirmBtn.removeEventListener("click", handleConfirm);
        resolve(false);
      };

      confirmBtn.addEventListener("click", handleConfirm);

      // Also handle cancel button and close button
      const cancelBtn = modal.querySelector(".btn-cancel");
      const closeBtn = modal.querySelector(".close-modal");

      if (cancelBtn) cancelBtn.addEventListener("click", handleCancel);
      if (closeBtn) closeBtn.addEventListener("click", handleCancel);
    });
  }

  async logActivity(type, title, details = {}) {
    try {
      // Get admin info from localStorage
      const session = this.getSession();
      const adminId = session ? session.id : 1;
      const adminName = session ? session.username : "Admin";

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "log_activity",
          activity_type: type,
          title: title,
          details: JSON.stringify(details),
          admin_id: adminId,
          admin_name: adminName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.warn("Activity logging failed:", result.message);
      }

      // Silently reload activity log if visible
      if (document.getElementById("activityContainer") && this.allActivities) {
        await this.loadActivityLog();
      }
    } catch (error) {
      console.error("Error logging activity:", error);
      // Don't throw error to prevent breaking main operations
    }
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

  async downloadMembersCSV() {
    this.showLoading();

    try {
      // Get admin info from localStorage
      const session = this.getSession();
      const adminId = session ? session.id : 1;
      const adminName = session ? session.username : "Admin";

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "download_csv",
          admin_id: adminId,
          admin_name: adminName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get the CSV content
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `data_pelanggan_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      this.showAlert("Berhasil", "File CSV berhasil diunduh", "success");
    } catch (error) {
      console.error("Error downloading CSV:", error);
      this.showAlert(
        "Error",
        "Terjadi kesalahan saat mengunduh file CSV",
        "error"
      );
    } finally {
      this.hideLoading();
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

function showDeleteAdminModal() {
  if (window.adminDashboard) {
    window.adminDashboard.showDeleteAdminModal();
  }
}

function closeCreateAdminModal() {
  if (window.adminDashboard) {
    window.adminDashboard.closeCreateAdminModal();
  }
}

function closeDeleteAdminModal() {
  if (window.adminDashboard) {
    window.adminDashboard.closeDeleteAdminModal();
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

// Filter modal functions
function showRegistrationModal() {
  if (window.adminDashboard) {
    window.adminDashboard.showRegistrationModal();
  }
}

function closeRegistrationModal() {
  if (window.adminDashboard) {
    window.adminDashboard.closeRegistrationModal();
  }
}

function showTransactionModal() {
  if (window.adminDashboard) {
    window.adminDashboard.showTransactionModal();
  }
}

function closeTransactionModal() {
  if (window.adminDashboard) {
    window.adminDashboard.closeTransactionModal();
  }
}

function filterRegistrations(period) {
  if (window.adminDashboard) {
    window.adminDashboard.filterRegistrations(period);
  }
}

function filterTransactions(period) {
  if (window.adminDashboard) {
    window.adminDashboard.filterTransactions(period);
  }
}

// Activity log functions
function setupActivityTable() {
  if (window.adminDashboard) {
    window.adminDashboard.setupActivityTable();
  }
}

function loadActivityLog() {
  if (window.adminDashboard) {
    window.adminDashboard.loadActivityLog();
  }
}

function filterActivities() {
  if (window.adminDashboard) {
    window.adminDashboard.filterActivities();
  }
}

function clearActivityLog() {
  if (window.adminDashboard) {
    window.adminDashboard.clearActivityLog();
  }
}

// Hapus fungsi closeAlert() duplikat - sudah dikonsolidasi di admin-auth.js
// function closeAlert() sudah ada di admin-auth.js sebagai fungsi global

// Function to download members data as CSV
function downloadMembersCSV() {
  if (window.adminDashboard) {
    window.adminDashboard.downloadMembersCSV();
  }
}

// Initialize dashboard saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  window.adminDashboard = new AdminDashboard();

  // Load activity log automatically
  setTimeout(() => {
    if (window.adminDashboard) {
      window.adminDashboard.loadActivityLog();
    }
  }, 1000);

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
