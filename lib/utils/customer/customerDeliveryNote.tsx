import jsPDF from "jspdf";

import {
  buildSalesItemDetails,
  buildSalesItemIdentifier,
  checkExistingSalesDocument,
  saveSalesDocumentReference,
  type SalesPdfItem,
} from "@/lib/utils/sales/pdf-helpers";

type CustomerDeliveryData = {
  id?: string;
  created_at?: string;
  customer_id?: string;
  target_code?: string;
  reference_no?: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    phone_number?: string;
    address?: string | null;
    nic?: string | null;
  };
  items: SalesPdfItem[];
};

const generateCustomerDeliveryNotePdf = async (
  deliveryData: CustomerDeliveryData,
  returnPdfData: boolean = false
) => {
  const doc = new jsPDF("p", "mm", "a4");
  const documentNumber = `CUSTOMER-DN-${deliveryData.target_code || "SALE"}-${deliveryData.id || Date.now()}`;

  if (!returnPdfData && deliveryData.customer_id) {
    try {
      const exists = await checkExistingSalesDocument({
        endpoint: "/api/sales/customer-documents",
        idKey: "customer_id",
        idValue: deliveryData.customer_id,
        documentType: "delivery_note",
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
  doc.text("DELIVERY NOTE", 105, 25, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Delivery No:", 140, 16);
  doc.text("Date:", 140, 22);
  doc.text("Reference No:", 140, 28);

  doc.setFont("helvetica", "bold");
  doc.text(documentNumber, 165, 16);
  doc.text(new Date(deliveryData.created_at || Date.now()).toLocaleDateString(), 165, 22);
  doc.text(deliveryData.reference_no || "-", 165, 28);
  doc.setFont("helvetica", "normal");
  doc.text("Print Date:", 15, 35);
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString(), 40, 35);
  doc.line(15, 38, 195, 38);

  let y = 50;
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DELIVERY TO", 18, y + 6);
  y += 10;

  const customer = deliveryData.customer;
  const customerInfo = [
    { label: "Customer Name", value: `${customer?.first_name || ""} ${customer?.last_name || ""}`.trim() || "-" },
    { label: "Phone", value: customer?.phone_number || "-" },
    { label: "NIC", value: customer?.nic || "-" },
    { label: "Address", value: customer?.address || "-" },
  ];

  for (const info of customerInfo) {
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
  doc.text("ITEMS DELIVERED", 18, y + 6);
  y += 10;

  doc.setFillColor(200, 200, 200);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Type", 18, y + 6);
  doc.text("Model", 38, y + 6);
  doc.text("Identifier", 115, y + 6);
  doc.text("Status", 190, y + 6, { align: "right" });
  y += 10;

  for (const item of deliveryData.items || []) {
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
    doc.text("Delivered", 190, y + 4.5, { align: "right" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.text(buildSalesItemDetails(item).slice(0, 70), 38, y + 9.5);
    y += 12;
  }

  y += 8;
  doc.rect(15, y, 85, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Receiver's Signature", 20, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text("Name:", 20, y + 18);
  doc.text("Date:", 20, y + 26);

  doc.rect(110, y, 85, 30);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signature", 115, y + 8);
  doc.setFont("helvetica", "normal");
  doc.text("Name:", 115, y + 18);
  doc.text("Date:", 115, y + 26);

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

  doc.save(`Customer_DeliveryNote_${deliveryData.id}.pdf`);

  if (deliveryData.customer_id) {
    await saveSalesDocumentReference({
      endpoint: "/api/sales/customer-documents",
      buyerKey: "customer_id",
      buyerId: deliveryData.customer_id,
      documentType: "delivery_note",
      documentNumber,
      documentData: {
        ...deliveryData,
        document_number: documentNumber,
        generated_at: new Date().toISOString(),
        group_key: deliveryData.id,
      },
    }).catch((error) => console.error("Error saving document reference:", error));
  }
};

export default generateCustomerDeliveryNotePdf;
