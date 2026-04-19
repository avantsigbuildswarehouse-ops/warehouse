// hooks/Company/companyQuotation.ts
import jsPDF from "jspdf";

const generateCompanyQuotationPdf = async (quotationData: any) => {
  const doc = new jsPDF("p", "mm", "a4");

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
  doc.text("COMPANY QUOTATION", 96, 25, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Quotation No:", 140, 16);
  doc.text("Date:", 140, 22);
  doc.text("Valid Until:", 140, 28);

  doc.setFont("helvetica", "bold");
  doc.text(quotationData.id?.toString() || "-", 160, 16);
  doc.text(new Date(quotationData.created_at || Date.now()).toLocaleDateString(), 160, 22);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  doc.text(validUntil.toLocaleDateString(), 160, 28);

  doc.setFont("helvetica", "normal");
  doc.text("Print Date:", 15, 35);
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString(), 35, 35);

  doc.line(15, 38, 195, 38);

  // ==============================
  // COMPANY DETAILS
  // ==============================
  let y = 50;

  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("COMPANY DETAILS", 18, y + 6);
  y += 10;

  const company = quotationData.companies;
  const companyInfo = [
    { label: "Company Name", value: company?.company_name || "-" },
    { label: "BR Number", value: company?.BR_no?.toString() || "-" },
    { label: "VAT Number", value: company?.VAT_no?.toString() || "-" },
    { label: "Contact", value: company?.company_contact?.toString() || "-" },
    { label: "Email", value: company?.company_email || "-" },
    { label: "Address", value: company?.address?.toString() || "-" },
  ];

  companyInfo.forEach((info) => {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(info.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    const truncatedValue = info.value.length > 40 ? info.value.substring(0, 37) + "..." : info.value;
    doc.text(truncatedValue, 55, y + 6);
    y += 10;
  });

  y += 8;

  // ==============================
  // VEHICLE DETAILS
  // ==============================
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("VEHICLE DETAILS", 18, y + 6);
  y += 10;

  const vehicle = quotationData.vehicles;
  const vehicleInfo = [
    { label: "Vehicle Model", value: vehicle?.vehicleModel || quotationData.vehicle_model || "-" },
    { label: "Engine Number", value: vehicle?.engineNumber || quotationData.engine_no || "-" },
    { label: "Chassis Number", value: vehicle?.chassisNumber || quotationData.chassis_no || "-" },
    { label: "Color", value: vehicle?.color || quotationData.vehicle_color || "-" },
    { label: "Manufacturing Year", value: vehicle?.manuYear || "-" },
  ];

  vehicleInfo.forEach((info) => {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(info.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(info.value, 55, y + 6);
    y += 10;
  });

  y += 8;

  // ==============================
  // QUOTATION SUMMARY
  // ==============================
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("QUOTATION SUMMARY", 18, y + 6);
  y += 10;

  const basePrice = quotationData.base_price || 0;
  const vat = quotationData.VAT || 0;
  const registrationFee = quotationData.registration_fee || 0;
  const discount = quotationData.discount || 0;
  const totalEstimate = quotationData.total_estimate || 0;

  const summaryRows = [
    { label: "Base Price", value: basePrice },
    { label: "VAT", value: vat },
    { label: "Registration Fee", value: registrationFee },
    { label: "Discount", value: discount, isNegative: true },
    { label: "Total Estimate", value: totalEstimate, isBold: true },
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

  y += 8;

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

  doc.save(`Company_Quotation_${quotationData.id}.pdf`);
};

export default generateCompanyQuotationPdf;