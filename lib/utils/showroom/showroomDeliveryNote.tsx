import jsPDF from "jspdf";

interface ShowroomDeliveryData {
  id?: string;
  created_at?: string;
  showroom_code: string;
  items: Array<{
    type: "Bike" | "Spare";
    model_code: string;
    identifier: string;
    price: number;
  }>;
  reference_no?: string;
  expected_delivery_date?: string;
  delivery_method?: string;
  tracking_number?: string;
}

const generateShowroomDeliveryNotePdf = async (deliveryData: ShowroomDeliveryData, returnPdfData: boolean = false) => {
  const doc = new jsPDF("p", "mm", "a4");

  // Generate document number
  const documentNumber = `SHOWROOM-DEL-${deliveryData.showroom_code}-${deliveryData.id || Date.now()}`;
  
  // Check if document already exists (only when not returning PDF data)
  if (!returnPdfData) {
    try {
      const checkResponse = await fetch(`/api/warehouse/showroom-documents?showroom_code=${deliveryData.showroom_code}&document_type=delivery_note&document_number=${encodeURIComponent(documentNumber)}`);
      const existingDoc = await checkResponse.json();
      
      if (existingDoc.document) {
        console.log("Document already exists:", existingDoc.document);
        alert("This document has already been generated!");
        return;
      }
    } catch (error) {
      console.error("Error checking existing document:", error);
    }
  }

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
  doc.text("SHOWROOM DELIVERY NOTE", 105, 25, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Delivery No:", 140, 16);
  doc.text("Date:", 140, 22);
  doc.text("Reference No:", 140, 28);

  doc.setFont("helvetica", "bold");
  doc.text(documentNumber, 165, 16);
  doc.text(new Date(deliveryData.created_at || Date.now()).toLocaleDateString(), 165, 22);
  doc.text(deliveryData.reference_no?.toString() || "-", 165, 28);

  doc.setFont("helvetica", "normal");
  doc.text("Print Date:", 15, 35);
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString(), 40, 35);

  doc.line(15, 38, 195, 38);

  // Showroom Details
  let y = 50;

  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DELIVERY TO - SHOWROOM", 18, y + 6);
  y += 10;

  const showroomInfo = [
    { label: "Showroom Code", value: deliveryData.showroom_code || "-" },
    { label: "Type", value: "Showroom" },
  ];

  showroomInfo.forEach((info) => {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(info.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(info.value, 55, y + 6);
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
  items.forEach((item) => {
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

  // Get PDF as buffer
  const pdfBlob = doc.output("blob");
  const pdfBuffer = await pdfBlob.arrayBuffer();

  // If returning PDF data (for batch download)
  if (returnPdfData) {
    return pdfBuffer;
  }

  // Otherwise, download the PDF
  const fileName = `Showroom_DeliveryNote_${deliveryData.showroom_code}_${deliveryData.id}.pdf`;
  doc.save(fileName);

  // Save document reference to database
  try {
    const saveResponse = await fetch("/api/warehouse/showroom-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        showroom_code: deliveryData.showroom_code,
        document_type: "delivery_note",
        document_number: documentNumber,
        document_data: {
          ...deliveryData,
          document_number: documentNumber,
          generated_at: new Date().toISOString(),
          group_key: deliveryData.id,
        },
      }),
    });
    
    const result = await saveResponse.json();
    if (result.exists) {
      console.log("Document reference already exists in database");
    } else if (result.success) {
      console.log("Document reference saved successfully");
    }
  } catch (error) {
    console.error("Error saving document reference:", error);
  }
};

export default generateShowroomDeliveryNotePdf;