import React, { useState, useEffect } from 'react';
import { X, Zap, Droplet, Plus, Trash2, Calculator, Check, AlertCircle } from 'lucide-react';
import { formatVND, updateInvoice } from '../api';

export default function MeterReadingModal({
  invoice,
  onClose,
  onSaved
}) {
  const [formData, setFormData] = useState({
    roomPrice: 1500000,
    oldElectricity: 0,
    newElectricity: 0,
    electricityPrice: 4000,
    oldWater: 0,
    newWater: 0,
    waterPrice: 12000,
    wifiFee: 50000,
    extraFees: [],
    discount: 0,
    notes: ''
  });

  const [saving, setSaving] = useState(false);
  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');

  useEffect(() => {
    if (invoice) {
      setFormData({
        roomPrice: invoice.roomPrice ?? 1500000,
        oldElectricity: invoice.oldElectricity ?? 0,
        newElectricity: invoice.newElectricity ?? 0,
        electricityPrice: invoice.electricityPrice ?? 4000,
        oldWater: invoice.oldWater ?? 0,
        newWater: invoice.newWater ?? 0,
        waterPrice: invoice.waterPrice ?? 12000,
        wifiFee: invoice.wifiFee ?? 50000,
        extraFees: Array.isArray(invoice.extraFees) ? [...invoice.extraFees] : [],
        discount: invoice.discount ?? 0,
        notes: invoice.notes || ''
      });
    }
  }, [invoice]);

  // Real-time calculation helpers
  const eUsage = Math.max(0, Number(formData.newElectricity) - Number(formData.oldElectricity));
  const eCost = eUsage * Number(formData.electricityPrice);

  const wUsage = Math.max(0, Number(formData.newWater) - Number(formData.oldWater));
  const wCost = wUsage * Number(formData.waterPrice);

  const totalExtra = formData.extraFees.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const grandTotal = Math.max(
    0,
    Number(formData.roomPrice) + eCost + wCost + Number(formData.wifiFee) + totalExtra - Number(formData.discount)
  );

  const handleAddExtraFee = () => {
    if (!newFeeName.trim() || !newFeeAmount) return;
    setFormData(prev => ({
      ...prev,
      extraFees: [...prev.extraFees, { name: newFeeName.trim(), amount: Number(newFeeAmount) }]
    }));
    setNewFeeName('');
    setNewFeeAmount('');
  };

  const handleRemoveExtraFee = (index) => {
    setFormData(prev => ({
      ...prev,
      extraFees: prev.extraFees.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateInvoice(invoice.id, {
        ...formData,
        electricityUsage: eUsage,
        electricityCost: eCost,
        waterUsage: wUsage,
        waterCost: wCost,
        totalExtraFee: totalExtra,
        totalAmount: grandTotal
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert('Lỗi cập nhật: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Ghi Số Điện Nước & Chi Phí - {invoice?.roomName}
            </h3>
            <p className="text-xs text-slate-500">
              Kỳ tính tiền: Tháng {invoice?.month?.slice(5)}/{invoice?.month?.slice(0, 4)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          
          {/* Base Room & Wifi Fee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tiền phòng (VNĐ/tháng)
              </label>
              <input
                type="number"
                value={formData.roomPrice}
                onChange={e => setFormData({ ...formData, roomPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phí Wifi (VNĐ/tháng)
              </label>
              <input
                type="number"
                value={formData.wifiFee}
                onChange={e => setFormData({ ...formData, wifiFee: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Electricity Section */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <Zap className="w-4 h-4 text-amber-600" />
                Tiền Điện (4.000 đ/kW)
              </div>
              <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                {eUsage} kWh = {formatVND(eCost)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Số cũ (đầu tháng)</label>
                <input
                  type="number"
                  value={formData.oldElectricity}
                  onChange={e => setFormData({ ...formData, oldElectricity: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Số mới (cuối tháng)</label>
                <input
                  type="number"
                  value={formData.newElectricity}
                  onChange={e => setFormData({ ...formData, newElectricity: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-hidden focus:border-amber-500 font-bold text-amber-900"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Đơn giá (đ/kW)</label>
                <input
                  type="number"
                  value={formData.electricityPrice}
                  onChange={e => setFormData({ ...formData, electricityPrice: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-amber-200 rounded-lg focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Water Section */}
          <div className="bg-cyan-50/70 border border-cyan-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-900 font-bold text-sm">
                <Droplet className="w-4 h-4 text-cyan-600" />
                Tiền Nước (12.000 đ/khối)
              </div>
              <span className="text-xs font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded-full">
                {wUsage} m³ = {formatVND(wCost)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">Số cũ (đầu tháng)</label>
                <input
                  type="number"
                  value={formData.oldWater}
                  onChange={e => setFormData({ ...formData, oldWater: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-cyan-200 rounded-lg focus:outline-hidden focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Số mới (cuối tháng)</label>
                <input
                  type="number"
                  value={formData.newWater}
                  onChange={e => setFormData({ ...formData, newWater: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-cyan-200 rounded-lg focus:outline-hidden focus:border-cyan-500 font-bold text-cyan-900"
                  required
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Đơn giá (đ/khối)</label>
                <input
                  type="number"
                  value={formData.waterPrice}
                  onChange={e => setFormData({ ...formData, waterPrice: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 text-sm bg-white border border-cyan-200 rounded-lg focus:outline-hidden focus:border-cyan-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Extra Fees List & Adder */}
          <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Khoản Phí Phát Sinh Khác (Rác, Gửi Xe, Vệ Sinh...)
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Tổng phát sinh: {formatVND(totalExtra)}
              </span>
            </div>

            {/* List */}
            {formData.extraFees.length > 0 ? (
              <div className="space-y-1.5">
                {formData.extraFees.map((fee, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                    <span className="font-medium text-slate-700">{fee.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{formatVND(fee.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExtraFee(index)}
                        className="text-rose-500 hover:text-rose-700 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Chưa có khoản phí phát sinh nào.</p>
            )}

            {/* Adder Inputs */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Tên khoản phí (vd: Gửi xe, Rác...)"
                value={newFeeName}
                onChange={e => setNewFeeName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
              <input
                type="number"
                placeholder="Số tiền (đ)"
                value={newFeeAmount}
                onChange={e => setNewFeeAmount(e.target.value)}
                className="w-28 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddExtraFee}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm
              </button>
            </div>
          </div>

          {/* Discount & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giảm giá / Khuyến mãi (đ)
              </label>
              <input
                type="number"
                value={formData.discount}
                onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú hóa đơn
              </label>
              <input
                type="text"
                placeholder="vd: Hạn đóng ngày 05/11"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Grand Total Preview Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">
                Tổng Tiền Hóa Đơn Tự Động Tính
              </span>
              <span className="text-2xl font-black text-amber-300">
                {formatVND(grandTotal)}
              </span>
            </div>
            <div className="text-right text-xs text-slate-300 space-y-0.5">
              <div>Phòng: {formatVND(formData.roomPrice)}</div>
              <div>Điện + Nước: {formatVND(eCost + wCost)}</div>
              <div>Wifi + Khác: {formatVND(Number(formData.wifiFee) + totalExtra)}</div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu & Tính Tiền Ngay'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
