import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, ShieldCheck, ExternalLink, Calendar, CreditCard, Building } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatVND, reviewProof } from '../api';

export default function ProofReviewModal({
  proof,
  onClose,
  onReviewed
}) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!proof) return null;

  const handleAction = async (action) => {
    setSubmitting(true);
    try {
      await reviewProof(proof.id, action, reviewNotes);
      if (action === 'APPROVE') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
      if (onReviewed) onReviewed();
      onClose();
    } catch (err) {
      alert('Lỗi xử lý: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-800 text-base sm:text-lg">
              Đối Soát Chứng Từ Thanh Toán - {proof.roomName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Key Info Banner */}
          <div className="bg-amber-50/80 rounded-xl p-4 border border-amber-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-800 font-medium block">Số tiền khách báo nộp:</span>
              <span className="text-2xl font-black text-amber-900">{formatVND(proof.amount)}</span>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-0.5">
              <div>Phòng: <strong className="text-slate-900">{proof.roomName}</strong></div>
              <div>Khách thuê: <strong className="text-slate-900">{proof.tenantName || '---'}</strong> ({proof.tenantPhone || ''})</div>
              <div>Mã HĐ: <strong className="font-mono text-blue-700">{proof.invoiceCode}</strong></div>
            </div>
          </div>

          {/* Proof Image Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700">
                Ảnh Chụp Biên Lai / Ủy Nhiệm Chi:
              </span>
              {proof.proofImageUrl && (
                <a
                  href={proof.proofImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Mở ảnh gốc
                </a>
              )}
            </div>
            <div className="bg-slate-100 rounded-xl border border-slate-300 overflow-hidden flex items-center justify-center max-h-80 min-h-48 p-2">
              {proof.proofImageUrl ? (
                <img
                  src={proof.proofImageUrl}
                  alt="Chứng từ chuyển khoản"
                  className="max-h-76 w-auto object-contain rounded-lg shadow-xs"
                />
              ) : (
                <div className="text-center p-6 text-slate-400 text-xs">
                  Không có hình ảnh đính kèm (Nộp trực tiếp)
                </div>
              )}
            </div>
          </div>

          {/* Transaction Metadata */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Thời gian thanh toán:</span>
              <strong className="text-slate-800 font-mono">{proof.paymentDate}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Mã giao dịch ngân hàng:</span>
              <strong className="text-slate-800 font-mono">{proof.transactionCode || 'Chưa cung cấp'}</strong>
            </div>
            <div>
              <span className="text-slate-500 block">Phương thức:</span>
              <strong className="text-slate-800">
                {proof.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : 'Tiền mặt trực tiếp'}
              </strong>
            </div>
            <div>
              <span className="text-slate-500 block">Người gửi chứng từ:</span>
              <strong className="text-slate-800">
                {proof.submittedBy === 'TENANT' ? 'Khách thuê tải lên' : 'Chủ trọ lưu'}
              </strong>
            </div>
          </div>

          {/* Manager Review Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú đối soát (Lý do duyệt hoặc từ chối):
            </label>
            <textarea
              rows={2}
              placeholder="vd: Đã khớp tiền tài khoản MBBank lúc 09:30, hoặc: Chưa nhận được tiền vui lòng kiểm tra lại STK"
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Action Decision Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleAction('REJECT')}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              Từ Chối Chứng Từ
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction('APPROVE')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? 'Đang duyệt...' : '✅ Duyệt Đối Soát (Khớp Tiền)'}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
