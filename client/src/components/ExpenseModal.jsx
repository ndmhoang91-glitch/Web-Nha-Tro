import React, { useState } from 'react';
import { X, Receipt, Upload, Check } from 'lucide-react';
import { saveExpense } from '../api';

export default function ExpenseModal({
  onClose,
  onSaved
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('DIEN_NUOC_TONG');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;
    setSaving(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('category', category);
      form.append('amount', amount);
      form.append('date', date);
      form.append('notes', notes);
      if (receiptFile) {
        form.append('receiptImage', receiptFile);
      }

      await saveExpense(form);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert('Lỗi lưu khoản chi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-slate-800 text-lg">
              Thêm Khoản Chi Tiêu Nhà Trọ
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nội dung chi tiêu *
            </label>
            <input
              type="text"
              placeholder="vd: Hóa đơn tiền điện EVN tổng, Sửa vòi sen P103, Internet..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Danh mục chi *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 font-medium"
              >
                <option value="DIEN_NUOC_TONG">Điện Nước Nhà Nước</option>
                <option value="SUA_CHUA">Sửa Chữa / Bảo Trì</option>
                <option value="INTERNET">Cáp Quang Internet</option>
                <option value="VE_SINH_RAC">Rác & Môi Trường</option>
                <option value="VAT_TU">Vật Tư / Thiết Bị Mới</option>
                <option value="KHAC">Khoản Chi Khác</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Số tiền chi (VNĐ) *
              </label>
              <input
                type="number"
                placeholder="vd: 450000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500 font-bold text-rose-700"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ngày chi tiêu
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500"
              required
            />
          </div>

          {/* Upload Receipt Image */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Đính kèm hóa đơn đỏ / Biên lai / Ủy nhiệm chi (nếu có)
            </label>
            <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 flex items-center justify-between">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
              />
              {receiptPreview && (
                <img src={receiptPreview} alt="Receipt preview" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
              )}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              placeholder="Thông tin người nhận tiền, bảo hành..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-rose-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu Khoản Chi'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
