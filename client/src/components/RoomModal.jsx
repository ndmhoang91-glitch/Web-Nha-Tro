import React, { useState, useEffect } from 'react';
import { X, Building2, Check, Trash2, AlertTriangle, Layers, DollarSign, Wifi, Maximize2 } from 'lucide-react';
import { formatVND, createRoom, updateRoom, deleteRoom } from '../api';

export default function RoomModal({
  room = null,
  onClose,
  onSaved
}) {
  const isEditing = Boolean(room && room.id);

  const [name, setName] = useState('');
  const [floor, setFloor] = useState(1);
  const [basePrice, setBasePrice] = useState(1500000);
  const [wifiFee, setWifiFee] = useState(50000);
  const [status, setStatus] = useState('AVAILABLE');
  const [area, setArea] = useState(18);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (room) {
      setName(room.name || '');
      setFloor(room.floor ?? 1);
      setBasePrice(room.basePrice ?? 1500000);
      setWifiFee(room.wifiFee ?? 50000);
      setStatus(room.status || 'AVAILABLE');
      setArea(room.area ?? 18);
      setDescription(room.description || '');
      setNotes(room.notes || '');
    } else {
      setName('Phòng mới');
      setFloor(1);
      setBasePrice(1500000);
      setWifiFee(50000);
      setStatus('AVAILABLE');
      setArea(18);
      setDescription('Có gác lửng, toilet riêng, quạt trần, đồng hồ điện nước riêng');
      setNotes('');
    }
  }, [room]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        floor: Number(floor) || 1,
        basePrice: Number(basePrice) || 1500000,
        wifiFee: Number(wifiFee) || 50000,
        status,
        area: Number(area) || 18,
        description: description.trim(),
        notes: notes.trim()
      };

      if (isEditing) {
        await updateRoom(room.id, payload);
      } else {
        await createRoom(payload);
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!room || !room.id) return;

    const confirmMsg = `⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA ${room.name}?\n\nLưu ý: Tất cả hóa đơn và dữ liệu liên quan của phòng này sẽ bị xóa khỏi hệ thống. Thao tác này không thể hoàn tác!`;
    if (!confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      await deleteRoom(room.id);
      alert(`Đã xóa ${room.name} thành công!`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert('Lỗi xóa phòng: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-lg">
              {isEditing ? `Chỉnh Sửa Thông Tin ${room.name}` : 'Thêm Phòng Trọ Mới'}
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
          
          {/* Room Name & Floor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Tên / Số phòng *
              </label>
              <input
                type="text"
                placeholder="Phòng 101, Phòng 201..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Vị trí Tầng (Floor)
              </label>
              <select
                value={floor}
                onChange={e => setFloor(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-semibold"
              >
                <option value={1}>Tầng 1 (Trệt)</option>
                <option value={2}>Tầng 2</option>
                <option value={3}>Tầng 3</option>
                <option value={4}>Tầng 4</option>
              </select>
            </div>
          </div>

          {/* Pricing & Wifi Fee */}
          <div className="grid grid-cols-2 gap-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200">
            <div>
              <label className="font-semibold text-blue-900 block mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                Giá thuê phòng (VNĐ/tháng) *
              </label>
              <input
                type="number"
                value={basePrice}
                onChange={e => setBasePrice(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg font-bold text-slate-900 text-sm"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-blue-900 block mb-1 flex items-center gap-1">
                <Wifi className="w-3.5 h-3.5 text-blue-600" />
                Phí Wifi (VNĐ/tháng) *
              </label>
              <input
                type="number"
                value={wifiFee}
                onChange={e => setWifiFee(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg font-bold text-slate-900 text-sm"
                required
              />
            </div>
          </div>

          {/* Status & Area */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Tình trạng phòng
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-semibold"
              >
                <option value="AVAILABLE">🟢 Còn trống (Sẵn sàng cho thuê)</option>
                <option value="OCCUPIED">🔵 Đang có khách thuê</option>
                <option value="MAINTENANCE">🟡 Đang sửa chữa / Bảo trì</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                Diện tích phòng (m²)
              </label>
              <input
                type="number"
                value={area}
                onChange={e => setArea(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-semibold"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Mô tả tiện ích phòng
            </label>
            <input
              type="text"
              placeholder="Có gác lửng, toilet riêng, bếp nấu ăn, ban công..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Internal Notes */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Ghi chú nội bộ của chủ trọ
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú về thiết bị sẵn có trong phòng, vị trí cầu dao..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Action Decision Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 gap-2">
            {isEditing ? (
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                {deleting ? 'Đang xóa...' : 'Xóa Phòng Này'}
              </button>
            ) : <div></div>}

            <div className="flex items-center gap-2">
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
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Đang lưu...' : (isEditing ? 'Lưu Thông Tin Phòng' : 'Tạo Phòng Trọ')}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
