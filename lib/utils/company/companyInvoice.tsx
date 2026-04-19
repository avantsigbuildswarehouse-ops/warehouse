// hooks/Company/companyInvoice.ts
import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { CompanyInvoiceResponse, CompanyResponse, VehicleResponse } from "@/lib/types/companyResponse";

interface InvoiceData extends CompanyInvoiceResponse {
  companies?: CompanyResponse;
  vehicles?: VehicleResponse;
  created_at?: string;
}

const generateCompanyInvoicePdf = async (invoiceData: InvoiceData) => {
  // Validate input
  if (!invoiceData || typeof invoiceData !== 'object') {
    throw new Error('Invalid invoice data');
  }

  const doc = new jsPDF("p", "mm", "a4");

  // ==============================
  // QR CODE
  // ==============================
  let qrCodeSrc = "";
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://abs-sigma.vercel.app";
    const engineNumber = invoiceData.vehicles?.engineNumber || invoiceData.engine_no;
    const chassisNumber = invoiceData.vehicles?.chassisNumber || invoiceData.chassis_no;
    
    if (engineNumber && chassisNumber) {
      const qrData = `${baseUrl}/portal/${chassisNumber}/${engineNumber}`;
      qrCodeSrc = await QRCode.toDataURL(qrData);
    }
  } catch (error) {
    console.error("Failed to generate QR code:", error);
  }

  // ==============================
  // LOAD LOGO
  // ==============================
  const logo = new Image();
  logo.src = "/assets/formLogo.png";

  await new Promise((resolve) => {
    logo.onload = resolve;
    logo.onerror = () => {
      console.warn("Logo not found at path:", logo.src);
      resolve(null);
    };
  });

  // ==============================
  // HEADER
  // ==============================
  if (logo.complete && logo.naturalWidth > 0) {
    try {
      doc.addImage(logo, "PNG", 15, 12, 38, 22);
    } catch (error) {
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("AVANT", 15, 22);
    }
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("AVANT", 15, 22);
  }

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text("COMPANY INVOICE", 96, 25, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Invoice No:", 140, 16);
  doc.text("Date:", 140, 22);
  doc.text("Company ID:", 140, 28);

  doc.setFont("helvetica", "bold");
  doc.text(invoiceData.id?.toString() || "-", 160, 16);
  doc.text(new Date(invoiceData.created_at || Date.now()).toLocaleDateString(), 160, 22);
  doc.text(invoiceData.company_id?.toString() || "-", 160, 28);

  doc.setFont("helvetica", "normal");
  doc.text("Print Date:", 15, 35);
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString(), 35, 35);

  doc.line(15, 38, 195, 38);

  // ==============================
  // COMPANY / VEHICLE TABLE
  // ==============================
  let y = 50;

  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 90, 10, "F");
  doc.rect(105, y, 90, 10, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("COMPANY DETAILS", 18, y + 6);
  doc.text("VEHICLE DETAILS", 108, y + 6);

  y += 10;

  const addRow = (label1: string, value1: string, label2: string, value2: string) => {
    doc.rect(15, y, 90, 10);
    doc.rect(105, y, 90, 10);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(label1, 18, y + 6);
    doc.text(label2, 108, y + 6);
    
    doc.setFont("helvetica", "normal");
    doc.text(value1, 50, y + 6);
    doc.text(value2, 140, y + 6);

    y += 10;
  };

  addRow(
    "Company Name:",
    invoiceData.companies?.company_name || "-",
    "Model:",
    invoiceData.vehicles?.vehicleModel || invoiceData.vehicle_model || "-"
  );

  addRow(
    "BR Number:",
    invoiceData.companies?.BR_no?.toString() || "-",
    "Engine No:",
    invoiceData.vehicles?.engineNumber || invoiceData.engine_no || "-"
  );

  addRow(
    "VAT Number:",
    invoiceData.companies?.VAT_no?.toString() || "-",
    "Chassis No:",
    invoiceData.vehicles?.chassisNumber || invoiceData.chassis_no || "-"
  );

  addRow(
    "Contact:",
    invoiceData.companies?.company_contact?.toString() || "-",
    "Color:",
    invoiceData.vehicles?.color || invoiceData.vehicle_color || "-"
  );

  addRow(
    "Email:",
    invoiceData.companies?.company_email || "-",
    "Year:",
    invoiceData.vehicles?.manuYear || "-"
  );

  const address = invoiceData.companies?.address || "-";
  const truncatedAddress = address.length > 22 ? address.substring(0, 19) + "..." : address;
  
  doc.rect(15, y, 90, 10);
  doc.rect(105, y, 90, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Address:", 18, y + 6);
  doc.text("Payment Method:", 108, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(truncatedAddress, 50, y + 6);
  doc.text(invoiceData.payment_method || "-", 140, y + 6);
  y += 10;

  y += 8;

  // ==============================
  // PAYMENT SUMMARY
  // ==============================
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT SUMMARY", 18, y + 6);
  y += 10;

  const calcPrice = invoiceData.calc_price || 0;
  const advance = invoiceData.advance || 0;
  const totalInvoice = invoiceData.total_invoice || 0;
  const balanceDue = totalInvoice - advance;

  const summaryRows = [
    { label: "Subtotal", value: calcPrice },
    { label: "Advance Payment", value: advance, isNegative: true },
    { label: "Total Invoice", value: totalInvoice, isBold: true },
    { label: "Balance Due", value: balanceDue },
  ];

  summaryRows.forEach((row) => {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(row.label, 20, y + 6);
    
    doc.setFont("helvetica", row.isBold ? "bold" : "normal");
    if (row.isNegative) {
      doc.text(`- LKR ${row.value.toLocaleString()}`, 170, y + 6, { align: "right" });
    } else {
      doc.text(`LKR ${row.value.toLocaleString()}`, 170, y + 6, { align: "right" });
    }
    
    y += 10;
  });

  y += 10;

  // ==============================
  // QR CODE
  // ==============================
  if (qrCodeSrc) {
    doc.setDrawColor(200, 200, 200);
    doc.rect(150, y, 40, 40);
    doc.addImage(qrCodeSrc, "PNG", 155, y + 5, 30, 30);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("Scan for vehicle details", 170, y + 45, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // ==============================
  // THANK YOU NOTE
  // ==============================
  doc.setFillColor(248, 248, 248);
  doc.rect(15, y, 130, 35, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Thank You!", 20, y + 10);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for choosing AVANT signature builds.", 20, y + 20);
  doc.text("We appreciate your business!", 20, y + 28);

  // ==============================
  // FOOTER
  // ==============================
  doc.line(15, 268, 195, 268);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("AVANT signature builds", 15, 276);
  doc.setFont("helvetica", "normal");
  doc.text("613 Bangalawa junction, Ethu Kotte, Kotte", 15, 282);
  doc.text("0777 411 011", 195, 278, { align: "right" });

  doc.save(`Company_Invoice_${invoiceData.id}.pdf`);
};

export default generateCompanyInvoicePdf;