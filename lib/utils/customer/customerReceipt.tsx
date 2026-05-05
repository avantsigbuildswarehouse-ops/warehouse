import jsPDF from "jspdf";
import QRCode from "qrcode";

const generateCustomerReceiptPdf = async (receiptData: any) => {
  const doc = new jsPDF("p", "mm", "a4");

  // QR Code
  let qrCodeSrc = "";
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://abs-sigma.vercel.app";
    const qrData = `${baseUrl}/customer-receipt/${receiptData.id}`;
    qrCodeSrc = await QRCode.toDataURL(qrData);
  } catch (error) {
    console.error(error);
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
  doc.text("PAYMENT RECEIPT", 105, 25, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Receipt No:", 140, 16);
  doc.text("Date:", 140, 22);
  doc.text("Customer ID:", 140, 28);

  doc.setFont("helvetica", "bold");
  doc.text(receiptData.id?.toString() || "-", 165, 16);
  doc.text(new Date(receiptData.created_at || Date.now()).toLocaleDateString(), 165, 22);
  doc.text(receiptData.customer_id?.toString() || "-", 165, 28);

  doc.setFont("helvetica", "normal");
  doc.text("Print Date:", 15, 35);
  doc.setFont("helvetica", "bold");
  doc.text(new Date().toLocaleDateString(), 40, 35);

  doc.line(15, 38, 195, 38);

  // Receipt Information
  let y = 50;

  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("RECEIPT INFORMATION", 18, y + 6);
  y += 10;

  const receiptInfo = [
    { label: "Quotation Number", value: receiptData.quotation_no?.toString() || "-" },
    { label: "Amount Paid (LKR)", value: receiptData.amount_paid?.toLocaleString() || "0" },
    { label: "Balance Due (LKR)", value: receiptData.balance_due?.toLocaleString() || "0" },
  ];

  receiptInfo.forEach((info) => {
    doc.rect(15, y, 180, 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(info.label, 20, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(info.value, 85, y + 6);
    y += 10;
  });

  y += 8;

  // Customer Details
  doc.setFillColor(230, 230, 230);
  doc.rect(15, y, 180, 10, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("CUSTOMER DETAILS", 18, y + 6);
  y += 10;

  const customer = receiptData.customer;
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

  // QR Code Section
  if (qrCodeSrc) {
    doc.setDrawColor(200, 200, 200);
    doc.rect(150, y, 40, 40);
    doc.addImage(qrCodeSrc, "PNG", 155, y + 5, 30, 30);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text("Scan to verify", 170, y + 45, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Thank You Note
  doc.setFillColor(248, 248, 248);
  doc.rect(15, y, 130, 35, "F");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Thank You!", 20, y + 10);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Thank you for your purchase.", 20, y + 20);
  doc.text("You are a valued customer!", 20, y + 28);

  // Footer
  doc.line(15, 268, 195, 268);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("AVANT signature builds", 15, 276);
  doc.setFont("helvetica", "normal");
  doc.text("613 Bangalawa junction, Ethu Kotte, Kotte", 15, 282);
  doc.text("0777 411 011", 195, 278, { align: "right" });

  doc.save(`Customer_Receipt_${receiptData.id}.pdf`);
};

export default generateCustomerReceiptPdf;