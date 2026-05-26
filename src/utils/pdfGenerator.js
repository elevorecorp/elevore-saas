import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateQuotePDF = (quoteData) => {
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString();

  // Color principal (Amber-500 equivalent)
  const primaryColor = [245, 158, 11]; // rgb for #F59E0B

  // HEADER
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('ELEVORE EMPIRE', 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('PREMIUM CLEANING SERVICES', 15, 32);

  doc.setFontSize(20);
  doc.text('QUOTE', 170, 25);
  doc.setFontSize(10);
  doc.text(`Date: ${dateStr}`, 170, 32);

  // CLIENT DETAILS
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PREPARED FOR:', 15, 55);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${quoteData.name || 'Valued Client'}`, 15, 65);
  doc.text(`Phone: ${quoteData.phone || 'N/A'}`, 15, 72);
  doc.text(`Address: ${quoteData.address || 'N/A'}`, 15, 79);

  // QUOTE DETAILS TABLE
  const tableData = [
    ['Service Type', quoteData.svc.toUpperCase()],
  ];

  if (quoteData.svc === 'postcon') {
    tableData.push(['Square Footage', `${quoteData.sqft} SqFt`]);
  } else {
    tableData.push(['Bedrooms', quoteData.beds.toString()]);
    tableData.push(['Bathrooms', quoteData.baths.toString()]);
  }

  doc.autoTable({
    startY: 95,
    head: [['Description', 'Details']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 11, cellPadding: 6 },
    columnStyles: { 0: { fontStyle: 'bold' } }
  });

  // TOTAL
  const finalY = doc.lastAutoTable.finalY || 130;
  
  doc.setFillColor(245, 245, 245);
  doc.rect(120, finalY + 10, 75, 25, 'F');
  
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTIMATED TOTAL:', 125, finalY + 20);
  
  doc.setTextColor(...primaryColor);
  doc.setFontSize(18);
  doc.text(`$${quoteData.qp}`, 165, finalY + 27);

  // FOOTER
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for choosing Elevore Empire.', 105, 280, null, null, 'center');
  doc.text('This quote is valid for 30 days and is subject to in-person verification.', 105, 285, null, null, 'center');

  // SAVE
  doc.save(`Elevore_Quote_${quoteData.name ? quoteData.name.replace(/\s+/g, '_') : 'Client'}.pdf`);
};
