import jsPDF from "jspdf";

const generateCustomerQuotationPdf = async (quotationData: any) => {
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
  doc.text("CUSTOMER QUOTATION", 105, 25, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Quotation No:", 140, 16);
  doc.text("Date:", 140, 22);
  doc.text("Valid Until:", 140, 28);

  doc.setFont("helvetica", "bold");
  doc.text(quotationData.id?.toString() || "-", 165, 16);
  doc.text(new Date(quotationData.created_at || Date.now()).toLocaleDateString(), 165, 22);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);
  doc.text(validUntil.toLocaleDateString(), 165, 28);

  doc.setFont("helvetica", "normal");
  doc.text("Print Date:", 15, 35);
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString(), 40, 35);

  doc.line(15, 38, 195, 38);

  // Customer Details
  let y = 50;

  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER DETAILS", 18, y + 6);
  y += 10;

  const customer = quotationData.customer;
  const customerInfo = [
    { label: "Customer Name", value: `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() || "-" },
    { label: "Phone", value: customer?.phone_number || "-" },
    { label: "NIC", value: customer?.nic || "-" },
    { label: "Address", value: customer?.address || "-" },
  ];

  customerInfo.forEach((info) => {
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
  const items = quotationData.items || [];
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

  const basePrice = quotationData.base_price || 0;
  const registrationFee = quotationData.registration_fee || 0;
  const discount = quotationData.discount || 0;
  const totalEstimate = basePrice + registrationFee - discount;

  const summaryRows = [
    { label: "Base Price", value: basePrice },
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

  doc.save(`Customer_Quotation_${quotationData.id}.pdf`);
};

export default generateCustomerQuotationPdf;