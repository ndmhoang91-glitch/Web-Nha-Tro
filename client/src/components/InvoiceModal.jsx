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
    const text = `🏠 THÔNG BÁO TIỀN PHÒNG THÁNG ${invoice.month?.slice(5)}/${invoice.month?.slice(0, 4)} - ${invoice.roomName}
👤 Khách thuê: ${invoice.tenantName || 'Anh/Chị'}
------------------------------------
1️⃣ Tiền thuê phòng: ${formatVND(invoice.roomPrice)}
2️⃣ Tiền điện (${invoice.oldElectricity} ➡️ ${invoice.newElectricity} = ${invoice.electricityUsage} kWh x ${formatVND(invoice.electricityPrice)}): ${formatVND(invoice.electricityCost)}
3️⃣ Tiền nước (${invoice.oldWater} ➡️ ${invoice.newWater} = ${invoice.waterUsage} m³ x ${formatVND(invoice.waterPrice)}): ${formatVND(invoice.waterCost)}
4️⃣ Phí Internet/Wifi: ${formatVND(invoice.wifiFee)}
${invoice.extraFees && invoice.extraFees.length > 0 ? invoice.extraFees.map(f => `5️⃣ ${f.name}: ${formatVND(f.amount)}`).join('\n') : ''}
${invoice.discount > 0 ? `🔻 Giảm trừ: -${formatVND(invoice.discount)}` : ''}
------------------------------------
👉 TỔNG TIỀN PHẢI NỘP: ${formatVND(invoice.totalAmount)}
${invoice.paidAmount > 0 ? `✅ Đã thanh toán: ${formatVND(invoice.paidAmount)}\n⏳ CÒN LẠI: ${formatVND(invoice.remainingAmount)}` : ''}
------------------------------------
💳 THÔNG TIN CHUYỂN KHOẢN:
- Ngân hàng: ${settings.bankName}
- Số tài khoản: ${settings.bankAccount}
- Chủ tài khoản: ${settings.bankOwner}
- Nội dung: ${invoice.roomName?.replace(/[^0-9]/g, 'P')} TIEN TRO T${invoice.month?.replace('-', '')}
⏰ Hạn đóng: Trước ngày ${invoice.dueDate || '05'} hàng tháng.
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
              <span className="text-slate-500">Hạn thanh toán:</span>{' '}
              <strong className="text-rose-600 font-semibold">{invoice.dueDate || 'Mùng 5 hàng tháng'}</strong>
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
                  <td className="p-3 font-semibold text-slate-900">1. Tiền phòng</td>
                  <td className="p-3 text-center text-slate-400">---</td>
                  <td className="p-3 text-center">1 tháng</td>
                  <td className="p-3 text-right">{formatVND(invoice.roomPrice)}</td>
                  <td className="p-3 text-right font-bold text-slate-900">{formatVND(invoice.roomPrice)}</td>
                </tr>

                {/* Tiền điện */}
                <tr>
                  <td className="p-3">
                    <div className="font-semibold text-slate-900">2. Tiền điện</div>
                    <span className="text-[11px] text-slate-500">Đồng hồ riêng từng phòng</span>
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
                    <span className="text-[11px] text-slate-500">Đồng hồ nước máy</span>
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
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors"
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
