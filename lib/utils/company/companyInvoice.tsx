import jsPDF from "jspdf";

import {
  buildSalesItemDetails,
  buildSalesItemIdentifier,
  checkExistingSalesDocument,
  saveSalesDocumentReference,
  type SalesPdfItem,
} from "@/lib/utils/sales/pdf-helpers";

type CompanyInvoiceData = {
  id?: string;
  created_at?: string;
  company_id?: string;
  target_code?: string;
  target_type?: string;
  company?: {
    company_name?: string;
    company_email?: string;
    company_contact?: string | null;
    address?: string | null;
    br_no?: string | null;
    vat_no?: string | null;
  };
  items: SalesPdfItem[];
  base_price?: number;
  registration_fee?: number;
  discount?: number;
  advance_payment?: number;
  balance_due?: number;
  document_title?: string;
  document_label?: string;
  document_number_prefix?: string;
  sale_stage?: string;
};

const generateCompanyInvoicePdf = async (
  invoiceData: CompanyInvoiceData,
  returnPdfData: boolean = false
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const documentPrefix = invoiceData.document_number_prefix || "COMPANY-INV";
  const documentNumber = `${documentPrefix}-${invoiceData.target_code || "SALE"}-${invoiceData.id || Date.now()}`;

  if (!returnPdfData && invoiceData.company_id) {
    try {
      const exists = await checkExistingSalesDocument({
        endpoint: "/api/sales/company-documents",
        idKey: "company_id",
        idValue: invoiceData.company_id,
        documentType: "invoice",
        documentNumber,
      });
      if (exists) {
        alert("This document has already been generated!");
        return;
      }
    } catch (error) {
      console.error("Error checking existing document:", error);
    }
  }

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

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text(invoiceData.document_title || "TAX INVOICE", 105, 25, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(invoiceData.document_label || "Invoice No:", 140, 16);
  doc.text("Date:", 140, 22);
  doc.text("Due Date:", 140, 28);

  doc.setFont("helvetica", "bold");
  doc.text(documentNumber, 165, 16);
  doc.text(new Date(invoiceData.created_at || Date.now()).toLocaleDateString(), 165, 22);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  doc.text(dueDate.toLocaleDateString(), 165, 28);
  

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
    { label: "BR Number", value: company?.br_no || "-" },
    { label: "VAT Number", value: company?.vat_no || "-" },
    { label: "Contact", value: company?.company_contact || "-" },
    { label: "Email", value: company?.company_email || "-" },
    { label: "Address", value: company?.address || "-" },
  ];

  for (const info of companyInfo) {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(info.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(info.value.slice(0, 55), 55, y + 6);
    y += 10;
  }

  y += 8;
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ITEMS", 18, y + 6);
  y += 10;

  doc.setFillColor(200, 200, 200);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Type", 18, y + 6);
  doc.text("Model", 38, y + 6);
  doc.text("Identifier", 115, y + 6);
  doc.text("Price", 190, y + 6, { align: "right" });
  y += 10;

  for (const item of invoiceData.items || []) {
    if (y > 245) {
      doc.addPage();
      y = 20;
    }
    doc.rect(15, y, 180, 12);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(item.type, 18, y + 4.5);
    doc.text(item.model_code, 38, y + 4.5);
    doc.text(buildSalesItemIdentifier(item), 115, y + 4.5);
    doc.text(`LKR ${(item.price || 0).toLocaleString()}`, 190, y + 4.5, { align: "right" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(buildSalesItemDetails(item).slice(0, 70), 38, y + 9.5);
    y += 12;
  }

  y += 8;
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMARY", 18, y + 6);
  y += 10;

  const basePrice = invoiceData.base_price || 0;
  const registrationFee = invoiceData.registration_fee || 0;
  const discount = invoiceData.discount || 0;
  const total = basePrice + registrationFee - discount;
  const advance = invoiceData.advance_payment || 0;
  const summaryRows = [
    { label: "Base Price", value: basePrice },
    { label: "Registration Fee", value: registrationFee },
    { label: "Discount", value: discount, negative: true },
    { label: "Total Amount", value: total, bold: true },
    ...(advance > 0
      ? [
          { label: "Advance Paid", value: advance, negative: true },
          { label: "Balance Due", value: invoiceData.balance_due ?? total - advance, bold: true },
        ]
      : []),
  ];

  for (const row of summaryRows) {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(row.label, 20, y + 6);
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    const valueText = `LKR ${row.value.toLocaleString()}`;
    doc.text(row.negative ? `- ${valueText}` : valueText, 190, y + 6, { align: "right" });
    y += 10;
  }

  doc.line(15, 268, 195, 268);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("AVANT signature builds", 15, 276);
  doc.setFont("helvetica", "normal");
  doc.text("613 Bangalawa junction, Ethu Kotte, Kotte", 15, 282);
  doc.text("0777 411 011", 195, 278, { align: "right" });

  const pdfBlob = doc.output("blob");
  const pdfBuffer = await pdfBlob.arrayBuffer();
  if (returnPdfData) return pdfBuffer;

  doc.save(`Company_Invoice_${invoiceData.id}.pdf`);

  if (invoiceData.company_id) {
    await saveSalesDocumentReference({
      endpoint: "/api/sales/company-documents",
      buyerKey: "company_id",
      buyerId: invoiceData.company_id,
      documentType: "invoice",
      documentNumber,
      documentData: {
        ...invoiceData,
        document_number: documentNumber,
        generated_at: new Date().toISOString(),
        group_key: invoiceData.id,
        sale_stage: invoiceData.sale_stage || "completed",
      },
    }).catch((error) => console.error("Error saving document reference:", error));
  }
};

export default generateCompanyInvoicePdf;
