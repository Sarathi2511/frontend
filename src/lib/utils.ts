import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Order, OrderItem } from './types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to generate and download order PDF
export const generateOrderPDF = (order: Order) => {
  try {
    // Initialize jsPDF
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Order Details', 14, 22);
    
    // Add order info
    doc.setFontSize(12);
    doc.text(`Order Number: ${order.orderNumber || (order._id ? order._id.substring(0, 8) : 'N/A')}`, 14, 35);
    doc.text(`Date: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}`, 14, 42);
    
    // Add customer info
    doc.setFontSize(14);
    doc.text('Customer Information', 14, 55);
    doc.setFontSize(12);
    doc.text(`Name: ${order.customerName || 'N/A'}`, 14, 65);
    
    let lineY = 72;
    if (order.customerEmail) {
      doc.text(`Email: ${order.customerEmail}`, 14, lineY);
      lineY += 7;
    }
    
    if (order.customerPhone) {
      doc.text(`Phone: ${order.customerPhone}`, 14, lineY);
      lineY += 7;
    }
    
    if (order.customerAddress) {
      // Handle address with proper formatting
      doc.text('Address:', 14, lineY);
      lineY += 7;
      
      // Split address into multiple lines if needed
      const addressLines = order.customerAddress.split(',');
      addressLines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          doc.text(trimmedLine, 24, lineY + (index * 6));
        }
      });
      
      // Adjust the Y position based on address length
      lineY += Math.max(8, addressLines.length * 6 + 2);
    } else {
      lineY += 7;
    }
    
    // Order items table
    doc.setFontSize(14);
    doc.text('Order Items', 14, lineY + 8);
    
    // Format table data
    const items = order.orderItems || order.items || [];
    const tableBody = items.map((item: OrderItem) => [
      item.productName || 'Unknown Product',
      item.quantity?.toString() || '0',
      item.dimension || 'Pc',
      `₹${(item.price || 0).toLocaleString()}`,
      `₹${((item.price || 0) * (item.quantity || 0)).toLocaleString()}`
    ]);
    
    // Add items table
    autoTable(doc, {
      startY: lineY + 13,
      head: [['Item', 'Quantity', 'Unit', 'Price', 'Total']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [66, 66, 66] }
    });
    
    // Add total
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Total Amount: ₹${(order.total || 0).toLocaleString()}`, 14, finalY);
    
    // Add payment status
    const paymentStatus = order.paymentStatus 
      ? order.paymentStatus.toUpperCase() 
      : order.isPaid 
        ? 'PAID' 
        : 'UNPAID';
    doc.text(`Payment Status: ${paymentStatus}`, 14, finalY + 7);
    
    // Add notes if available
    if (order.notes) {
      doc.setFontSize(14);
      doc.text('Notes', 14, finalY + 20);
      doc.setFontSize(12);
      doc.text(order.notes, 14, finalY + 30);
    }
    
    // Save the PDF
    doc.save(`Order-${order.orderNumber || (order._id ? order._id.substring(0, 8) : 'order')}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('There was an error generating the PDF. Please try again.');
  }
};
