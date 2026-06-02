import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

function getReceiptHTML(order: any) {
  const isFood = order.orderType === 'food';
  const isRashan = order.orderType === 'rashan';
  const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();

  const createdAt = new Date(order.createdAt);
  const dateStr = createdAt.toLocaleDateString('en-PK', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = createdAt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });

  const subtotal = Number(order.subtotal || 0);
  const deliveryFee = Number(order.deliveryFee || 0);
  const discount = Number(order.discountAmount || 0);
  const total = Number(order.total || subtotal + deliveryFee - discount);

  const items: any[] = order.items || [];
  const getItemName = (item: any) =>
    isFood
      ? (item.menuItem?.name || item.name || 'Dish')
      : (item.product?.name || item.name || 'Item');
  const getItemUnit = (item: any) => item.product?.unit || item.unit || '';
  const getItemPrice = (item: any) => Number(item.priceAtTime || item.price || 0);

  const brandColor = isFood ? '#C62828' : '#FF4500';
  const brandLabel = isFood ? 'Food Order' : isRashan ? 'Rashan Bulk Order' : 'Mart Order';

  const itemRows = items.map(item => {
    const name = getItemName(item);
    const unit = getItemUnit(item);
    const price = getItemPrice(item);
    const qty = item.quantity || 1;
    const lineTotal = price * qty;
    return `
      <tr>
        <td class="item-name">${name}${unit ? ` <span class="unit">(${unit})</span>` : ''}</td>
        <td class="qty">${qty}</td>
        <td class="price">Rs. ${price.toLocaleString()}</td>
        <td class="total">Rs. ${lineTotal.toLocaleString()}</td>
      </tr>`;
  }).join('');

  const statusBadge = order.status
    ? `<span class="status-badge">${String(order.status).toUpperCase().replace(/_/g, ' ')}</span>`
    : '';

  const addressLine = order.address?.streetAddress
    ? `${order.address.streetAddress}${order.address.city ? ', ' + order.address.city : ''}`
    : 'N/A';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background: #f4f4f4;
      padding: 20px;
      color: #111;
    }

    .page {
      max-width: 700px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    }

    /* ── Hero header ── */
    .hero {
      background: ${brandColor};
      padding: 32px 32px 24px;
      color: #fff;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 160px; height: 160px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
    }
    .hero::after {
      content: '';
      position: absolute;
      bottom: -50px; left: 20px;
      width: 120px; height: 120px;
      border-radius: 50%;
      background: rgba(255,255,255,0.06);
    }
    .brand-name {
      font-size: 28px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 2px;
    }
    .brand-tagline {
      font-size: 12px;
      opacity: 0.8;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .order-id-row {
      margin-top: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .order-id {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .status-badge {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    /* ── Meta grid ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .meta-cell {
      padding: 16px 24px;
      border-right: 1px solid #f0f0f0;
    }
    .meta-cell:nth-child(2) { border-right: none; }
    .meta-cell:nth-child(3) { border-right: 1px solid #f0f0f0; border-top: 1px solid #f0f0f0; }
    .meta-cell:nth-child(4) { border-top: 1px solid #f0f0f0; border-right: none; }
    .meta-label {
      font-size: 10px;
      font-weight: 700;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }
    .meta-value {
      font-size: 14px;
      font-weight: 600;
      color: #111;
    }

    /* ── Order type strip ── */
    .type-strip {
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .type-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: ${brandColor};
    }
    .type-label {
      font-size: 12px;
      font-weight: 700;
      color: ${brandColor};
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }

    /* ── Items table ── */
    .items-section { padding: 0 24px; }
    .items-title {
      font-size: 13px;
      font-weight: 700;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 20px 0 12px;
      border-bottom: 2px solid #f0f0f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      font-size: 11px;
      font-weight: 700;
      color: #bbb;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      padding: 12px 0;
      text-align: left;
      border-bottom: 1px solid #f5f5f5;
    }
    th.right, td.qty, td.price, td.total { text-align: right; }
    td {
      padding: 14px 0;
      border-bottom: 1px solid #f9f9f9;
      font-size: 14px;
      vertical-align: top;
    }
    td.item-name { font-weight: 600; max-width: 280px; }
    td.unit { font-weight: 400; color: #888; font-size: 12px; }
    td.qty { width: 48px; color: #555; }
    td.price { width: 100px; color: #555; }
    td.total { width: 110px; font-weight: 700; color: #111; }
    .unit { font-size: 12px; color: #888; }

    /* ── Summary ── */
    .summary-section {
      padding: 20px 24px 0;
      border-top: 2px solid #f0f0f0;
    }
    .sum-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 14px;
    }
    .sum-row .label { color: #555; }
    .sum-row .value { font-weight: 600; }
    .sum-row.discount .label, .sum-row.discount .value { color: #10B981; }
    .sum-divider {
      border: none;
      border-top: 2px dashed #f0f0f0;
      margin: 8px 0;
    }
    .sum-row.total {
      font-size: 20px;
      font-weight: 900;
      padding: 12px 0;
    }
    .sum-row.total .value { color: ${brandColor}; }

    /* ── Footer ── */
    .footer {
      background: #fafafa;
      border-top: 1px solid #f0f0f0;
      padding: 20px 24px;
      text-align: center;
      margin-top: 24px;
    }
    .footer-brand {
      font-size: 16px;
      font-weight: 800;
      color: ${brandColor};
      margin-bottom: 4px;
    }
    .footer-text {
      font-size: 11px;
      color: #aaa;
      line-height: 1.6;
    }
    .footer-support {
      margin-top: 8px;
      font-size: 12px;
      color: #666;
      font-weight: 600;
    }
    .watermark {
      margin-top: 12px;
      font-size: 10px;
      color: #ccc;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Hero -->
    <div class="hero">
      <div class="brand-name">BaldiaMart</div>
      <div class="brand-tagline">Official Order Receipt</div>
      <div class="order-id-row">
        <div class="order-id">#${orderIdShort}</div>
        ${statusBadge}
      </div>
    </div>

    <!-- Meta -->
    <div class="meta-grid">
      <div class="meta-cell">
        <div class="meta-label">Date &amp; Time</div>
        <div class="meta-value">${dateStr}</div>
        <div style="font-size:12px;color:#888;margin-top:2px">${timeStr}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Customer</div>
        <div class="meta-value">${order.user?.name || 'Customer'}</div>
        <div style="font-size:12px;color:#888;margin-top:2px">${order.user?.phoneNumber || ''}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Delivery Address</div>
        <div class="meta-value">${addressLine}</div>
      </div>
      <div class="meta-cell">
        <div class="meta-label">Payment Method</div>
        <div class="meta-value">${(order.paymentMethod || 'COD').toUpperCase()}</div>
        ${order.paymentStatus ? `<div style="font-size:12px;color:#10B981;margin-top:2px;font-weight:700">${String(order.paymentStatus).toUpperCase()}</div>` : ''}
      </div>
    </div>

    <!-- Order type strip -->
    <div class="type-strip">
      <div class="type-dot"></div>
      <span class="type-label">${brandLabel}</span>
    </div>

    <!-- Items -->
    <div class="items-section">
      <div class="items-title">Order items (${items.length})</div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="right">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows || '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:20px">No items</td></tr>'}
        </tbody>
      </table>
    </div>

    <!-- Summary -->
    <div class="summary-section">
      <div class="sum-row">
        <span class="label">Subtotal (${items.length} items)</span>
        <span class="value">Rs. ${subtotal.toLocaleString()}</span>
      </div>
      <div class="sum-row">
        <span class="label">Delivery fee</span>
        <span class="value">Rs. ${deliveryFee.toLocaleString()}</span>
      </div>
      ${discount > 0 ? `
      <div class="sum-row discount">
        <span class="label">Discount applied</span>
        <span class="value">- Rs. ${discount.toLocaleString()}</span>
      </div>` : ''}
      <hr class="sum-divider" />
      <div class="sum-row total">
        <span>Grand Total</span>
        <span class="value">Rs. ${total.toLocaleString()}</span>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-brand">BaldiaMart</div>
      <div class="footer-text">
        Delivered with care to your doorstep.<br/>
        This is a computer-generated receipt — no signature required.
      </div>
      <div class="footer-support">support@baldiamart.com | +92 300 0000000</div>
      <div class="watermark">baldiamart.com &nbsp;·&nbsp; Baldia Town, Karachi</div>
    </div>
  </div>
</body>
</html>`;
}

export async function generateReceiptPDF(order: any) {
  const dateStr = new Date(order.createdAt).toLocaleDateString('en-PK').replace(/\//g, '-');
  const orderIdShort = (order.id || '').slice(0, 8).toUpperCase();
  const fileName = `BaldiaMart_Receipt_${orderIdShort}_${dateStr}.pdf`;
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
