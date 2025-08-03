// Modul Aplikasi Utama
class DocterBeeApp {
  constructor() {
    this.cardGenerator = new CardGenerator();
    this.pdfGenerator = new PDFGenerator();
    this.databaseManager = new DatabaseManager();

    this.initializeApp();
  }

  initializeApp() {
    this.setupEventListeners();
    this.loadLibraries();
    console.log("DocterBee Membership Card App initialized");
  }

  async loadLibraries() {
    // Muat html2canvas jika tidak tersedia
    if (typeof html2canvas === "undefined") {
      try {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.onload = () => console.log("html2canvas loaded");
        document.head.appendChild(script);
      } catch (error) {
        console.warn("Failed to load html2canvas:", error);
      }
    }
  }

  setupEventListeners() {
    // Tombol Generate Kartu
    const generateBtn = document.getElementById("generateBtn");
    generateBtn.addEventListener("click", () => this.handleGenerateCard());

    // Tombol Simpan Data
    const saveBtn = document.getElementById("saveBtn");
    saveBtn.addEventListener("click", () => this.handleSaveData());

    // Tombol Download PDF
    const downloadBtn = document.getElementById("downloadBtn");
    downloadBtn.addEventListener("click", () => this.handleDownloadPDF());

    // Tombol Flip Kartu
    const flipBtn = document.getElementById("flipBtn");
    flipBtn.addEventListener("click", () => this.handleFlipCard());

    // Tombol Search Member
    const searchBtn = document.getElementById("searchBtn");
    searchBtn.addEventListener("click", () => this.handleSearchMember());

    // Search dengan Enter key
    const searchInput = document.getElementById("searchWhatsapp");
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleSearchMember();
      }
    });

    // Tombol Group WhatsApp
    const joinGroupBtn = document.getElementById("joinGroupBtn");
    joinGroupBtn.addEventListener("click", () =>
      this.handleJoinWhatsAppGroup()
    );

    // Tombol Tutup Modal
    const closeModal = document.getElementById("closeModal");
    closeModal.addEventListener("click", () =>
      this.databaseManager.hideSuccessMessage()
    );

    // Tutup modal ketika klik di luar area modal
    const modal = document.getElementById("successModal");
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.databaseManager.hideSuccessMessage();
      }
    });

    // Validasi form saat input
    this.setupFormValidation();

    // Auto-sync data localStorage saat halaman dimuat
    setTimeout(() => this.autoSync(), 2000);
  }

  setupFormValidation() {
    const whatsappField = document.getElementById("whatsapp");
    const umurField = document.getElementById("umur");
    const namaField = document.getElementById("nama");
    const kegiatanField = document.getElementById("kegiatan");

    // KEAMANAN: Sanitasi input nama untuk mencegah XSS
    namaField.addEventListener("input", (e) => {
      let value = e.target.value;
      // Hapus karakter berbahaya dan HTML tags
      value = value.replace(/<[^>]*>/g, ""); // Hapus HTML tags
      value = value.replace(/[<>\"'&]/g, ""); // Hapus karakter berbahaya
      // Batasi panjang nama maksimal 100 karakter
      if (value.length > 100) {
        value = value.substring(0, 100);
      }
      e.target.value = value;
    });

    // KEAMANAN: Sanitasi input kegiatan
    kegiatanField.addEventListener("input", (e) => {
      let value = e.target.value;
      value = value.replace(/<[^>]*>/g, "");
      value = value.replace(/[<>\"'&]/g, "");
      if (value.length > 150) {
        value = value.substring(0, 150);
      }
      e.target.value = value;
    });

    // PERBAIKAN: Input umur yang bisa dikosongkan
    umurField.addEventListener("input", (e) => {
      // Izinkan field kosong atau angka valid
      if (e.target.value === "" || e.target.value === "0") {
        e.target.removeAttribute("min");
      } else {
        e.target.setAttribute("min", "1");
      }
    });

    umurField.addEventListener("keydown", (e) => {
      // Izinkan backspace, delete, arrow keys, tab
      if (
        ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(
          e.key
        )
      ) {
        return;
      }
      // Cegah input non-numeric kecuali angka
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });

    umurField.addEventListener("blur", (e) => {
      // Jika kosong atau 0, biarkan kosong
      if (e.target.value === "0" || e.target.value === "") {
        e.target.value = "";
        e.target.removeAttribute("min");
      } else if (e.target.value) {
        // Pastikan minimal 1 jika ada input
        if (parseInt(e.target.value) < 1) {
          e.target.value = "1";
        }
        e.target.setAttribute("min", "1");
      }
    });

    // KEAMANAN: Format dan validasi nomor WhatsApp
    whatsappField.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, ""); // Hapus non-digit

      // Batasi panjang maksimal 15 digit untuk nomor internasional
      if (value.length > 15) {
        value = value.substring(0, 15);
      }

      // Pastikan dimulai dengan 0 atau 62
      if (
        value.length > 0 &&
        !value.startsWith("0") &&
        !value.startsWith("62")
      ) {
        value = "0" + value;
      }

      e.target.value = value;
    });

    // KEAMANAN: Validasi umur dengan batasan ketat
    umurField.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      if (isNaN(value) || value < 1) e.target.value = 1;
      if (value > 120) e.target.value = 120;
    });

    // Aktifkan update preview real-time dengan debouncing
    const previewFields = ["nama"];
    previewFields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      let timeoutId;
      field.addEventListener("input", () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          this.cardGenerator.updatePreview();
        }, 300); // Debounce 300ms untuk performa
      });
    });
  }

  async handleGenerateCard() {
    const generateBtn = document.getElementById("generateBtn");

    // Nonaktifkan tombol untuk mencegah double-click
    generateBtn.disabled = true;
    generateBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
      // KEAMANAN: Validasi dan sanitasi input
      const whatsapp = document.getElementById("whatsapp").value.trim();
      const jenisKartu = document.getElementById("jenisKartu").value;
      const nama = document.getElementById("nama").value.trim();
      const umur = parseInt(document.getElementById("umur").value);
      const kegiatan = document.getElementById("kegiatan").value.trim();

      // Validasi panjang nama
      if (nama.length < 2) {
        alert("Nama harus minimal 2 karakter!");
        return;
      }

      if (nama.length > 100) {
        alert("Nama terlalu panjang! Maksimal 100 karakter.");
        return;
      }

      // Validasi nomor WhatsApp dengan pattern yang ketat
      if (!whatsapp) {
        alert("Mohon isi nomor WhatsApp terlebih dahulu!");
        return;
      }

      const whatsappPattern = /^(0|62)[0-9]{9,14}$/;
      if (!whatsappPattern.test(whatsapp)) {
        alert(
          "Format nomor WhatsApp tidak valid! Gunakan format 08xx atau 62xx"
        );
        return;
      }

      if (!jenisKartu) {
        alert("Mohon pilih jenis kartu terlebih dahulu!");
        return;
      }

      // Validasi umur
      if (isNaN(umur) || umur < 1 || umur > 120) {
        alert("Umur harus antara 1-120 tahun!");
        return;
      }

      // Validasi kegiatan
      if (kegiatan.length < 2) {
        alert("Kegiatan harus minimal 2 karakter!");
        return;
      }

      // Generate unique code and check uniqueness
      let isUnique = false;
      let attempts = 0;
      let uniqueCode = "";

      while (!isUnique && attempts < 10) {
        uniqueCode = this.cardGenerator.generateUniqueCode(whatsapp);
        isUnique = await this.databaseManager.checkCodeUnique(uniqueCode);
        attempts++;
      }

      if (!isUnique) {
        alert("Gagal membuat kode unik. Silakan coba lagi.");
        return;
      }

      // Set the unique code
      document.getElementById("kodeUnik").value = uniqueCode;

      // Update validity date
      this.updateValidityDate();

      // Generate and update preview
      if (this.cardGenerator.generateCard()) {
        this.showSuccessNotification("Kartu berhasil digenerate!");
      }
    } catch (error) {
      console.error("Error generating card:", error);
      alert("Terjadi kesalahan saat membuat kartu. Silakan coba lagi.");
    } finally {
      // Re-enable button
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Kartu';
    }
  }

  updateValidityDate() {
    const now = new Date();
    const currentMonth = now.toLocaleString("en-US", { month: "long" });
    const currentYear = now.getFullYear();
    const expiryYear = currentYear + 5;

    const validDate = `VALID ${currentMonth} ${currentYear} - ${currentMonth} ${expiryYear}`;
    document.getElementById("tanggalBerlaku").value = validDate;
  }

  async handleSaveData() {
    const saveBtn = document.getElementById("saveBtn");

    if (!this.cardGenerator.validateForm()) {
      return;
    }

    // Disable button
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    try {
      const memberData = this.cardGenerator.getCardData();

      // Validate data
      const validation = this.databaseManager.validateMemberData(memberData);
      if (!validation.valid) {
        alert(validation.message);
        return;
      }

      // Save to database
      const success = await this.databaseManager.saveData(memberData);

      if (success) {
        // Optionally reset form after successful save
        // this.cardGenerator.resetForm();
        console.log("Data saved successfully");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      alert(
        "Terjadi kesalahan saat menyimpan data. Data telah disimpan sementara."
      );
    } finally {
      // Re-enable button
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Data';
    }
  }

  async handleDownloadPDF() {
    const downloadBtn = document.getElementById("downloadBtn");

    if (!this.cardGenerator.validateForm()) {
      return;
    }

    // Disable button
    downloadBtn.disabled = true;
    downloadBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Membuat PDF...';

    try {
      const memberData = this.cardGenerator.getCardData();

      // Try html2canvas method first
      let success = false;
      try {
        success = await this.pdfGenerator.generatePDF(memberData);
      } catch (error) {
        console.warn("html2canvas method failed, trying manual method:", error);
        // Fallback to manual PDF creation
        success = this.pdfGenerator.createManualPDF(memberData);
      }

      if (success) {
        this.showSuccessNotification("PDF berhasil diunduh!");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Terjadi kesalahan saat membuat PDF. Silakan coba lagi.");
    } finally {
      // Re-enable button
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
    }
  }

  handleFlipCard() {
    const cardWrapper = document.getElementById("cardWrapper");
    cardWrapper.classList.toggle("flipped");

    // Update button text
    const flipBtn = document.getElementById("flipBtn");
    const isFlipped = cardWrapper.classList.contains("flipped");
    flipBtn.innerHTML = isFlipped
      ? '<i class="fas fa-sync-alt"></i> Lihat Depan'
      : '<i class="fas fa-sync-alt"></i> Lihat Belakang';
  }

  // =============== FITUR BARU: PENCARIAN MEMBER ===============
  // Fungsi untuk menangani pencarian member berdasarkan nomor WhatsApp
  // Memungkinkan user untuk mencari data mereka yang sudah terdaftar sebelumnya
  async handleSearchMember() {
    const searchInput = document.getElementById("searchWhatsapp");
    const searchBtn = document.getElementById("searchBtn");
    const searchResult = document.getElementById("searchResult");

    // Ambil nomor WhatsApp dari input dan bersihkan spasi
    const whatsappNumber = searchInput.value.trim();

    // Validasi: Pastikan input tidak kosong
    if (!whatsappNumber) {
      this.showSearchResult(
        "error",
        "Mohon masukkan nomor WhatsApp terlebih dahulu!"
      );
      return;
    }

    // Validasi format nomor WhatsApp - minimal 10 digit setelah dibersihkan
    const cleanNumber = whatsappNumber.replace(/\D/g, "");
    if (cleanNumber.length < 10) {
      this.showSearchResult(
        "error",
        "Nomor WhatsApp tidak valid! Minimal 10 digit."
      );
      return;
    }

    // Disable tombol search dan tampilkan loading state
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mencari...';

    try {
      // Panggil fungsi search dari database manager
      const member = await this.databaseManager.searchMemberByWhatsApp(
        whatsappNumber
      );

      if (member) {
        // Data ditemukan - isi form dengan data member yang ditemukan
        this.fillFormWithMemberData(member);
        this.showSearchResult(
          "found",
          `Data ditemukan! Nama: ${member.nama} | Kode: ${
            member.kode_unik || member.kodeUnik
          }`
        );

        // Generate kartu dengan data yang ditemukan (dengan delay untuk UX yang lebih baik)
        setTimeout(() => {
          if (this.cardGenerator.generateCard()) {
            this.showSuccessNotification("Data member berhasil dimuat!");
          }
        }, 500);
      } else {
        // Data tidak ditemukan - beri tahu user dan bersihkan form
        this.showSearchResult(
          "not-found",
          "Data tidak ditemukan. Silakan daftar sebagai member baru."
        );
        this.clearForm();
      }
    } catch (error) {
      console.error("Error searching member:", error);
      this.showSearchResult(
        "error",
        "Terjadi kesalahan saat mencari data. Silakan coba lagi."
      );
    } finally {
      // Re-enable tombol search setelah proses selesai
      searchBtn.disabled = false;
      searchBtn.innerHTML = '<i class="fas fa-search"></i> Cari';
    }
  }

  // Fungsi untuk mengisi form dengan data member yang ditemukan dari pencarian
  // Mapping data dari database ke field-field form
  fillFormWithMemberData(member) {
    try {
      // Mapping field database ke field form (kompatibel dengan 2 format field)
      const fieldMapping = {
        nama: member.nama || "",
        whatsapp: member.whatsapp || "",
        umur: member.umur || "",
        kegiatan: member.kegiatan || "",
        jenisKartu: member.jenis_kartu || member.jenisKartu || "",
        kodeUnik: member.kode_unik || member.kodeUnik || "",
        tanggalBerlaku:
          member.tanggal_berlaku ||
          member.tanggalBerlaku ||
          "VALID July 2025 - July 2030",
      };

      // Isi setiap field form dengan data yang ditemukan
      Object.keys(fieldMapping).forEach((fieldId) => {
        const element = document.getElementById(fieldId);
        if (element) {
          element.value = fieldMapping[fieldId];
        }
      });

      // Aktifkan tombol-tombol yang diperlukan setelah data dimuat
      document.getElementById("saveBtn").disabled = false;
      document.getElementById("downloadBtn").disabled = false;

      console.log("Form berhasil diisi dengan data member:", member.nama);
    } catch (error) {
      console.error("Error filling form with member data:", error);
    }
  }

  // Fungsi untuk menampilkan hasil pencarian dengan styling yang sesuai
  // Memberikan feedback visual yang jelas kepada user tentang hasil pencarian
  showSearchResult(type, message) {
    const searchResult = document.getElementById("searchResult");

    // Reset semua class sebelumnya
    searchResult.className = "search-result";

    // Tambah class sesuai tipe hasil (found/not-found/error)
    searchResult.classList.add(type);

    // Set icon yang sesuai dengan jenis hasil
    let icon = "";
    switch (type) {
      case "found":
        icon = '<i class="fas fa-check-circle"></i>'; // Icon centang hijau
        break;
      case "not-found":
        icon = '<i class="fas fa-exclamation-circle"></i>'; // Icon peringatan orange
        break;
      case "error":
        icon = '<i class="fas fa-times-circle"></i>'; // Icon silang merah
        break;
      default:
        icon = '<i class="fas fa-info-circle"></i>'; // Icon info biru
    }

    // Tampilkan pesan dengan icon
    searchResult.innerHTML = `${icon} ${message}`;

    // Auto-hide hasil error dan not-found setelah 5 detik untuk UX yang lebih bersih
    if (type === "error" || type === "not-found") {
      setTimeout(() => {
        searchResult.innerHTML = "";
        searchResult.className = "search-result";
      }, 5000);
    }

    // Scroll otomatis ke hasil search untuk visibilitas yang lebih baik di mobile
    if (window.innerWidth <= 768) {
      searchResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // =============== FITUR BARU: GROUP WHATSAPP ===============
  // Fungsi untuk menangani bergabung ke Group WhatsApp DocterBee
  // Memberikan cara mudah bagi user untuk bergabung ke komunitas
  handleJoinWhatsAppGroup() {
    // URL Group WhatsApp DocterBee - link yang disediakan client
    const whatsappGroupUrl = "https://chat.whatsapp.com/K2LvoY38WDkLaXkfy2vKmE";

    // Buka link WhatsApp sesuai dengan device yang digunakan
    try {
      // Deteksi apakah user menggunakan device mobile untuk experience yang lebih baik
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      if (isMobile) {
        // Di mobile, buka langsung di app WhatsApp (jika terinstall)
        window.location.href = whatsappGroupUrl;
      } else {
        // Di desktop, buka di tab baru browser
        window.open(whatsappGroupUrl, "_blank");
      }

      // Beri feedback positif kepada user
      this.showSuccessNotification(
        "Mengarahkan ke Group WhatsApp DocterBee..."
      );
    } catch (error) {
      console.error("Error opening WhatsApp group:", error);
      // Fallback: copy link ke clipboard jika gagal membuka
      this.copyToClipboard(whatsappGroupUrl);
      this.showSuccessNotification("Link group telah disalin ke clipboard!");
    }
  }

  // Fungsi utility untuk menyalin teks ke clipboard
  // Mendukung browser modern dan lama untuk kompatibilitas maksimal
  copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      // API modern untuk browser yang mendukung
      navigator.clipboard.writeText(text);
    } else {
      // Fallback method untuk browser lama
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
  }

  // Fungsi untuk membersihkan form (digunakan ketika pencarian tidak menemukan hasil)
  // Reset semua field ke kondisi awal
  clearForm() {
    const form = document.getElementById("memberForm");
    if (form) {
      // Reset semua input dalam form
      form.reset();

      // Reset field readonly ke nilai default
      document.getElementById("kodeUnik").value = "";
      document.getElementById("tanggalBerlaku").value =
        "VALID July 2025 - July 2030";

      // Disable tombol yang memerlukan data valid
      document.getElementById("saveBtn").disabled = true;
      document.getElementById("downloadBtn").disabled = true;

      // Reset preview kartu ke tampilan default
      this.cardGenerator.resetPreview();
    }
  }

  showSuccessNotification(message) {
    // Create a temporary notification
    const notification = document.createElement("div");
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;

    // Add CSS animation
    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 3000);
  }

  async autoSync() {
    try {
      const result = await this.databaseManager.syncLocalStorageToServer();
      if (result.success && result.synced > 0) {
        console.log(`Auto-synced ${result.synced} records to server`);
      }
    } catch (error) {
      console.log("Auto-sync not available (server offline)");
    }
  }

  // Utility method to export data
  exportData() {
    const data = this.databaseManager.getLocalStorageMembers();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `docterbee_members_${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();

    URL.revokeObjectURL(url);
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.docterBeeApp = new DocterBeeApp();
});

// Make app available globally for debugging
window.DocterBeeApp = DocterBeeApp;
