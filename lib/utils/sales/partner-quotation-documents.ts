import jsPDF from "jspdf";

export type PartnerQuotationItem = {
  type: "Bike" | "Spare";
  model_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
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

async function generatePartnerDocument({
  payload,
  kind,
}: {
  payload: PartnerDocumentPayload;
  kind: "quotation" | "performer";
}) {
  const doc = new jsPDF("p", "mm", "a4");
  await loadLogo(doc);

  const documentPrefix = `${payload.targetType.toUpperCase()}-${kind === "quotation" ? "QUOT" : "PERFORMER"}`;
  const documentNumber = `${documentPrefix}-${payload.targetCode}-${Date.now()}`;
  const createdAt = new Date(payload.createdAt || Date.now());
  const dueDate = new Date(createdAt);
  dueDate.setDate(dueDate.getDate() + 30);

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text(kind === "quotation" ? "QUOTATION" : "PERFORMER INVOICE", 105, 20, { align: "center" });

  const refY = 40;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(kind === "quotation" ? "Quotation No:" : "Performer Invoice No:", 15, refY);
  doc.text("Date:", 15, refY + 6);
  doc.text(kind === "quotation" ? "Valid Until:" : "Due Date:", 15, refY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(doc.splitTextToSize(documentNumber, 90), 55, refY);
  doc.setFontSize(8);
  doc.text(formatDate(createdAt), 55, refY + 6);
  doc.text(formatDate(dueDate), 55, refY + 12);
  doc.line(15, refY + 18, 195, refY + 18);

  let y = 62;
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(payload.targetType === "dealer" ? "DEALER DETAILS" : "SHOWROOM DETAILS", 18, y + 6);
  y += 10;

  [
    {
      label: payload.targetType === "dealer" ? "Dealer Code" : "Showroom Code",
      value: payload.targetCode,
    },
    {
      label: "Type",
      value: payload.targetType === "dealer" ? "Dealer" : "Showroom",
    },
  ].forEach((row) => {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(row.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(row.value, 58, y + 6);
    y += 10;
  });

  y += 8;
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ITEMS", 18, y + 6);
  y += 10;

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
    if (y > 245) {
      doc.addPage();
      y = 20;
    }

    doc.rect(15, y, 180, 12);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(item.type, 18, y + 4.5);
    doc.text(item.model_code, 35, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(item.description, 72), 68, y + 4.5);
    doc.text(String(item.quantity), 145, y + 4.5);
    doc.text(`LKR ${item.unit_price.toLocaleString()}`, 165, y + 4.5, { align: "right" });
    doc.text(`LKR ${item.line_total.toLocaleString()}`, 192, y + 4.5, { align: "right" });
    y += 12;
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
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Payment Method: ${payload.paymentMethod}`, 20, y + 8);
  }

  doc.line(15, 268, 195, 268);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("AVANT signature builds", 15, 276);
  doc.setFont("helvetica", "normal");
  doc.text("613 Bangalawa junction, Ethu Kotte, Kotte", 15, 282);
  doc.text("0777 411 011", 195, 278, { align: "right" });

  const fileName = `${payload.targetType === "dealer" ? "Dealer" : "Showroom"}_${kind === "quotation" ? "Quotation" : "Performer_Invoice"}_${payload.targetCode}.pdf`;
  doc.save(fileName);
}

export async function generatePartnerQuotationPdf(payload: PartnerDocumentPayload) {
  await generatePartnerDocument({ payload, kind: "quotation" });
}

export async function generatePartnerPerformerInvoicePdf(payload: PartnerDocumentPayload) {
  await generatePartnerDocument({ payload, kind: "performer" });
}
