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

  if (!invoice) return null;

  const qrUrl = getVietQRUrl(
    settings.bankName,
    settings.bankAccount,
    settings.bankOwner,
    invoice.remainingAmount > 0 ? invoice.remainingAmount : invoice.totalAmount,
    `${invoice.roomName?.replace(/[^0-9]/g, 'P') || 'P'} T${invoice.month?.replace('-', '')}`
  );

  const handleCopyZalo = () => {
    const rentDay = invoice.rentDueDay || (invoice.schedule?.actualRentDay) || '10';
    const rentCycleStr = invoice.rentCycleStr || (invoice.schedule?.rentCycleStr) || '1 tháng';
    const text = `🏠 THÔNG BÁO TIỀN PHÒNG & ĐIỆN NƯỚC THÁNG ${invoice.month?.slice(5)}/${invoice.month?.slice(0, 4)} - ${invoice.roomName}
👤 Khách thuê: ${invoice.tenantName || 'Anh/Chị'}
------------------------------------
1️⃣ Tiền thuê phòng: ${formatVND(invoice.roomPrice)}
   (Kỳ thuê: ${rentCycleStr} • Thu đúng ngày ${rentDay} hàng tháng theo HĐ)
2️⃣ Tiền điện (Chốt ngày 1 Tây: ${invoice.oldElectricity} ➡️ ${invoice.newElectricity} = ${invoice.electricityUsage} kWh x ${formatVND(invoice.electricityPrice)}): ${formatVND(invoice.electricityCost)}
3️⃣ Tiền nước (Chốt ngày 1 Tây: ${invoice.oldWater} ➡️ ${invoice.newWater} = ${invoice.waterUsage} m³ x ${formatVND(invoice.waterPrice)}): ${formatVND(invoice.waterCost)}
4️⃣ Phí Internet/Wifi: ${formatVND(invoice.wifiFee)}
${invoice.extraFees && invoice.extraFees.length > 0 ? invoice.extraFees.map(f => `5️⃣ ${f.name}: ${formatVND(f.amount)}`).join('\n') : ''}
${invoice.discount > 0 ? `🔻 Giảm trừ: -${formatVND(invoice.discount)}` : ''}
------------------------------------
👉 TỔNG TIỀN PHẢI NỘP: ${formatVND(invoice.totalAmount)}
${invoice.paidAmount > 0 ? `✅ Đã thanh toán: ${formatVND(invoice.paidAmount)}\n⏳ CÒN LẠI: ${formatVND(invoice.remainingAmount)}` : ''}
------------------------------------
⏰ LỊCH VÀ HẠN THANH TOÁN:
- 🏠 Tiền phòng: Thu đúng ngày ${rentDay} hàng tháng (kỳ ${rentCycleStr})
- ⚡ Tiền điện & nước: Chốt và thu ngày 1 Tây hàng tháng
💳 THÔNG TIN CHUYỂN KHOẢN:
- Ngân hàng: ${settings.bankName}
- Số tài khoản: ${settings.bankAccount}
- Chủ tài khoản: ${settings.bankOwner}
- Nội dung: ${invoice.roomName?.replace(/[^0-9]/g, 'P')} TIEN TRO T${invoice.month?.replace('-', '')}
Cảm ơn anh/chị!`;

    navigator.clipboard.writeText(text);
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  const handleQuickPay = async (method = 'CASH') => {
    if (!confirm(`Xác nhận đã nhận đủ ${formatVND(invoice.remainingAmount)} từ ${invoice.roomName}?`)) return;
    setQuickPaying(true);
    try {
      await quickPayInvoice(invoice.id, {
        paymentMethod: method,
        amount: invoice.remainingAmount,
        note: `Chủ trọ xác nhận nhận tiền ${method === 'CASH' ? 'mặt' : 'chuyển khoản'}`
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hóa Đơn ${invoice.invoiceCode || ''} - ${invoice.roomName || ''}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px dashed #94a3b8; padding-bottom: 12px; margin-bottom: 15px; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 4px; text-transform: uppercase; }
          .subtitle { font-size: 12px; color: #475569; margin: 2px 0; }
          .badge { display: inline-block; padding: 4px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-family: monospace; font-size: 13px; font-weight: bold; }
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
            <p class="subtitle">Địa chỉ: <strong>${settings.address || ''}</strong></p>
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
            <tr>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1;">
                <div style="font-weight: bold;">1. Tiền thuê phòng</div>
                <div style="font-size: 11px; color: #0284c7;">Kỳ: ${rentCycleStr} (Thu đúng ngày ${rentDay} hàng tháng)</div>
              </td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; color: #94a3b8;">---</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center;">1 tháng</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatVND(invoice.roomPrice)}</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatVND(invoice.roomPrice)}</td>
            </tr>
            <tr>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1;">
                <div style="font-weight: bold;">2. Tiền điện</div>
                <div style="font-size: 11px; color: #64748b;">Đồng hồ riêng • Chốt ngày 1 Tây</div>
              </td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${invoice.oldElectricity} ➔ ${invoice.newElectricity}</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #2563eb;">${invoice.electricityUsage} kWh</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatVND(invoice.electricityPrice)}</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatVND(invoice.electricityCost)}</td>
            </tr>
            <tr>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1;">
                <div style="font-weight: bold;">3. Tiền nước</div>
                <div style="font-size: 11px; color: #64748b;">Đồng hồ riêng • Chốt ngày 1 Tây</div>
              </td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${invoice.oldWater} ➔ ${invoice.newWater}</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #0891b2;">${invoice.waterUsage} m³</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatVND(invoice.waterPrice)}</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatVND(invoice.waterCost)}</td>
            </tr>
            <tr>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1;"><div style="font-weight: bold;">4. Phí Wifi Internet</div></td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; color: #94a3b8;">---</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center;">1 phòng</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatVND(invoice.wifiFee)}</td>
              <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${formatVND(invoice.wifiFee)}</td>
            </tr>
            ${extraFeesRows}
            ${discountRow}
            <tr class="total-row">
              <td colspan="4" style="padding: 12px; text-align: right; font-size: 13px;">TỔNG CỘNG TIỀN PHẢI NỘP:</td>
              <td style="padding: 12px; text-align: right; font-size: 16px; color: #fde047;">${formatVND(invoice.totalAmount)}</td>
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
            <div>Số tiền: <strong style="color: #dc2626;">${formatVND(invoice.remainingAmount > 0 ? invoice.remainingAmount : invoice.totalAmount)}</strong></div>
            <div>Nội dung: <strong>${(invoice.roomName?.replace(/[^0-9]/g, 'P') || 'P') + ' TIEN TRO T' + (invoice.month?.replace('-', '') || '')}</strong></div>
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
                {/* Tiền phòng */}
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

                {/* Tiền điện */}
                <tr>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">2. Tiền điện</div>
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

                {/* Tiền nước */}
                <tr>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">3. Tiền nước</div>
                    <span className="text-[11px] text-slate-500">Đồng hồ nước máy • Chốt ngày 1 Tây</span>
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

                {/* Phí Wifi */}
                <tr>
                  <td className="p-3 font-semibold text-slate-900">4. Phí Wifi Internet</td>
                  <td className="p-3 text-center text-slate-400">---</td>
                  <td className="p-3 text-center">1 phòng</td>
                  <td className="p-3 text-right">{formatVND(invoice.wifiFee)}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{formatVND(invoice.wifiFee)}</td>
                </tr>

                {/* Extra Fees */}
                {invoice.extraFees && invoice.extraFees.map((fee, idx) => (
                  <tr key={idx} className="bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-800">5.{idx + 1}. {fee.name}</td>
                    <td className="p-3 text-center text-slate-400">---</td>
                    <td className="p-3 text-center">Cố định</td>
                    <td className="p-3 text-right">{formatVND(fee.amount)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{formatVND(fee.amount)}</td>
                  </tr>
                ))}

                {/* Discount if any */}
                {invoice.discount > 0 && (
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
                    Tổng cộng thanh toán:
                  </td>
                  <td className="p-3 text-right text-base text-amber-300">
                    {formatVND(invoice.totalAmount)}
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
                {invoice.remainingAmount > 0 && invoice.paidAmount > 0 && (
                  <tr className="bg-rose-50 text-xs">
                    <td colSpan={4} className="p-2 text-right font-bold text-rose-700">
                      Còn nợ lại:
                    </td>
                    <td className="p-2 text-right font-black text-rose-600">
                      {formatVND(invoice.remainingAmount)}
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
                Mã QR Thanh Toán Ngân Hàng (VietQR)
              </div>
              <p className="text-slate-600">
                Quét mã trên bằng bất kỳ ứng dụng ngân hàng nào (MB, Vietcombank, Momo, Techcombank...) để thanh toán tự động đúng số tiền và nội dung.
              </p>
              <div className="pt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] font-mono text-slate-800">
                <div>Ngân hàng: <strong>{settings.bankName}</strong></div>
                <div>Chủ TK: <strong>{settings.bankOwner}</strong></div>
                <div>STK: <strong>{settings.bankAccount}</strong></div>
                <div>Số tiền: <strong className="text-rose-600">{formatVND(invoice.remainingAmount > 0 ? invoice.remainingAmount : invoice.totalAmount)}</strong></div>
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
              <button
                type="button"
                disabled={quickPaying}
                onClick={() => handleQuickPay('CASH')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                {quickPaying ? 'Đang xử lý...' : 'Xác Nhận Đã Thu Tiền'}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Đóng
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
