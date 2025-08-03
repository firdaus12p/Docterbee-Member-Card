// Modul Database
class DatabaseManager {
  constructor() {
    this.apiEndpoint = "api/member.php";
  }

  async saveData(memberData) {
    try {
      this.showLoading();

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "save",
          data: memberData,
        }),
      });

      // Parse response JSON terlebih dahulu, bahkan jika status code error
      const result = await response.json();

      this.hideLoading();

      if (result.success) {
        this.showSuccessMessage("Data berhasil disimpan ke database!");
        return true;
      } else {
        // Jika server mengembalikan success: false, tampilkan pesan error dari server
        throw new Error(result.message || "Gagal menyimpan data");
      }
    } catch (error) {
      console.error("Database error:", error);
      this.hideLoading();

      // Cek apakah error berupa validasi (seperti nomor duplikat atau format salah)
      const errorMessage = error.message || "Gagal menyimpan data";

      // Jika error berupa validasi user (nomor duplikat, format salah, dll), tampilkan error langsung
      if (
        errorMessage.includes("telah digunakan oleh") ||
        errorMessage.includes("Format nomor harus") ||
        errorMessage.includes("Invalid") ||
        errorMessage.includes("Maaf, nomor yang anda daftarkan")
      ) {
        this.showErrorMessage(errorMessage);
        return false;
      }

      // Fallback: simpan ke localStorage hanya untuk error koneksi/server
      this.saveToLocalStorage(memberData);
      this.showSuccessMessage(
        "Data disimpan sementara. Silakan hubungi admin untuk sinkronisasi database."
      );
      return false;
    }
  }

  saveToLocalStorage(memberData) {
    try {
      // Dapatkan data yang sudah ada
      const existingData = JSON.parse(
        localStorage.getItem("docterbee_members") || "[]"
      );

      // Tambah anggota baru dengan timestamp
      const newMember = {
        ...memberData,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        synced: false,
      };

      existingData.push(newMember);

      // Simpan kembali ke localStorage
      localStorage.setItem("docterbee_members", JSON.stringify(existingData));

      console.log("Data saved to localStorage:", newMember);
    } catch (error) {
      console.error("LocalStorage error:", error);
    }
  }

  async checkCodeUnique(code) {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "check_code",
          code: code,
        }),
      });

      if (!response.ok) {
        // Jika server tidak tersedia, periksa localStorage
        return this.checkCodeInLocalStorage(code);
      }

      const result = await response.json();
      return result.unique;
    } catch (error) {
      console.error("Error checking code uniqueness:", error);
      return this.checkCodeInLocalStorage(code);
    }
  }

  checkCodeInLocalStorage(code) {
    try {
      const existingData = JSON.parse(
        localStorage.getItem("docterbee_members") || "[]"
      );
      const codeExists = existingData.some(
        (member) => member.kodeUnik === code
      );
      return !codeExists; // Kembalikan true jika unik (tidak ada)
    } catch (error) {
      console.error("LocalStorage check error:", error);
      return true; // Anggap unik jika terjadi error
    }
  }

  async getAllMembers() {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "get_all",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.error("Error fetching members:", error);
      // Fallback ke localStorage
      return this.getLocalStorageMembers();
    }
  }

  // Fungsi untuk mencari member berdasarkan nomor WhatsApp
  // Fitur baru untuk memungkinkan user mencari data mereka yang sudah terdaftar
  async searchMemberByWhatsApp(whatsapp) {
    try {
      // KEAMANAN: Sanitasi input nomor WhatsApp - hapus semua karakter non-digit
      const sanitizedWhatsApp = whatsapp.replace(/\D/g, "");

      // Validasi format nomor WhatsApp - minimal 10 digit
      if (!sanitizedWhatsApp || sanitizedWhatsApp.length < 10) {
        throw new Error("Nomor WhatsApp tidak valid");
      }

      // Kirim request ke server API untuk mencari member
      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "search_by_whatsapp",
          whatsapp: sanitizedWhatsApp,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        // Jika tidak ditemukan di server, cari di localStorage sebagai fallback
        return this.searchMemberInLocalStorage(sanitizedWhatsApp);
      }
    } catch (error) {
      console.error("Error searching member:", error);
      // Fallback ke localStorage jika server tidak tersedia
      return this.searchMemberInLocalStorage(whatsapp);
    }
  }

  // Fungsi untuk mencari member di localStorage (fallback ketika server offline)
  // Berguna ketika user tidak memiliki koneksi internet
  searchMemberInLocalStorage(whatsapp) {
    try {
      // Ambil semua member yang tersimpan di localStorage
      const localMembers = this.getLocalStorageMembers();
      const sanitizedSearch = whatsapp.replace(/\D/g, "");

      // Cari member yang nomor WhatsApp-nya cocok (fleksibel dengan berbagai format)
      const member = localMembers.find((member) => {
        const memberWhatsApp = member.whatsapp
          ? member.whatsapp.replace(/\D/g, "")
          : "";
        return memberWhatsApp === sanitizedSearch;
      });

      return member || null;
    } catch (error) {
      console.error("Error searching in localStorage:", error);
      return null;
    }
  }

  getLocalStorageMembers() {
    try {
      return JSON.parse(localStorage.getItem("docterbee_members") || "[]");
    } catch (error) {
      console.error("LocalStorage read error:", error);
      return [];
    }
  }

  async syncLocalStorageToServer() {
    try {
      const localData = this.getLocalStorageMembers();
      const unsyncedData = localData.filter((member) => !member.synced);

      if (unsyncedData.length === 0) {
        return { success: true, synced: 0 };
      }

      const response = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          action: "bulk_save",
          data: unsyncedData,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Tandai sebagai tersinkronisasi di localStorage
        localData.forEach((member) => {
          if (!member.synced) {
            member.synced = true;
          }
        });
        localStorage.setItem("docterbee_members", JSON.stringify(localData));
      }

      return result;
    } catch (error) {
      console.error("Sync error:", error);
      return { success: false, error: error.message };
    }
  }

  validateMemberData(data) {
    const required = [
      "nama",
      "whatsapp",
      "umur",
      "kegiatan",
      "jenisKartu",
      "kodeUnik",
    ];

    for (let field of required) {
      if (!data[field] || data[field].toString().trim() === "") {
        return { valid: false, message: `Field ${field} harus diisi` };
      }
    }

    // Validasi format nomor telepon
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
    if (!phoneRegex.test(data.whatsapp.replace(/\s+/g, ""))) {
      return { valid: false, message: "Format nomor WhatsApp tidak valid" };
    }

    // Validasi umur
    const age = parseInt(data.umur);
    if (isNaN(age) || age < 1 || age > 120) {
      return { valid: false, message: "Umur harus antara 1-120 tahun" };
    }

    return { valid: true };
  }

  showLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
      overlay.style.display = "flex";
    }
  }

  hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
      overlay.style.display = "none";
    }
  }

  showSuccessMessage(message) {
    const modal = document.getElementById("successModal");
    const messageElement = document.getElementById("successMessage");

    if (modal && messageElement) {
      messageElement.textContent = message;
      modal.style.display = "flex";
    }
  }

  // Function untuk menampilkan pesan error validasi
  showErrorMessage(message) {
    const modal = document.getElementById("successModal");
    const messageElement = document.getElementById("successMessage");
    const headerElement = modal?.querySelector(".modal-header h3");

    if (modal && messageElement && headerElement) {
      // Ubah konten untuk error
      headerElement.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i> Error!';
      headerElement.style.color = "#dc3545"; // Warna merah untuk error
      messageElement.textContent = message;
      modal.style.display = "flex";
    }
  }

  hideSuccessMessage() {
    const modal = document.getElementById("successModal");
    const headerElement = modal?.querySelector(".modal-header h3");

    if (modal) {
      modal.style.display = "none";

      // Reset header kembali ke success untuk penggunaan berikutnya
      if (headerElement) {
        headerElement.innerHTML =
          '<i class="fas fa-check-circle"></i> Berhasil!';
        headerElement.style.color = "#28a745"; // Kembali ke warna hijau untuk success
      }
    }
  }
}

// Export untuk digunakan di modul lain
window.DatabaseManager = DatabaseManager;
