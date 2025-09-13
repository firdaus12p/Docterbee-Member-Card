// Modul Generator Kartu
class CardGenerator {
  constructor() {
    this.cardTypes = {
      active_worker: {
        name: "ACTIVE WORKER",
        frontClass: "active-worker-bg",
        backClass: "active-worker-bg-back",
      },
      family_member: {
        name: "FAMILY MEMBER",
        frontClass: "family-member-bg",
        backClass: "family-member-bg-back",
      },
      healthy_smart_kids: {
        name: "HEALTHY & SMART KIDS",
        frontClass: "healthy-smart-kids-bg",
        backClass: "healthy-smart-kids-bg-back",
      },
      mums_baby: {
        name: "MUMS & BABY",
        frontClass: "mums-baby-bg",
        backClass: "mums-baby-bg-back",
      },
      new_couple: {
        name: "NEW COUPLE",
        frontClass: "new-couple-bg",
        backClass: "new-couple-bg-back",
      },
      pregnant_preparation: {
        name: "PREGNANT PREPARATION",
        frontClass: "pregnant-preparation-bg",
        backClass: "pregnant-preparation-bg-back",
      },
      senja_ceria: {
        name: "SENJA CERIA",
        frontClass: "senja-ceria-bg",
        backClass: "senja-ceria-bg-back",
      },
    };

    this.initializeEvents();
  }

  initializeEvents() {
    const jenisKartuSelect = document.getElementById("jenisKartu");
    jenisKartuSelect.addEventListener("change", (e) => {
      this.updateCardType(e.target.value);
    });

    // Perbarui preview ketika data form berubah - tambahkan field whatsapp
    const formInputs = ["nama", "whatsapp"];
    formInputs.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener("input", () => this.updatePreview());
      }
    });
  }

  updateCardType(cardType) {
    if (!cardType || !this.cardTypes[cardType]) return;

    const cardTypeData = this.cardTypes[cardType];

    // Perbarui kartu depan
    const cardBackground = document.getElementById("cardBackground");
    const cardTypeDisplay = document.getElementById("cardTypeDisplay");

    // Hapus semua class background
    cardBackground.className = "card-background";
    cardBackground.classList.add(cardTypeData.frontClass);

    cardTypeDisplay.textContent = cardTypeData.name;

    // Perbarui kartu belakang
    const cardBackgroundBack = document.getElementById("cardBackgroundBack");
    cardBackgroundBack.className = "card-background-back";
    cardBackgroundBack.classList.add(cardTypeData.backClass);
  }

  updatePreview() {
    const nama = document.getElementById("nama").value || "Nama Anggota";
    const whatsapp =
      document.getElementById("whatsapp").value || "08xxxxxxxxxx";
    const tanggalBerlaku =
      document.getElementById("tanggalBerlaku").value ||
      "VALID August 2025 - August 2030";

    // Perbarui elemen preview - tampilkan nomor WhatsApp tanpa label "Kode:"
    document.getElementById("previewNama").textContent = nama;
    document.getElementById("previewKode").textContent = whatsapp;
    document.getElementById("previewTanggal").textContent = tanggalBerlaku;
  }

  generateCard() {
    const whatsapp = document.getElementById("whatsapp").value;

    if (!whatsapp) {
      alert("Mohon isi nomor WhatsApp terlebih dahulu!");
      return false;
    }

    // Perbarui tanggal berlaku - gunakan timezone user
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const now = new Date();
    const currentMonth = now.toLocaleString("en-US", {
      month: "long",
      timeZone: userTimeZone,
    });
    const currentYear = now.getFullYear();
    const expiryYear = currentYear + 5;

    const validDate = `VALID ${currentMonth} ${currentYear} - ${currentMonth} ${expiryYear}`;
    document.getElementById("tanggalBerlaku").value = validDate;

    // Perbarui preview
    this.updatePreview();

    // Aktifkan tombol simpan dan download
    document.getElementById("saveBtn").disabled = false;
    document.getElementById("downloadBtn").disabled = false;

    return true;
  }

  getCardData() {
    return {
      nama: document.getElementById("nama").value,
      whatsapp: document.getElementById("whatsapp").value,
      email: document.getElementById("email").value,
      alamat: document.getElementById("alamat").value,
      umur: document.getElementById("umur").value,
      kegiatan: document.getElementById("kegiatan").value,
      jenisKartu: document.getElementById("jenisKartu").value,
      tanggalBerlaku: document.getElementById("tanggalBerlaku").value,
    };
  }

  validateForm() {
    const requiredFields = [
      "nama",
      "whatsapp",
      "alamat",
      "kegiatan",
      "jenisKartu",
    ];

    for (let fieldId of requiredFields) {
      const field = document.getElementById(fieldId);
      if (!field.value.trim()) {
        alert(
          `Mohon lengkapi field: ${field.previousElementSibling.textContent}`
        );
        field.focus();
        return false;
      }
    }

    // Validasi umur khusus - boleh kosong, tapi jika diisi harus valid
    const umurField = document.getElementById("umur");
    if (
      umurField.value.trim() &&
      (parseInt(umurField.value) < 1 || parseInt(umurField.value) > 120)
    ) {
      alert(
        "Umur harus antara 1-120 tahun (atau kosongkan jika tidak ingin mencantumkan)"
      );
      umurField.focus();
      return false;
    }

    return true;
  }

  resetForm() {
    document.getElementById("memberForm").reset();
    document.getElementById("kodeUnik").value = "";
    document.getElementById("tanggalBerlaku").value =
      "VALID July 2025 - July 2030";

    this.resetPreview();

    // Nonaktifkan tombol
    document.getElementById("saveBtn").disabled = true;
    document.getElementById("downloadBtn").disabled = true;
  }

  // Fungsi untuk reset preview kartu tanpa reset form
  resetPreview() {
    // Reset preview teks
    document.getElementById("previewNama").textContent = "Nama Anggota";
    document.getElementById("previewKode").textContent = "Kode: XXXX-XXXX";
    document.getElementById("previewTanggal").textContent =
      "VALID July 2025 - July 2030";

    // Reset jenis kartu ke default
    const cardBackground = document.getElementById("cardBackground");
    const cardBackgroundBack = document.getElementById("cardBackgroundBack");
    cardBackground.className = "card-background active-worker-bg";
    cardBackgroundBack.className = "card-background-back active-worker-bg-back";

    // Reset card type display jika ada
    const cardTypeDisplay = document.getElementById("cardTypeDisplay");
    if (cardTypeDisplay) {
      cardTypeDisplay.textContent = "ACTIVE WORKER";
    }
  }
}

// Export untuk digunakan di modul lain
window.CardGenerator = CardGenerator;
