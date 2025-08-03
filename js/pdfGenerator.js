// Modul Generator PDF
class PDFGenerator {
  constructor() {
    this.loadLibraries();
  }

  async loadLibraries() {
    // Libraries akan dimuat dari CDN di HTML
    // Memastikan jsPDF tersedia
    if (typeof window.jsPDF === "undefined") {
      console.warn("jsPDF library not loaded");
    }
  }

  async generatePDF(cardData) {
    try {
      // Tampilkan loading
      this.showLoading();

      // Buat PDF dengan ukuran kartu (85.60 × 53.98 mm)
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [85.6, 53.98],
      });

      // Generate kartu depan
      await this.addCardToPDF(pdf, "front", cardData);

      // Tambah halaman baru untuk kartu belakang
      pdf.addPage();
      await this.addCardToPDF(pdf, "back", cardData);

      // Download PDF
      const fileName = `kartu_anggota_${cardData.nama.replace(
        /\s+/g,
        "_"
      )}_${Date.now()}.pdf`;
      pdf.save(fileName);

      this.hideLoading();
      return true;
    } catch (error) {
      console.error("Error generating PDF:", error);
      this.hideLoading();
      alert("Terjadi kesalahan saat membuat PDF. Silakan coba lagi.");
      return false;
    }
  }

  async addCardToPDF(pdf, side, cardData) {
    const cardElement =
      side === "front"
        ? document.getElementById("cardFront")
        : document.getElementById("cardBack");

    try {
      // Sementara tampilkan sisi target
      const cardWrapper = document.getElementById("cardWrapper");
      const wasFlipped = cardWrapper.classList.contains("flipped");

      if (side === "back" && !wasFlipped) {
        cardWrapper.classList.add("flipped");
      } else if (side === "front" && wasFlipped) {
        cardWrapper.classList.remove("flipped");
      }

      // Tunggu animasi selesai
      await new Promise((resolve) => setTimeout(resolve, 700));

      // PERBAIKAN UNTUK KARTU BELAKANG YANG TERBALIK DI PDF:
      // Tambahkan class khusus untuk menormalkan orientasi kartu belakang saat capture
      // Class 'pdf-capture' akan mengatur transform: rotateY(0deg) pada .card-back
      if (side === "back") {
        cardWrapper.classList.add("pdf-capture");
      }

      // Tunggu CSS class diterapkan dengan benar
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Gunakan html2canvas untuk menangkap kartu dengan kualitas tinggi
      const canvas = await html2canvas(cardElement, {
        scale: 3, // Kualitas tinggi untuk hasil PDF yang jernih
        useCORS: true, // Dukungan CORS untuk gambar eksternal
        backgroundColor: null, // Background transparan
        logging: false, // Nonaktifkan log untuk performa
        width: cardElement.offsetWidth,
        height: cardElement.offsetHeight,
      });

      // SETELAH CAPTURE: Hapus class khusus dan kembalikan kartu ke tampilan normal
      if (side === "back") {
        cardWrapper.classList.remove("pdf-capture");
      }

      // Kembalikan ke keadaan semula
      if (wasFlipped && side === "front") {
        cardWrapper.classList.add("flipped");
      } else if (!wasFlipped && side === "back") {
        cardWrapper.classList.remove("flipped");
      }

      // Tambahkan gambar ke PDF
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    } catch (error) {
      console.error(`Error capturing ${side} card:`, error);
      throw error;
    }
  }

  // Metode alternatif menggunakan pembuatan PDF manual (jika html2canvas gagal)
  createManualPDF(cardData) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: [85.6, 53.98],
    });

    // Dapatkan jenis kartu
    const cardType = cardData.jenisKartu;
    const colors = this.getCardColors(cardType);

    // Kartu depan
    this.drawCardFront(pdf, cardData, colors);

    // Kartu belakang
    pdf.addPage();
    this.drawCardBack(pdf, colors);

    const fileName = `kartu_anggota_${cardData.nama.replace(
      /\s+/g,
      "_"
    )}_${Date.now()}.pdf`;
    pdf.save(fileName);

    return true;
  }

  drawCardFront(pdf, cardData, colors) {
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();

    // Efek gradien background (disederhanakan)
    pdf.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
    pdf.rect(0, 0, width, height, "F");

    // Border
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.5);
    pdf.rect(2, 2, width - 4, height - 4);

    // Header - logo DocterBee
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("🍃 DocterBee", 5, 10);

    // Jenis kartu
    pdf.setFontSize(8);
    const cardTypeText = this.getCardTypeName(cardData.jenisKartu);
    pdf.text(cardTypeText, width - 5, 10, { align: "right" });

    // Get positioning from controls (with fallbacks)
    const namaX =
      ((document.getElementById("namaX")?.value || 5) / 100) * width;
    const namaY =
      ((document.getElementById("namaY")?.value || 70) / 100) * height;
    const namaAlign = document.getElementById("namaAlignment")?.value || "left";

    const kodeX =
      ((document.getElementById("kodeX")?.value || 5) / 100) * width;
    const kodeY =
      ((document.getElementById("kodeY")?.value || 85) / 100) * height;
    const kodeAlign = document.getElementById("kodeAlignment")?.value || "left";

    const tanggalX =
      ((document.getElementById("tanggalX")?.value || 5) / 100) * width;
    const tanggalY =
      ((document.getElementById("tanggalY")?.value || 95) / 100) * height;
    const tanggalAlign =
      document.getElementById("tanggalAlignment")?.value || "left";

    // Name with custom positioning
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text(cardData.nama || "Nama Anggota", namaX, namaY, {
      align: namaAlign,
    });

    // Code with custom positioning
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Kode: ${cardData.kodeUnik || "XXXX-XXXX"}`, kodeX, kodeY, {
      align: kodeAlign,
    });

    // Valid date with custom positioning
    pdf.setFontSize(8);
    pdf.text(
      cardData.tanggalBerlaku || "VALID July 2025 - July 2030",
      tanggalX,
      tanggalY,
      { align: tanggalAlign }
    );

    // Footer
    pdf.setFontSize(7);
    pdf.text("MEMBER ID", width - 5, height - 5, { align: "right" });
  }

  drawCardBack(pdf, colors) {
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();

    // Background
    pdf.setFillColor(
      colors.secondary.r,
      colors.secondary.g,
      colors.secondary.b
    );
    pdf.rect(0, 0, width, height, "F");

    // Border
    pdf.setDrawColor(255, 255, 255);
    pdf.setLineWidth(0.5);
    pdf.rect(2, 2, width - 4, height - 4);

    // Terms and conditions
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("Syarat & Ketentuan", width / 2, 12, { align: "center" });

    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    const terms = [
      "• Kartu ini tidak dapat dipindahtangankan",
      "• Berlaku untuk pembelian produk DocterBee",
      "• Dapatkan diskon khusus member",
      "• Hubungi CS untuk info lebih lanjut",
    ];

    let yPos = 18;
    terms.forEach((term) => {
      pdf.text(term, 5, yPos);
      yPos += 4;
    });

    // Contact info
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text("📞 0800-DOCTERBEE", width / 2, height - 12, { align: "center" });
    pdf.text("🌐 www.docterbee.com", width / 2, height - 6, {
      align: "center",
    });
  }

  getCardColors(cardType) {
    const colorMap = {
      active_worker: {
        primary: { r: 33, g: 150, b: 243 }, // Blue
        secondary: { r: 21, g: 101, b: 192 }, // Dark Blue
      },
      family_member: {
        primary: { r: 76, g: 175, b: 80 }, // Green
        secondary: { r: 56, g: 142, b: 60 }, // Dark Green
      },
      healthy_smart_kids: {
        primary: { r: 255, g: 193, b: 7 }, // Yellow
        secondary: { r: 255, g: 152, b: 0 }, // Orange
      },
      mums_baby: {
        primary: { r: 233, g: 30, b: 99 }, // Pink
        secondary: { r: 173, g: 20, b: 87 }, // Dark Pink
      },
      new_couple: {
        primary: { r: 156, g: 39, b: 176 }, // Purple
        secondary: { r: 123, g: 31, b: 162 }, // Dark Purple
      },
      pregnant_preparation: {
        primary: { r: 103, g: 58, b: 183 }, // Deep Purple
        secondary: { r: 81, g: 45, b: 168 }, // Darker Purple
      },
      senja_ceria: {
        primary: { r: 255, g: 87, b: 34 }, // Deep Orange
        secondary: { r: 230, g: 74, b: 25 }, // Darker Orange
      },
    };

    return colorMap[cardType] || colorMap.active_worker;
  }

  getCardTypeName(cardType) {
    const typeMap = {
      active_worker: "ACTIVE WORKER",
      family_member: "FAMILY MEMBER",
      healthy_smart_kids: "HEALTHY & SMART KIDS",
      mums_baby: "MUMS & BABY",
      new_couple: "NEW COUPLE",
      pregnant_preparation: "PREGNANT PREPARATION",
      senja_ceria: "SENJA CERIA",
    };

    return typeMap[cardType] || "ACTIVE WORKER";
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
}

// Export untuk digunakan di modul lain
window.PDFGenerator = PDFGenerator;
