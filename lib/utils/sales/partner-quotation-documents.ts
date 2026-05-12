import jsPDF from "jspdf";

export type PartnerQuotationItem = {
  type: "Bike" | "Spare";
  model_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type CustomerDetails = {
  type: "individual" | "company";
  customerName?: string;
  phone?: string;
  nic?: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
};

type PartnerDocumentPayload = {
  targetType: "dealer" | "showroom";
  targetCode: string;
  createdAt?: string;
  items: PartnerQuotationItem[];
  basePrice: number;
  registrationFee: number;
  advancePayment: number;
  discount?: number;
  paymentMethod?: string;
  customerDetails: CustomerDetails;
};

function formatDate(date: Date) {
  const current = new Date(date);
  const day = String(current.getDate()).padStart(2, "0");
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const year = current.getFullYear();
  return `${day}/${month}/${year}`;
}

async function loadLogo(doc: jsPDF) {
  const logo = new Image();
  logo.src = "/formlogo.png";

  await new Promise((resolve) => {
    logo.onload = resolve;
    logo.onerror = () => resolve(null);
  });

  if (logo.complete && logo.naturalWidth > 0) {
    doc.addImage(logo, "PNG", 15, 12, 38, 22);
  } else {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("AVANT", 15, 22);
  }
}

function addNewPage(doc: jsPDF, yPosition: number): number {
  doc.addPage();
  return 20; // Reset Y position for new page
}

function drawHeader(doc: jsPDF, kind: "quotation" | "performer", payload: PartnerDocumentPayload, startY: number): number {
  let y = startY;
  
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text(kind === "quotation" ? "QUOTATION" : "PERFORMER INVOICE", 105, y, { align: "center" });
  y += 10;

  const documentPrefix = `${payload.targetType.toUpperCase()}-${kind === "quotation" ? "QUOT" : "PERFORMER"}`;
  const documentNumber = `${documentPrefix}-${payload.targetCode}-${Date.now()}`;
  const createdAt = new Date(payload.createdAt || Date.now());
  const dueDate = new Date(createdAt);
  dueDate.setDate(dueDate.getDate() + 30);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(kind === "quotation" ? "Quotation No:" : "Performer Invoice No:", 15, y);
  doc.text("Date:", 15, y + 6);
  doc.text(kind === "quotation" ? "Valid Until:" : "Due Date:", 15, y + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(doc.splitTextToSize(documentNumber, 90), 55, y);
  doc.setFontSize(8);
  doc.text(formatDate(createdAt), 55, y + 6);
  doc.text(formatDate(dueDate), 55, y + 12);
  doc.line(15, y + 18, 195, y + 18);
  
  return y + 22;
}

function drawDealerDetails(doc: jsPDF, payload: PartnerDocumentPayload, startY: number): number {
  let y = startY;
  
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(payload.targetType === "dealer" ? "DEALER DETAILS" : "SHOWROOM DETAILS", 18, y + 6);
  y += 10;

  const details = [
    {
      label: payload.targetType === "dealer" ? "Dealer Code" : "Showroom Code",
      value: payload.targetCode,
    },
    {
      label: "Type",
      value: payload.targetType === "dealer" ? "Dealer" : "Showroom",
    },
  ];

  for (const row of details) {
    if (y > 270) {
      y = addNewPage(doc, y);
    }
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(row.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(row.value, 58, y + 6);
    y += 10;
  }
  
  return y;
}

function drawCustomerDetails(doc: jsPDF, payload: PartnerDocumentPayload, startY: number): number {
  let y = startY;
  
  if (y > 270) {
    y = addNewPage(doc, y);
  }
  
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER DETAILS", 18, y + 6);
  y += 10;

  const isIndividual = payload.customerDetails.type === "individual";
  const detailsRows = isIndividual
    ? [
        { label: "Customer Name", value: payload.customerDetails.customerName || "" },
        { label: "Phone Number", value: payload.customerDetails.phone || "" },
        { label: "NIC", value: payload.customerDetails.nic || "" },
      ]
    : [
        { label: "Company Name", value: payload.customerDetails.companyName || "" },
        { label: "Company Email", value: payload.customerDetails.companyEmail || "" },
        { label: "Company Phone", value: payload.customerDetails.companyPhone || "" },
      ];

  for (const row of detailsRows) {
    if (y > 270) {
      y = addNewPage(doc, y);
    }
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(row.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    const splitValue = doc.splitTextToSize(row.value, 120);
    doc.text(splitValue, 58, y + 6);
    y += 10;
  }
  
  return y;
}

function drawItemsTable(doc: jsPDF, payload: PartnerDocumentPayload, startY: number): number {
  let y = startY;
  
  if (y > 270) {
    y = addNewPage(doc, y);
  }
  
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ITEMS", 18, y + 6);
  y += 10;

  if (y > 270) {
    y = addNewPage(doc, y);
  }
  
  doc.setFillColor(200, 200, 200);
  doc.rect(15, y, 180, 9, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Type", 18, y + 5.5);
  doc.text("Model", 35, y + 5.5);
  doc.text("Description", 68, y + 5.5);
  doc.text("Qty", 145, y + 5.5);
  doc.text("Unit", 165, y + 5.5, { align: "right" });
  doc.text("Total", 192, y + 5.5, { align: "right" });
  y += 9;

  for (const item of payload.items) {
    if (y > 260) {
      // Draw header again on new page
      y = addNewPage(doc, y);
      doc.setFillColor(200, 200, 200);
      doc.rect(15, y, 180, 9, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("Type", 18, y + 5.5);
      doc.text("Model", 35, y + 5.5);
      doc.text("Description", 68, y + 5.5);
      doc.text("Qty", 145, y + 5.5);
      doc.text("Unit", 165, y + 5.5, { align: "right" });
      doc.text("Total", 192, y + 5.5, { align: "right" });
      y += 9;
    }

    // Calculate description height
    const descriptionLines = doc.splitTextToSize(item.description, 72);
    const lineHeight = 4;
    const descriptionHeight = Math.max(descriptionLines.length * lineHeight, 12);
    
    doc.rect(15, y, 180, descriptionHeight);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(item.type, 18, y + 4.5);
    doc.text(item.model_code, 35, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.text(descriptionLines, 68, y + 4.5);
    doc.text(String(item.quantity), 145, y + (descriptionHeight / 2));
    doc.text(`LKR ${item.unit_price.toLocaleString()}`, 165, y + (descriptionHeight / 2), { align: "right" });
    doc.text(`LKR ${item.line_total.toLocaleString()}`, 192, y + (descriptionHeight / 2), { align: "right" });
    y += descriptionHeight;
  }
  
  return y;
}

function drawSummary(doc: jsPDF, payload: PartnerDocumentPayload, startY: number): number {
  let y = startY;
  
  if (y > 270) {
    y = addNewPage(doc, y);
  }
  
  y += 8;
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMARY", 18, y + 6);
  y += 10;

  const total = payload.basePrice + payload.registrationFee - (payload.discount || 0);
  const balance = total - payload.advancePayment;
  const summaryRows = [
    { label: "Base Price", value: payload.basePrice },
    { label: "Registration Fee", value: payload.registrationFee },
    { label: "Discount", value: payload.discount || 0, negative: true },
    { label: "Advance Payment", value: payload.advancePayment, negative: true },
    { label: "Balance Due", value: balance },
    { label: "Total Amount", value: total, bold: true },
  ];

  for (const row of summaryRows) {
    if (y > 275) {
      y = addNewPage(doc, y);
    }
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(row.label, 20, y + 6);
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    const valueText = `LKR ${row.value.toLocaleString()}`;
    doc.text(row.negative ? `- ${valueText}` : valueText, 192, y + 6, { align: "right" });
    y += 10;
  }

  if (payload.paymentMethod) {
    if (y > 280) {
      y = addNewPage(doc, y);
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Payment Method: ${payload.paymentMethod}`, 20, y + 8);
    y += 15;
  }
  
  return y;
}

function drawFooter(doc: jsPDF, currentPage: number, totalPages: number) {
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Page ${currentPage} of ${totalPages}`, 105, pageHeight - 10, { align: "center" });
  
  doc.line(15, pageHeight - 20, 195, pageHeight - 20);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("AVANT signature builds", 15, pageHeight - 12);
  doc.setFont("helvetica", "normal");
  doc.text("613 Bangalawa junction, Ethu Kotte, Kotte", 15, pageHeight - 6);
  doc.text("0777 411 011", 195, pageHeight - 12, { align: "right" });
}

async function generatePartnerDocument({
  payload,
  kind,
}: {
  payload: PartnerDocumentPayload;
  kind: "quotation" | "performer";
}) {
  const doc = new jsPDF("p", "mm", "a4");
  await loadLogo(doc);
  
  let currentPage = 1;
  let y = 20;
  
  // Draw header
  y = await drawHeader(doc, kind, payload, y);
  
  // Draw dealer details
  y = drawDealerDetails(doc, payload, y);
  
  // Draw customer details
  y = drawCustomerDetails(doc, payload, y);
  
  // Draw items table
  y = drawItemsTable(doc, payload, y);
  
  // Draw summary
  y = drawSummary(doc, payload, y);
  
  // Get total pages and add footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }
  
  const fileName = `${payload.targetType === "dealer" ? "Dealer" : "Showroom"}_${kind === "quotation" ? "Quotation" : "Performer_Invoice"}_${payload.targetCode}.pdf`;
  doc.save(fileName);
}

export async function generatePartnerQuotationPdf(payload: PartnerDocumentPayload) {
  await generatePartnerDocument({ payload, kind: "quotation" });
}

export async function generatePartnerPerformerInvoicePdf(payload: PartnerDocumentPayload) {
  await generatePartnerDocument({ payload, kind: "performer" });
}