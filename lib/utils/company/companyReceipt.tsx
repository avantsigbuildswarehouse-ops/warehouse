import jsPDF from "jspdf";
import QRCode from "qrcode";

import {
  checkExistingSalesDocument,
  saveSalesDocumentReference,
} from "@/lib/utils/sales/pdf-helpers";

type CompanyReceiptData = {
  id?: string;
  created_at?: string;
  company_id?: string;
  target_code?: string;
  invoice_no?: string;
  quotation_no?: string;
  amount_paid: number;
  balance_due: number;
  company?: {
    company_name?: string;
    company_email?: string;
    company_contact?: string | null;
    address?: string | null;
    br_no?: string | null;
    vat_no?: string | null;
  };
};

const generateCompanyReceiptPdf = async (
  receiptData: CompanyReceiptData,
  returnPdfData: boolean = false
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const documentNumber = `COMPANY-RCPT-${receiptData.target_code || "SALE"}-${receiptData.id || Date.now()}`;

  if (!returnPdfData && receiptData.company_id) {
    try {
      const exists = await checkExistingSalesDocument({
        endpoint: "/api/sales/company-documents",
        idKey: "company_id",
        idValue: receiptData.company_id,
        documentType: "receipt",
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

  let qrCodeSrc = "";
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://abs-sigma.vercel.app";
    qrCodeSrc = await QRCode.toDataURL(`${baseUrl}/company-receipt/${receiptData.id}`);
  } catch (error) {
    console.error(error);
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

  // Helper function to format date as DD/MM/YYYY
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("PAYMENT RECEIPT", 105, 20, { align: "center" });
  doc.setFont("helvetica", "normal");

  // Reference Information - Below Logo
  let refY = 40;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Receipt No:", 15, refY);
  doc.text("Date:", 15, refY + 6);
  doc.text("Company ID:", 15, refY + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  const docNumLines = doc.splitTextToSize(documentNumber, 90);
  doc.text(docNumLines, 55, refY);
  
  doc.setFontSize(8);
  doc.text(formatDate(new Date(receiptData.created_at || Date.now())), 55, refY + 6);
  doc.text(receiptData.company_id || "-", 55, refY + 12);

  doc.line(15, refY + 18, 195, refY + 18);

  let y = 62;
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT INFORMATION", 18, y + 6);
  y += 10;

  const receiptInfo = [
    { label: "Invoice Number", value: receiptData.invoice_no || "-" },
    { label: "Quotation Number", value: receiptData.quotation_no || "-" },
    { label: "Amount Paid (LKR)", value: receiptData.amount_paid.toLocaleString() },
    { label: "Balance Due (LKR)", value: receiptData.balance_due.toLocaleString() },
  ];

  for (const info of receiptInfo) {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(info.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(info.value, 85, y + 6);
    y += 10;
  }

  y += 8;
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("COMPANY DETAILS", 18, y + 6);
  y += 10;

  const company = receiptData.company;
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
  if (qrCodeSrc) {
    doc.setDrawColor(200, 200, 200);
    doc.rect(150, y, 40, 40);
    doc.addImage(qrCodeSrc, "PNG", 155, y + 5, 30, 30);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.text("Scan to verify", 170, y + 37, { align: "center" });
  }

  doc.setFillColor(248, 248, 248);
  doc.rect(15, y, 130, 35, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Thank You!", 20, y + 10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your payment.", 20, y + 20);
  doc.text("You are a valued customer!", 20, y + 28);

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

  doc.save(`Company_Receipt_${receiptData.id}.pdf`);

  if (receiptData.company_id) {
    await saveSalesDocumentReference({
      endpoint: "/api/sales/company-documents",
      buyerKey: "company_id",
      buyerId: receiptData.company_id,
      documentType: "receipt",
      documentNumber,
      documentData: {
        ...receiptData,
        document_number: documentNumber,
        generated_at: new Date().toISOString(),
        group_key: receiptData.id,
      },
    }).catch((error) => console.error("Error saving document reference:", error));
  }
};

export default generateCompanyReceiptPdf;
