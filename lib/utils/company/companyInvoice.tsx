import jsPDF from "jspdf";

const generateCompanyInvoicePdf = async (invoiceData: any) => {
  const doc = new jsPDF("p", "mm", "a4");

  // Load logo
  const logo = new Image();
  logo.src = "/formlogo.png"

  await new Promise((resolve) => {
    logo.onload = resolve;
    logo.onerror = () => {
      console.warn("Logo not found at path:", logo.src);
      resolve(null);
    };
  });

  // Header
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
  doc.text("TAX INVOICE", 105, 25, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Invoice No:", 140, 16);
  doc.text("Date:", 140, 22);
  doc.text("Due Date:", 140, 28);

  doc.setFont("helvetica", "bold");
  doc.text(invoiceData.id?.toString() || "-", 165, 16);
  doc.text(new Date(invoiceData.created_at || Date.now()).toLocaleDateString(), 165, 22);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  doc.text(dueDate.toLocaleDateString(), 165, 28);

  doc.setFont("helvetica", "normal");
  doc.text("Print Date:", 15, 35);
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString(), 40, 35);

  doc.line(15, 38, 195, 38);

  // Company Details
  let y = 50;

  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO", 18, y + 6);
  y += 10;

  const company = invoiceData.company;
  const companyInfo = [
    { label: "Company Name", value: company?.company_name || "-" },
    { label: "BR Number", value: company?.br_no?.toString() || "-" },
    { label: "VAT Number", value: company?.vat_no?.toString() || "-" },
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

  // Items Table
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ITEMS", 18, y + 6);
  y += 10;

  // Table headers
  doc.setFillColor(200, 200, 200);
  doc.rect(15, y, 180, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Type", 18, y + 5);
  doc.text("Model/Code", 50, y + 5);
  doc.text("Identifier", 100, y + 5);
  doc.text("Price (LKR)", 155, y + 5, { align: "right" });
  y += 8;

  // Items
  const items = invoiceData.items || [];
  items.forEach((item: any) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.rect(15, y, 180, 8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(item.type, 18, y + 5);
    doc.text(item.model_code, 50, y + 5);
    doc.text(item.identifier, 100, y + 5);
    doc.text(item.price?.toLocaleString() || "0", 190, y + 5, { align: "right" });
    y += 8;
  });

  y += 8;

  // Summary
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMARY", 18, y + 6);
  y += 10;

  const basePrice = invoiceData.base_price || 0;
  const vat = invoiceData.vat || 0;
  const registrationFee = invoiceData.registration_fee || 0;
  const discount = invoiceData.discount || 0;
  const total = basePrice + vat + registrationFee - discount;

  const summaryRows = [
    { label: "Base Price", value: basePrice },
    { label: "VAT", value: vat },
    { label: "Registration Fee", value: registrationFee },
    { label: "Discount", value: discount, isNegative: true },
    { label: "Total Amount", value: total, isBold: true },
  ];

  summaryRows.forEach((row) => {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(row.label, 20, y + 6);
    doc.setFont("helvetica", row.isBold ? "bold" : "normal");
    const formattedValue = `LKR ${row.value.toLocaleString()}`;
    if (row.isNegative) {
      doc.text(`- ${formattedValue}`, 190, y + 6, { align: "right" });
    } else {
      doc.text(formattedValue, 190, y + 6, { align: "right" });
    }
    y += 10;
  });

  // Footer
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