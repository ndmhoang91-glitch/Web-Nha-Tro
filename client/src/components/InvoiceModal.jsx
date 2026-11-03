import React, { useState } from 'react';
import { X, Printer, Copy, Check, QrCode, CreditCard, ShieldCheck, Download, AlertCircle, FileText } from 'lucide-react';
import { formatVND, getVietQRUrl, quickPayInvoice } from '../api';

export default function InvoiceModal({
  invoice,
  settings = {},
  onClose,
  onRefresh,
  onOpenProofModal
}) {
  const [copiedZalo, setCopiedZalo] = useState(false);
  const [quickPaying, setQuickPaying] = useState(false);
  const [viewMode, setViewMode] = useState('ALL'); // 'ALL', 'ROOM_ONLY', 'UTILITIES_ONLY'

  if (!invoice) return null;

  const roomRentTotal = (Number(invoice.roomPrice) || 0) + (Number(invoice.wifiFee) || 0);
  const utilitiesTotal = (Number(invoice.electricityCost) || 0) + (Number(invoice.waterCost) || 0) + (Number(invoice.totalExtraFee) || 0) - (Number(invoice.discount) || 0);

  const displayTotal = viewMode === 'ROOM_ONLY'
    ? roomRentTotal
    : viewMode === 'UTILITIES_ONLY'
    ? Math.max(0, utilitiesTotal)
    : invoice.totalAmount;

  // Tính số tiền cần thanh toán cho từng chế độ
  const displayRemaining = viewMode === 'ROOM_ONLY'
    ? (invoice.paidAmount >= roomRentTotal ? 0 : roomRentTotal - invoice.paidAmount)
    : viewMode === 'UTILITIES_ONLY'
    ? (invoice.paidAmount >= invoice.totalAmount ? 0 : Math.max(0, invoice.remainingAmount))
    : invoice.remainingAmount;

  const qrAmount = displayRemaining > 0 ? displayRemaining : displayTotal;

  const memoType = viewMode === 'ROOM_ONLY' ? 'TIEN PHONG' : viewMode === 'UTILITIES_ONLY' ? 'DIEN NUOC' : 'TIEN TRO';
  const qrUrl = getVietQRUrl(
    settings.bankName,
    settings.bankAccount,
    settings.bankOwner,
    qrAmount,
    `${invoice.roomName?.replace(/[^0-9]/g, 'P') || 'P'} ${memoType} T${invoice.month?.replace('-', '')}`
  );

  const rentDay = invoice.rentDueDay || (invoice.schedule?.actualRentDay) || '10';
  const rentCycleStr = invoice.rentCycleStr || (invoice.schedule?.rentCycleStr) || '1 tháng';

  const handleCopyZalo = () => {
    let text = '';
    if (viewMode === 'ROOM_ONLY') {
      text = `🏠 THÔNG BÁO TIỀN PHÒNG THÁNG ${invoice.month?.slice(5)}/${invoice.month?.slice(0, 4)} - ${invoice.roomName}
👤 Khách thuê: ${invoice.tenantName || 'Anh/Chị'}
------------------------------------
1️⃣ Tiền thuê phòng: ${formatVND(invoice.roomPrice)}
   (Kỳ thuê: ${rentCycleStr} • Thu đúng ngày ${rentDay} hàng tháng theo HĐ)
2️⃣ Phí Internet/Wifi: ${formatVND(invoice.wifiFee)}
------------------------------------
👉 TỔNG TIỀN PHÒNG: ${formatVND(roomRentTotal)}
⏰ HẠN THANH TOÁN: Đúng ngày ${rentDay} hàng tháng theo HĐ
⚡ Tiền điện và nước chốt vào ngày 1 Tây hàng tháng sẽ gửi thông báo riêng.
------------------------------------
💳 THÔNG TIN CHUYỂN KHOẢN:
- Ngân hàng: ${settings.bankName}
- Số tài khoản: ${settings.bankAccount}
- Chủ tài khoản: ${settings.bankOwner}
- Số tiền: ${formatVND(roomRentTotal)}
- Nội dung: ${invoice.roomName?.replace(/[^0-9]/g, 'P')} TIEN PHONG T${invoice.month?.replace('-', '')}
Cảm ơn anh/chị!`;
    } else if (viewMode === 'UTILITIES_ONLY') {
      text = `⚡ THÔNG BÁO TIỀN ĐIỆN & NƯỚC THÁNG ${invoice.month?.slice(5)}/${invoice.month?.slice(0, 4)} - ${invoice.roomName}
👤 Khách thuê: ${invoice.tenantName || 'Anh/Chị'}
------------------------------------
1️⃣ Tiền điện (Chốt ngày 1 Tây: ${invoice.oldElectricity} ➡️ ${invoice.newElectricity} = ${invoice.electricityUsage} kWh x ${formatVND(invoice.electricityPrice)}): ${formatVND(invoice.electricityCost)}
2️⃣ Tiền nước (Chốt ngày 20 Tây: ${invoice.oldWater} ➡️ ${invoice.newWater} = ${invoice.waterUsage} m³ x ${formatVND(invoice.waterPrice)}): ${formatVND(invoice.waterCost)}
${invoice.extraFees && invoice.extraFees.length > 0 ? invoice.extraFees.map(f => `3️⃣ ${f.name}: ${formatVND(f.amount)}`).join('\n') : ''}
------------------------------------
👉 TỔNG TIỀN ĐIỆN NƯỚC: ${formatVND(utilitiesTotal)}
⏰ HẠN THANH TOÁN: Thu đầu tháng (ngày 1 Tây)
------------------------------------
💳 THÔNG TIN CHUYỂN KHOẢN:
- Ngân hàng: ${settings.bankName}
- Số tài khoản: ${settings.bankAccount}
- Chủ tài khoản: ${settings.bankOwner}
- Số tiền: ${formatVND(utilitiesTotal)}
- Nội dung: ${invoice.roomName?.replace(/[^0-9]/g, 'P')} DIEN NUOC T${invoice.month?.replace('-', '')}
Cảm ơn anh/chị!`;
    } else {
      text = `🏠 THÔNG BÁO TIỀN TRỌ & DỊCH VỤ THÁNG ${invoice.month?.slice(5)}/${invoice.month?.slice(0, 4)} - ${invoice.roomName}
👤 Khách thuê: ${invoice.tenantName || 'Anh/Chị'}
------------------------------------
1️⃣ Tiền thuê phòng: ${formatVND(invoice.roomPrice)}
   (Kỳ thuê: ${rentCycleStr} • Thu đúng ngày ${rentDay} hàng tháng theo HĐ)
2️⃣ Tiền điện (Chốt ngày 1 Tây: ${invoice.oldElectricity} ➡️ ${invoice.newElectricity} = ${invoice.electricityUsage} kWh x ${formatVND(invoice.electricityPrice)}): ${formatVND(invoice.electricityCost)}
3️⃣ Tiền nước (Chốt ngày 20 Tây: ${invoice.oldWater} ➡️ ${invoice.newWater} = ${invoice.waterUsage} m³ x ${formatVND(invoice.waterPrice)}): ${formatVND(invoice.waterCost)}
4️⃣ Phí Internet/Wifi: ${formatVND(invoice.wifiFee)}
${invoice.extraFees && invoice.extraFees.length > 0 ? invoice.extraFees.map(f => `5️⃣ ${f.name}: ${formatVND(f.amount)}`).join('\n') : ''}
${invoice.discount > 0 ? `🔻 Giảm trừ: -${formatVND(invoice.discount)}` : ''}
------------------------------------
👉 TỔNG TIỀN PHẢI NỘP: ${formatVND(invoice.totalAmount)}
${invoice.paidAmount > 0 ? `✅ Đã thanh toán: ${formatVND(invoice.paidAmount)}\n⏳ CÒN LẠI: ${formatVND(invoice.remainingAmount)}` : ''}
------------------------------------
⏰ LỊCH VÀ HẠN THANH TOÁN:
- 🏠 Tiền phòng: Thu đúng ngày ${rentDay} hàng tháng (kỳ ${rentCycleStr})
- ⚡ Tiền điện & nước: Chốt và thu đầu tháng (ngày 1 Tây)
💳 THÔNG TIN CHUYỂN KHOẢN:
- Ngân hàng: ${settings.bankName}
- Số tài khoản: ${settings.bankAccount}
- Chủ tài khoản: ${settings.bankOwner}
- Nội dung: ${invoice.roomName?.replace(/[^0-9]/g, 'P')} TIEN TRO T${invoice.month?.replace('-', '')}
Cảm ơn anh/chị!`;
    }

    navigator.clipboard.writeText(text);
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  const handleQuickPay = async (type = 'ALL', method = 'CASH') => {
    let amountToPay = invoice.remainingAmount;
    let label = 'toàn bộ hóa đơn';

    if (type === 'ROOM_ONLY') {
      amountToPay = invoice.paidAmount >= roomRentTotal ? 0 : roomRentTotal - invoice.paidAmount;
      label = `tiền phòng (${formatVND(amountToPay)})`;
    } else if (type === 'UTILITIES_ONLY') {
      amountToPay = invoice.remainingAmount;
      label = `tiền điện nước (${formatVND(amountToPay)})`;
    }

    if (amountToPay <= 0) {
      alert('Khoản này đã được thanh toán đầy đủ!');
      return;
    }

    if (!confirm(`Xác nhận đã nhận ${label} từ ${invoice.roomName}?`)) return;
    setQuickPaying(true);
    try {
      await quickPayInvoice(invoice.id, {
        paymentMethod: method,
        amount: amountToPay,
        note: `Chủ trọ xác nhận nhận ${type === 'ROOM_ONLY' ? 'tiền phòng theo ngày HĐ' : type === 'UTILITIES_ONLY' ? 'tiền điện nước 1 Tây' : 'thanh toán'} (${method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'})`
      });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setQuickPaying(false);
    }
  };

  const handlePrintWindow = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=950');
    if (!printWindow) {
      window.print();
      return;
    }

    const rentDay = invoice.rentDueDay || (invoice.schedule?.actualRentDay) || 1;
    const rentCycleStr = invoice.rentCycleStr || (invoice.schedule?.rentCycleStr) || '1 tháng';

    const extraFeesRows = (invoice.extraFees || []).map((f, i) => `
      <tr>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1;">5.${i + 1}. ${f.name}</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; color: #94a3b8;">---</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center;">Cố định</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatVND(f.amount)}</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatVND(f.amount)}</td>
      </tr>
    `).join('');

    const discountRow = invoice.discount > 0 ? `
      <tr style="color: #15803d; background: #f0fdf4;">
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1;">Giảm trừ / Khuyến mãi</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center;">---</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center;">---</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">-${formatVND(invoice.discount)}</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">-${formatVND(invoice.discount)}</td>
      </tr>
    ` : '';

    const paidRow = invoice.paidAmount > 0 ? `
      <tr style="background: #f8fafc;">
        <td colspan="4" style="padding: 8px; text-align: right; font-weight: bold; color: #16a34a; border: 1px solid #cbd5e1;">Đã thanh toán:</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: #16a34a; border: 1px solid #cbd5e1;">${formatVND(invoice.paidAmount)}</td>
      </tr>
    ` : '';

    const remainingRow = (invoice.remainingAmount > 0 && invoice.paidAmount > 0) ? `
      <tr style="background: #fff1f2;">
        <td colspan="4" style="padding: 8px; text-align: right; font-weight: bold; color: #e11d48; border: 1px solid #cbd5e1;">Còn nợ lại:</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: #e11d48; border: 1px solid #cbd5e1;">${formatVND(invoice.remainingAmount)}</td>
      </tr>
    ` : '';

    const billTitle = viewMode === 'ROOM_ONLY'
      ? 'PHIẾU THU TIỀN PHÒNG (KỲ KÝ HỢP ĐỒNG)'
      : viewMode === 'UTILITIES_ONLY'
      ? 'PHIẾU THU TIỀN ĐIỆN & NƯỚC (CHỐT ĐẦU THÁNG)'
      : 'HÓA ĐƠN TIỀN TRỌ & DỊCH VỤ';

    const showRoom = viewMode === 'ALL' || viewMode === 'ROOM_ONLY';
    const showUtilities = viewMode === 'ALL' || viewMode === 'UTILITIES_ONLY';

    const roomPriceRow = showRoom ? `
      <tr>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1;">
          <div style="font-weight: bold;">1. Tiền thuê phòng</div>
          <div style="font-size: 11px; color: #0284c7;">Kỳ: ${rentCycleStr} (Thu đúng ngày ${rentDay} hàng tháng theo HĐ)</div>
        </td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; color: #94a3b8;">---</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center;">1 tháng</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatVND(invoice.roomPrice)}</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatVND(invoice.roomPrice)}</td>
      </tr>
      <tr>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1;"><div style="font-weight: bold;">2. Phí Wifi Internet</div></td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; color: #94a3b8;">---</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center;">1 phòng</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatVND(invoice.wifiFee)}</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatVND(invoice.wifiFee)}</td>
      </tr>
    ` : '';

    const utilitiesRows = showUtilities ? `
      <tr>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1;">
          <div style="font-weight: bold;">${showRoom ? '3. Tiền điện' : '1. Tiền điện'}</div>
          <div style="font-size: 11px; color: #64748b;">Đồng hồ riêng • Chốt ngày 1 Tây</div>
        </td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${invoice.oldElectricity} ➔ ${invoice.newElectricity}</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #2563eb;">${invoice.electricityUsage} kWh</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatVND(invoice.electricityPrice)}</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatVND(invoice.electricityCost)}</td>
      </tr>
      <tr>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1;">
          <div style="font-weight: bold;">${showRoom ? '4. Tiền nước' : '2. Tiền nước'}</div>
          <div style="font-size: 11px; color: #64748b;">Đồng hồ riêng • Chốt ngày 20 Tây</div>
        </td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${invoice.oldWater} ➔ ${invoice.newWater}</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0891b2;">${invoice.waterUsage} m³</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatVND(invoice.waterPrice)}</td>
        <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatVND(invoice.waterCost)}</td>
      </tr>
      ${extraFeesRows}
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${billTitle} - ${invoice.roomName || ''}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px dashed #94a3b8; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; text-transform: uppercase; }
          .subtitle { font-size: 12px; color: #475569; margin: 2px 0; }
          .badge { display: inline-block; padding: 4px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold; }
          .bill-tag { display: inline-block; padding: 3px 8px; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-weight: bold; font-size: 11px; margin-top: 4px; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 12px; font-weight: bold; color: #334155; }
          .total-row { background: #0f172a; color: #ffffff; font-weight: bold; }
          .total-row td { border: 1px solid #0f172a; color: #ffffff; }
          .qr-section { display: flex; align-items: center; gap: 15px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
          .qr-img { width: 110px; height: 110px; object-fit: contain; background: white; padding: 4px; border-radius: 6px; border: 1px solid #dbeafe; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 25px; page-break-inside: avoid; }
          .stamp { border: 2px solid #16a34a; color: #16a34a; font-weight: 800; font-size: 13px; display: inline-block; padding: 4px 12px; transform: rotate(-5deg); border-radius: 4px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${settings.houseName || 'HỆ THỐNG NHÀ TRỌ'}</h1>
            <div class="bill-tag">${billTitle}</div>
            <p class="subtitle" style="margin-top: 6px;">Địa chỉ: <strong>${settings.address || ''}</strong></p>
            <p class="subtitle">Chủ trọ: <strong>${settings.landlordName || ''}</strong> - Hotline: <strong>${settings.landlordPhone || ''}</strong></p>
          </div>
          <div style="text-align: right;">
            <div class="badge">${invoice.invoiceCode || ''}</div>
            <p class="subtitle" style="margin-top: 6px;">Kỳ thu: <strong>Tháng ${invoice.month?.slice(5)}/${invoice.month?.slice(0, 4)}</strong></p>
          </div>
        </div>

        <div class="info-box">
          <div>Phòng thuê: <strong style="font-size: 14px; color: #0284c7;">${invoice.roomName || ''}</strong></div>
          <div>Đại diện phòng: <strong>${invoice.tenantName || 'Khách thuê'}</strong></div>
          <div>Số điện thoại: <strong>${invoice.tenantPhone || '---'}</strong></div>
          <div>Hạn thu tiền phòng: <strong>Ngày ${rentDay} hàng tháng (${rentCycleStr})</strong></div>
          <div>Hạn thu điện nước: <strong>Ngày 1 Tây hàng tháng</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Khoản mục</th>
              <th style="text-align: center; border: 1px solid #cbd5e1; padding: 10px 8px;">Số cũ ➔ mới</th>
              <th style="text-align: center; border: 1px solid #cbd5e1; padding: 10px 8px;">Tiêu thụ</th>
              <th style="text-align: right; border: 1px solid #cbd5e1; padding: 10px 8px;">Đơn giá</th>
              <th style="text-align: right; border: 1px solid #cbd5e1; padding: 10px 8px;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${roomPriceRow}
            ${utilitiesRows}
            ${discountRow}
            <tr class="total-row">
              <td colspan="4" style="padding: 12px; text-align: right; font-size: 13px;">TỔNG CỘNG TIỀN PHẢI NỘP:</td>
              <td style="padding: 12px; text-align: right; font-size: 16px; color: #fde047;">${formatVND(displayTotal)}</td>
            </tr>
            ${paidRow}
            ${remainingRow}
          </tbody>
        </table>

        <div class="qr-section">
          <img src="${qrUrl}" alt="VietQR" class="qr-img" />
          <div style="font-size: 12px; line-height: 1.6;">
            <div style="font-weight: bold; color: #1e3a8a; font-size: 13px;">THÔNG TIN CHUYỂN KHOẢN VIETQR:</div>
            <div>Ngân hàng: <strong>${settings.bankName || ''}</strong> • STK: <strong>${settings.bankAccount || ''}</strong></div>
            <div>Chủ tài khoản: <strong>${settings.bankOwner || ''}</strong></div>
            <div>Số tiền: <strong style="color: #dc2626;">${formatVND(qrAmount)}</strong></div>
            <div>Nội dung: <strong>${(invoice.roomName?.replace(/[^0-9]/g, 'P') || 'P') + ' ' + memoType + ' T' + (invoice.month?.replace('-', '') || '')}</strong></div>
          </div>
        </div>

        <div class="signatures">
          <div>
            <div style="font-weight: bold;">Người nộp tiền</div>
            <div style="font-size: 11px; color: #94a3b8;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold;">${invoice.tenantName || 'Khách thuê'}</div>
          </div>
          <div>
            <div style="font-weight: bold;">Người thu tiền (Chủ trọ)</div>
            <div style="font-size: 11px; color: #94a3b8;">(Ký, ghi rõ họ tên)</div>
            <div style="height: 55px; display: flex; align-items: center; justify-content: center;">
              ${invoice.status === 'PAID' ? '<span class="stamp">✓ ĐÃ THU ĐỦ</span>' : ''}
            </div>
            <div style="font-weight: bold;">${settings.landlordName || ''}</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-slate-800 text-lg">
              Chi Tiết Hóa Đơn - {invoice.roomName}
            </span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              invoice.status === 'PAID'
                ? 'bg-emerald-100 text-emerald-800'
                : invoice.status === 'PENDING_APPROVAL'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {invoice.status === 'PAID' ? 'Đã Thanh Toán' : invoice.status === 'PENDING_APPROVAL' ? 'Chờ Duyệt Đối Soát' : 'Chưa Thanh Toán'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Invoice Body */}
        <div className="p-6 overflow-y-auto space-y-6 printable-area">
          
          {/* Header Bill */}
          <div className="border-b border-dashed border-slate-300 pb-4 text-center sm:text-left sm:flex sm:justify-between sm:items-start">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {settings.houseName || 'NHÀ TRỌ AN CƯ'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Đ/c: {settings.address}
              </p>
              <p className="text-xs text-slate-600">
                Chủ trọ: <span className="font-semibold">{settings.landlordName}</span> - SĐT: {settings.landlordPhone}
              </p>
            </div>
            <div className="mt-3 sm:mt-0 text-center sm:text-right">
              <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 border border-slate-200">
                {invoice.invoiceCode}
              </span>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Kỳ thu: <span className="font-bold text-slate-800">Tháng {invoice.month?.slice(5)}/{invoice.month?.slice(0, 4)}</span>
              </p>
            </div>
          </div>

          {/* Tenant Details */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500">Phòng thuê:</span>{' '}
              <strong className="text-slate-900 text-sm">{invoice.roomName}</strong>
            </div>
            <div>
              <span className="text-slate-500">Đại diện phòng:</span>{' '}
              <strong className="text-slate-900">{invoice.tenantName || 'Chưa cập nhật'}</strong>
            </div>
            <div>
              <span className="text-slate-500">Số điện thoại:</span>{' '}
              <strong className="text-slate-900">{invoice.tenantPhone || '---'}</strong>
            </div>
            <div>
              <span className="text-slate-500">Lịch thu tiền phòng:</span>{' '}
              <strong className="text-blue-700 font-bold">Ngày {invoice.rentDueDay || (invoice.schedule?.actualRentDay) || 1} hàng tháng (theo HĐ)</strong>
            </div>
            <div>
              <span className="text-slate-500">Lịch thu điện nước:</span>{' '}
              <strong className="text-emerald-700 font-bold">Ngày 1 Tây hàng tháng</strong>
            </div>
          </div>

          {/* Mode Selector (Cả hóa đơn / Chỉ tiền phòng / Chỉ điện nước) */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('ALL')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'ALL'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📄 Hóa Đơn Đầy Đủ
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ROOM_ONLY')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'ROOM_ONLY'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tính và thu tiền phòng đúng ngày ký hợp đồng"
            >
              🏠 Chỉ Tiền Phòng ({formatVND(roomRentTotal)})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('UTILITIES_ONLY')}
              className={`flex-1 py-1.5 px-2.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'UTILITIES_ONLY'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Chốt và thu tiền điện nước ngày 1 Tây hàng tháng"
            >
              ⚡ Chỉ Điện & Nước ({formatVND(utilitiesTotal)})
            </button>
          </div>

          {/* Calculation Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Khoản mục</th>
                  <th className="p-3 text-center">Chỉ số cũ - mới</th>
                  <th className="p-3 text-center">Tiêu thụ</th>
                  <th className="p-3 text-right">Đơn giá</th>
                  <th className="p-3 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {/* Tiền phòng (Hiển thị ở chế độ ALL và ROOM_ONLY) */}
                {(viewMode === 'ALL' || viewMode === 'ROOM_ONLY') && (
                  <>
                    <tr>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">1. Tiền phòng</div>
                        <span className="text-[11px] text-blue-700 font-medium block">
                          Kỳ: {invoice.rentCycleStr || (invoice.schedule?.rentCycleStr) || '1 tháng'} • Hạn: Ngày {invoice.rentDueDay || 1} hàng tháng
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-400">---</td>
                      <td className="p-3 text-center">1 tháng</td>
                      <td className="p-3 text-right">{formatVND(invoice.roomPrice)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatVND(invoice.roomPrice)}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">2. Phí Wifi Internet</td>
                      <td className="p-3 text-center text-slate-400">---</td>
                      <td className="p-3 text-center">1 phòng</td>
                      <td className="p-3 text-right">{formatVND(invoice.wifiFee)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatVND(invoice.wifiFee)}</td>
                    </tr>
                  </>
                )}

                {/* Tiền điện & Nước (Hiển thị ở chế độ ALL và UTILITIES_ONLY) */}
                {(viewMode === 'ALL' || viewMode === 'UTILITIES_ONLY') && (
                  <>
                    <tr>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">
                          {viewMode === 'ALL' ? '3. Tiền điện' : '1. Tiền điện'}
                        </div>
                        <span className="text-[11px] text-slate-500">Đồng hồ riêng • Chốt ngày 1 Tây</span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        {invoice.oldElectricity} ➔ {invoice.newElectricity}
                      </td>
                      <td className="p-3 text-center font-bold text-blue-600">
                        {invoice.electricityUsage} <span className="font-normal text-slate-500">kWh</span>
                      </td>
                      <td className="p-3 text-right">{formatVND(invoice.electricityPrice)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatVND(invoice.electricityCost)}</td>
                    </tr>
                    <tr>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">
                          {viewMode === 'ALL' ? '4. Tiền nước' : '2. Tiền nước'}
                        </div>
                        <span className="text-[11px] text-slate-500">Đồng hồ riêng • Chốt ngày 20 Tây</span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        {invoice.oldWater} ➔ {invoice.newWater}
                      </td>
                      <td className="p-3 text-center font-bold text-cyan-600">
                        {invoice.waterUsage} <span className="font-normal text-slate-500">m³</span>
                      </td>
                      <td className="p-3 text-right">{formatVND(invoice.waterPrice)}</td>
                      <td className="p-3 text-right font-bold text-slate-900">{formatVND(invoice.waterCost)}</td>
                    </tr>
                    {invoice.extraFees && invoice.extraFees.map((fee, idx) => (
                      <tr key={idx} className="bg-slate-50/50">
                        <td className="p-3 font-medium text-slate-800">
                          {viewMode === 'ALL' ? `5.${idx + 1}. ${fee.name}` : `3.${idx + 1}. ${fee.name}`}
                        </td>
                        <td className="p-3 text-center text-slate-400">---</td>
                        <td className="p-3 text-center">Cố định</td>
                        <td className="p-3 text-right">{formatVND(fee.amount)}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{formatVND(fee.amount)}</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Discount if any */}
                {invoice.discount > 0 && viewMode === 'ALL' && (
                  <tr className="bg-emerald-50/50 text-emerald-800">
                    <td className="p-3 font-medium">Giảm trừ / Khuyến mãi</td>
                    <td className="p-3 text-center text-slate-400">---</td>
                    <td className="p-3 text-center">---</td>
                    <td className="p-3 text-right">-{formatVND(invoice.discount)}</td>
                    <td className="p-3 text-right font-bold">-{formatVND(invoice.discount)}</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold text-sm">
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider">
                    {viewMode === 'ROOM_ONLY'
                      ? 'Tổng tiền phòng:'
                      : viewMode === 'UTILITIES_ONLY'
                      ? 'Tổng tiền điện nước:'
                      : 'Tổng cộng thanh toán:'}
                  </td>
                  <td className="p-3 text-right text-base text-amber-300">
                    {formatVND(displayTotal)}
                  </td>
                </tr>
                {invoice.paidAmount > 0 && (
                  <tr className="bg-slate-100 text-xs">
                    <td colSpan={4} className="p-2 text-right font-semibold text-slate-600">
                      Đã thanh toán:
                    </td>
                    <td className="p-2 text-right font-bold text-emerald-600">
                      {formatVND(invoice.paidAmount)}
                    </td>
                  </tr>
                )}
                {displayRemaining > 0 && invoice.paidAmount > 0 && (
                  <tr className="bg-rose-50 text-xs">
                    <td colSpan={4} className="p-2 text-right font-bold text-rose-700">
                      Còn nợ lại:
                    </td>
                    <td className="p-2 text-right font-black text-rose-600">
                      {formatVND(displayRemaining)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>

          {/* Payment QR & Bank Transfer Section */}
          <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-32 h-32 shrink-0 bg-white p-2 rounded-xl shadow-xs border border-blue-100 flex items-center justify-center">
              <img
                src={qrUrl}
                alt="VietQR Chuyển Khoản"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div className="text-xs space-y-1 text-slate-700 flex-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-900 text-sm">
                <QrCode className="w-4 h-4 text-blue-600" />
                Mã QR Chuyển Khoản (VietQR) - {viewMode === 'ROOM_ONLY' ? 'Tiền Phòng (Ngày HĐ)' : viewMode === 'UTILITIES_ONLY' ? 'Tiền Điện & Nước (1 Tây)' : 'Toàn Bộ Hóa Đơn'}
              </div>
              <p className="text-slate-600">
                {viewMode === 'ROOM_ONLY'
                  ? 'Quét mã để chuyển khoản đúng tiền phòng + wifi (1.550.000 đ) vào ngày ký HĐ. Tiền điện nước sẽ chốt riêng ngày 1 Tây.'
                  : viewMode === 'UTILITIES_ONLY'
                  ? 'Quét mã để chuyển khoản tiền điện nước chốt đầu tháng ngày 1 Tây.'
                  : 'Quét mã trên bằng bất kỳ ứng dụng ngân hàng nào (MB, Vietcombank, Momo, Techcombank...) để thanh toán tự động đúng số tiền và nội dung.'}
              </p>
              <div className="pt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-800">
                <div>Ngân hàng: <strong>{settings.bankName}</strong></div>
                <div>Chủ TK: <strong>{settings.bankOwner}</strong></div>
                <div>STK: <strong>{settings.bankAccount}</strong></div>
                <div>Số tiền: <strong className="text-rose-600">{formatVND(qrAmount)}</strong></div>
              </div>
            </div>
          </div>

          {/* Proof Attachments list if any */}
          {invoice.proofs && invoice.proofs.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                Chứng từ đối soát đính kèm ({invoice.proofs.length})
              </h4>
              <div className="space-y-2">
                {invoice.proofs.map(p => (
                  <div key={p.id} className="bg-white p-2.5 rounded-lg border border-amber-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {p.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt'} - {formatVND(p.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {p.paymentDate} • Mã GD: {p.transactionCode || 'N/A'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : p.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.status === 'APPROVED' ? 'Đã duyệt' : p.status === 'PENDING' ? 'Chờ duyệt' : 'Từ chối'}
                      </span>
                      {p.proofImageUrl && (
                        <a
                          href={p.proofImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-semibold text-[11px]"
                        >
                          Xem ảnh
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Signatures */}
          <div className="grid grid-cols-2 text-center text-xs text-slate-600 pt-6">
            <div>
              <p className="font-bold text-slate-800">Người nộp tiền</p>
              <p className="text-[11px] text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
              <div className="h-14"></div>
              <p className="font-semibold text-slate-700">{invoice.tenantName || 'Khách thuê'}</p>
            </div>
            <div>
              <p className="font-bold text-slate-800">Người thu tiền (Chủ trọ)</p>
              <p className="text-[11px] text-slate-400 mt-0.5">(Ký, ghi rõ họ tên)</p>
              <div className="h-14 flex items-center justify-center">
                {invoice.status === 'PAID' && (
                  <span className="border-2 border-emerald-600 text-emerald-600 font-black text-xs px-3 py-1 rounded-md rotate-[-8deg] uppercase tracking-widest">
                    ĐÃ THU ĐỦ
                  </span>
                )}
              </div>
              <p className="font-semibold text-slate-700">{settings.landlordName}</p>
            </div>
          </div>

        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintWindow}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              In Hóa Đơn / Lưu PDF
            </button>

            <button
              type="button"
              onClick={handleCopyZalo}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors shadow-2xs ${
                copiedZalo
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {copiedZalo ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-blue-600" />}
              {copiedZalo ? 'Đã chép nội dung!' : 'Sao chép gửi Zalo'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {invoice.status !== 'PAID' && (
              <>
                {viewMode === 'ROOM_ONLY' ? (
                  invoice.paidAmount >= roomRentTotal ? (
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800">
                      <Check className="w-4 h-4" /> Đã thu đủ tiền phòng
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={quickPaying}
                      onClick={() => handleQuickPay('ROOM_ONLY', 'CASH')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {quickPaying ? 'Đang xử lý...' : `Xác Nhận Thu Tiền Phòng (${formatVND(roomRentTotal - (invoice.paidAmount || 0))})`}
                    </button>
                  )
                ) : viewMode === 'UTILITIES_ONLY' ? (
                  invoice.remainingAmount <= 0 ? (
                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800">
                      <Check className="w-4 h-4" /> Đã thu đủ điện nước
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={quickPaying}
                      onClick={() => handleQuickPay('UTILITIES_ONLY', 'CASH')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      {quickPaying ? 'Đang xử lý...' : `Xác Nhận Thu Điện Nước (${formatVND(invoice.remainingAmount)})`}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={quickPaying}
                    onClick={() => handleQuickPay('ALL', 'CASH')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {quickPaying ? 'Đang xử lý...' : `Xác Nhận Thu Toàn Bộ (${formatVND(invoice.remainingAmount)})`}
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
