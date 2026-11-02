import React, { useState } from 'react';
import { X, Zap, Droplet, Bell, AlertTriangle, Send, Copy, Check, Calendar, Clock, Users, Building } from 'lucide-react';
import { saveAnnouncement } from '../api';

export default function AnnouncementModal({
  rooms = [],
  onClose,
  onSaved
}) {
  const [type, setType] = useState('OUTAGE_ELECTRIC'); // OUTAGE_ELECTRIC, OUTAGE_WATER, URGENT, GENERAL
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState('ALL'); // ALL, SPECIFIC_ROOM
  const [targetRoomId, setTargetRoomId] = useState(rooms[0]?.id || 1);
  const [startTime, setStartTime] = useState('08:00 - Ngày 05/11/2026');
  const [endTime, setEndTime] = useState('11:30 - Ngày 05/11/2026');
  const [isPinned, setIsPinned] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedZalo, setCopiedZalo] = useState(false);

  // Quick preset templates
  const applyPreset = (presetType) => {
    setType(presetType);
    if (presetType === 'OUTAGE_ELECTRIC') {
      setTitle('⚠️ Thông Báo Tạm Ngừng Cung Cấp Điện (Cúp Điện)');
      setStartTime('08:00 - Ngày 05/11/2026');
      setEndTime('11:30 - Ngày 05/11/2026');
      setContent('Công ty Điện lực thông báo tạm ngắt điện để bảo trì trạm biến áp và thay thế thiết bị an toàn lưới điện khu vực. Quý khách vui lòng sạc đầy pin điện thoại, máy tính, tắt bớt các thiết bị công suất cao (bình nóng lạnh, máy giặt) trước giờ cắt điện để bảo vệ an toàn.');
    } else if (presetType === 'OUTAGE_WATER') {
      setTitle('💧 Thông Báo Tạm Khóa Nước Súc Rửa Bồn Nước Inox (Cúp Nước)');
      setStartTime('13:30 - Ngày 08/11/2026');
      setEndTime('16:00 - Ngày 08/11/2026');
      setContent('Chủ nhà trọ sẽ tiến hành thau rửa, khử trùng bồn nước inox tổng trên mái để đảm bảo nguồn nước sạch cho các phòng. Trong thời gian này toàn bộ van nước sẽ tạm khóa. Quý khách vui lòng chủ động trữ sẵn nước sinh hoạt vào xô, thau chậu trước giờ khóa nước.');
    } else if (presetType === 'URGENT') {
      setTitle('🚨 Thông Báo Khẩn: Đề Cao Cảnh Giác An Ninh & Phòng Chống Cháy Nổ');
      setStartTime('Áp dụng ngay');
      setEndTime('Thường xuyên');
      setContent('Thời gian gần đây đề nghị tất cả các phòng luôn khóa cổng cẩn thận khi ra vào. Không sạc xe đạp điện, xe máy điện qua đêm không người trông coi. Kiểm tra kỹ bếp gas và ngắt điện các thiết bị sinh nhiệt trước khi rời khỏi phòng.');
    } else {
      setTitle('📢 Thông Báo Nhắc Nhở Tiền Trọ & Giữ Gìn Vệ Sinh Chung');
      setStartTime('Đầu tháng');
      setEndTime('Hạn chót ngày 05');
      setContent('Nhắc nhở quý khách thời hạn đóng tiền trọ kỳ này là trước ngày mùng 5 hàng tháng. Các phòng vui lòng giữ gìn vệ sinh khu vực hành lang và để giày dép xe cộ gọn gàng đúng vị trí.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await saveAnnouncement({
        title: title.trim(),
        content: content.trim(),
        type,
        targetType,
        targetRoomId: targetType === 'SPECIFIC_ROOM' ? targetRoomId : null,
        startTime,
        endTime,
        isPinned: isPinned ? 1 : 0
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyZaloBroadcast = () => {
    const text = `📢 THÔNG BÁO TỪ CHỦ NHÀ TRỌ
------------------------------------
📌 ${title}
⏰ Thời gian: Từ ${startTime} đến ${endTime}
👥 Đối tượng: ${targetType === 'ALL' ? 'Toàn bộ 6 phòng trọ' : `Phòng ${rooms.find(r => r.id === targetRoomId)?.name || ''}`}
📝 Chi tiết dặn dò:
${content}
------------------------------------
Mong mọi người chú ý và phối hợp. Xin cảm ơn!`;

    navigator.clipboard.writeText(text);
    setCopiedZaloId();
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-800 text-lg">
              Phát Thông Báo Cho Người Thuê Trọ
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
          
          {/* Preset Buttons for Quick Announcement */}
          <div>
            <label className="font-bold text-slate-700 block mb-1.5">
              Chọn nhanh loại thông báo phổ biến:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('OUTAGE_ELECTRIC')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  type === 'OUTAGE_ELECTRIC'
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                Cúp Điện
              </button>

              <button
                type="button"
                onClick={() => applyPreset('OUTAGE_WATER')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  type === 'OUTAGE_WATER'
                    ? 'bg-cyan-100 border-cyan-300 text-cyan-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Droplet className="w-3.5 h-3.5 text-cyan-600" />
                Cúp Nước
              </button>

              <button
                type="button"
                onClick={() => applyPreset('URGENT')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  type === 'URGENT'
                    ? 'bg-rose-100 border-rose-300 text-rose-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Khẩn Cấp
              </button>

              <button
                type="button"
                onClick={() => applyPreset('GENERAL')}
                className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  type === 'GENERAL'
                    ? 'bg-blue-100 border-blue-300 text-blue-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Bell className="w-3.5 h-3.5 text-blue-600" />
                Nhắc Nhở
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Tiêu đề thông báo *
            </label>
            <input
              type="text"
              placeholder="vd: Thông báo cúp điện ngày 05/11, Tạm cắt nước rửa bồn..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500 font-bold"
              required
            />
          </div>

          {/* Target Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Gửi tới đối tượng
              </label>
              <select
                value={targetType}
                onChange={e => setTargetType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-semibold"
              >
                <option value="ALL">📢 Gửi tất cả 6 phòng trọ</option>
                <option value="SPECIFIC_ROOM">👤 Gửi riêng cho 1 phòng cụ thể</option>
              </select>
            </div>

            {targetType === 'SPECIFIC_ROOM' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chọn phòng nhận tin
                </label>
                <select
                  value={targetRoomId}
                  onChange={e => setTargetRoomId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-bold"
                >
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Timeframe of Outage / Event */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
            <div>
              <label className="font-semibold text-amber-900 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Thời gian bắt đầu:
              </label>
              <input
                type="text"
                placeholder="08:00 - 05/11/2026"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="font-semibold text-amber-900 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Dự kiến kết thúc:
              </label>
              <input
                type="text"
                placeholder="11:30 - 05/11/2026"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          </div>

          {/* Content / Advice */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Nội dung thông báo & Lời dặn dò người thuê *
            </label>
            <textarea
              rows={4}
              placeholder="Nhắc nhở người thuê chuẩn bị trữ nước, sạc pin điện thoại, tắt các thiết bị trước giờ cúp..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500"
              required
            />
          </div>

          {/* Pin to Top Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded-md text-amber-600 border-slate-300"
              />
              <span className="font-semibold text-slate-800">
                Ghim thông báo lên đầu trang khách thuê (Hiện banner cảnh báo nổi bật)
              </span>
            </label>

            {title && (
              <button
                type="button"
                onClick={handleCopyZaloBroadcast}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                  copiedZalo ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {copiedZalo ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-blue-600" />}
                {copiedZalo ? 'Đã sao chép!' : 'Chép gửi Zalo'}
              </button>
            )}
          </div>

          {/* Action Buttons */}
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
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {saving ? 'Đang gửi...' : 'Phát Thông Báo Ngay'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
