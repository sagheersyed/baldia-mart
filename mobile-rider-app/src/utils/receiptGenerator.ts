import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

function getReceiptHTML(order: any) {
  const isFood = order.orderType === 'food';
  const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();
  const dateDisplayStr = new Date(order.createdAt).toLocaleDateString();
  const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #FF4500; padding-bottom: 10px; }
          .logo { font-size: 24px; font-weight: bold; color: #FF4500; }
          .receipt-title { font-size: 18px; margin-top: 5px; color: #666; }
          
          .info-section { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
          .info-box { width: 48%; }
          .info-label { font-weight: bold; color: #888; text-transform: uppercase; font-size: 10px; margin-bottom: 4px; }
          .info-value { margin-bottom: 10px; }

          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; border-bottom: 1px solid #eee; padding: 10px 5px; font-size: 12px; color: #888; text-transform: uppercase; }
          td { padding: 12px 5px; border-bottom: 1px solid #f9f9f9; font-size: 14px; }
          .text-right { text-align: right; }
          
          .summary { margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
          .summary-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .total-row { font-size: 18px; font-weight: bold; margin-top: 10px; color: #000; border-top: 2px solid #f0f0f0; padding-top: 10px; }
          
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #aaa; }
          .footer p { margin: 2px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">BALDIA MART</div>
          <div class="receipt-title">Official Order Receipt</div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <div class="info-label">Order Details</div>
            <div class="info-value">#${orderIdShort}</div>
            <div class="info-label">Date & Time</div>
            <div class="info-value">${dateDisplayStr} at ${timeStr}</div>
            <div class="info-label">Payment Method</div>
            <div class="info-value">${(order.paymentMethod || 'COD').toUpperCase()}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Customer</div>
            <div class="info-value">${order.user?.name || 'Customer'}</div>
            <div class="info-label">Delivery Address</div>
            <div class="info-value">${order.address?.streetAddress || 'Local Area'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item: any) => `
              <tr>
                <td>${isFood ? (item.menuItem?.name || 'Dish') : (item.product?.name || 'Item')}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">Rs. ${item.priceAtTime}</td>
                <td class="text-right">Rs. ${Number(item.priceAtTime) * item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span>Subtotal</span>
            <span>Rs. ${order.subtotal}</span>
          </div>
          <div class="summary-row">
            <span>Delivery Fee</span>
            <span>Rs. ${order.deliveryFee}</span>
          </div>
          ${Number(order.discountAmount || 0) > 0 ? `
            <div class="summary-row" style="color: #2ecc71;">
              <span>Discount</span>
              <span>- Rs. ${order.discountAmount}</span>
            </div>
          ` : ''}
          <div class="summary-row total-row">
            <span>GRAND TOTAL</span>
            <span>Rs. ${Number(order.total).toFixed(0)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for shopping with Baldia Mart!</p>
          <p>This is a computer-generated receipt.</p>
          <p>For support, contact us at support@baldiamart.com</p>
        </div>
      </body>
    </html>
  `;
}

export async function generateReceiptPDF(order: any) {
  const dateStr = new Date(order.createdAt).toLocaleDateString().replace(/\//g, '-');
  const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();
  const fileName = `BaldiaMart_Order_${orderIdShort}_${dateStr}.pdf`;
  const targetFile = new File(Paths.cache, fileName);
  const html = getReceiptHTML(order);

  try {
    const { uri } = await Print.printToFileAsync({ html });
    const tempFile = new File(uri);
    if (targetFile.exists) {
      await targetFile.delete();
    }
    await tempFile.move(targetFile);
    await Sharing.shareAsync(targetFile.uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error('Error generating receipt:', error);
    throw error;
  }
}

export async function printReceipt(order: any) {
  const html = getReceiptHTML(order);
  try {
    await Print.printAsync({ html });
  } catch (error) {
    console.error('Error printing receipt:', error);
    throw error;
  }
}
