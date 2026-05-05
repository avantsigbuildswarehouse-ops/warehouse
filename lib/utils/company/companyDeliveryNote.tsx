import jsPDF from "jspdf";

const generateCompanyDeliveryNotePdf = async (deliveryData: any) => {
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
  doc.text("DELIVERY NOTE", 105, 25, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Delivery No:", 140, 16);
  doc.text("Date:", 140, 22);
  doc.text("Reference No:", 140, 28);

  doc.setFont("helvetica", "bold");
  doc.text(deliveryData.id?.toString() || "-", 165, 16);
  doc.text(new Date(deliveryData.created_at || Date.now()).toLocaleDateString(), 165, 22);
  doc.text(deliveryData.reference_no?.toString() || "-", 165, 28);

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
  doc.text("DELIVERY TO", 18, y + 6);
  y += 10;

  const company = deliveryData.company;
  const companyInfo = [
    { label: "Company Name", value: company?.company_name || "-" },
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
  doc.text("ITEMS DELIVERED", 18, y + 6);
  y += 10;

  // Table headers
  doc.setFillColor(200, 200, 200);
  doc.rect(15, y, 180, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Type", 18, y + 5);
  doc.text("Model/Code", 50, y + 5);
  doc.text("Identifier", 100, y + 5);
  doc.text("Quantity", 155, y + 5);
  doc.text("Status", 175, y + 5);
  y += 8;

  // Items
  const items = deliveryData.items || [];
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
    doc.text("1", 155, y + 5);
    doc.text("Delivered", 175, y + 5);
    y += 8;
  });

  y += 8;

  // Delivery Information
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DELIVERY INFORMATION", 18, y + 6);
  y += 10;

  const deliveryInfo = [
    { label: "Expected Delivery Date", value: deliveryData.expected_delivery_date || "To be confirmed" },
    { label: "Delivery Method", value: deliveryData.delivery_method || "Standard" },
    { label: "Tracking Number", value: deliveryData.tracking_number || "N/A" },
  ];

  deliveryInfo.forEach((info) => {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(info.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(info.value, 65, y + 6);
    y += 10;
  });

  y += 8;

  // Receiver Signature
  doc.rect(15, y, 85, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Receiver's Signature", 20, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text("Name:", 20, y + 18);
  doc.text("Date:", 20, y + 26);

  // Authorized Signature
  doc.rect(110, y, 85, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signature", 115, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text("Name:", 115, y + 18);
  doc.text("Date:", 115, y + 26);

  // Footer
  doc.line(15, 268, 195, 268);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("AVANT signature builds", 15, 276);
  doc.setFont("helvetica", "normal");
  doc.text("613 Bangalawa junction, Ethu Kotte, Kotte", 15, 282);
  doc.text("0777 411 011", 195, 278, { align: "right" });

  doc.save(`Company_DeliveryNote_${deliveryData.id}.pdf`);
};

export default generateCompanyDeliveryNotePdf;