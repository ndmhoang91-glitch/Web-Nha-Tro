import React, { useState, useEffect } from 'react';
import { X, UserPlus, Upload, Shield, Check, Image as ImageIcon, CreditCard } from 'lucide-react';
import { saveTenant } from '../api';

export default function TenantModal({
  tenant,
  rooms = [],
  onClose,
  onSaved
}) {
  const [roomId, setRoomId] = useState(rooms[0]?.id || 1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123');
  const [idCardNumber, setIdCardNumber] = useState('');
  const [idCardDate, setIdCardDate] = useState('');
  const [idCardPlace, setIdCardPlace] = useState('Cục Cảnh sát QLHC về TTXH');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Nam');
  const [hometown, setHometown] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [deposit, setDeposit] = useState(1500000);
  const [isRepresentative, setIsRepresentative] = useState(true);
  const [status, setStatus] = useState('ACTIVE');
  const [notes, setNotes] = useState('');

  // Files & Previews
  const [frontFile, setFrontFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [backFile, setBackFile] = useState(null);
  const [backPreview, setBackPreview] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setRoomId(tenant.roomId || rooms[0]?.id || 1);
      setFullName(tenant.fullName || '');
      setPhone(tenant.phone || '');
      setPassword(tenant.password || '123');
      setIdCardNumber(tenant.idCardNumber || '');
      setIdCardDate(tenant.idCardDate || '');
      setIdCardPlace(tenant.idCardPlace || 'Cục Cảnh sát QLHC về TTXH');
      setDateOfBirth(tenant.dateOfBirth || '');
      setGender(tenant.gender || 'Nam');
      setHometown(tenant.hometown || '');
      setLicensePlate(tenant.licensePlate || '');
      setStartDate(tenant.startDate || new Date().toISOString().slice(0, 10));
      setDeposit(tenant.deposit ?? 1500000);
      setIsRepresentative(tenant.isRepresentative === 1 || tenant.isRepresentative === true);
      setStatus(tenant.status || 'ACTIVE');
      setNotes(tenant.notes || '');
      setFrontPreview(tenant.idCardFrontUrl || '');
      setBackPreview(tenant.idCardBackUrl || '');
    }
  }, [tenant, rooms]);

  const handleFrontChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
    }
  };

  const handleBackChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const form = new FormData();
      form.append('roomId', roomId);
      form.append('fullName', fullName);
      form.append('phone', phone);
      form.append('password', password);
      form.append('idCardNumber', idCardNumber);
      form.append('idCardDate', idCardDate);
      form.append('idCardPlace', idCardPlace);
      form.append('dateOfBirth', dateOfBirth);
      form.append('gender', gender);
      form.append('hometown', hometown);
      form.append('licensePlate', licensePlate);
      form.append('startDate', startDate);
      form.append('deposit', deposit);
      form.append('isRepresentative', isRepresentative ? '1' : '0');
      form.append('status', status);
      form.append('notes', notes);

      if (frontFile) {
        form.append('idCardFront', frontFile);
      }
      if (backFile) {
        form.append('idCardBack', backFile);
      }

      await saveTenant(form, tenant?.id);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      alert('Lỗi lưu khách trọ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-lg">
              {tenant ? 'Chỉnh Sửa Thông Tin & CCCD Khách Trọ' : 'Thêm Khách Trọ Mới & Lưu Trữ CCCD'}
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Room & Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phòng trọ *
              </label>
              <select
                value={roomId}
                onChange={e => setRoomId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-semibold"
                required
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Họ và tên khách *
              </label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Số điện thoại (Tài khoản đăng nhập) *
              </label>
              <input
                type="tel"
                placeholder="0988123456"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-mono font-bold"
                required
              />
            </div>
          </div>

          {/* CCCD Information Archive */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-sm">
              <CreditCard className="w-4 h-4 text-blue-600" />
              Lưu Trữ Căn Cước Công Dân (CCCD / CMND)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1">Số CCCD (12 số)</label>
                <input
                  type="text"
                  placeholder="0792 0100 xxxx"
                  value={idCardNumber}
                  onChange={e => setIdCardNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg focus:outline-hidden focus:border-blue-500 font-mono font-semibold"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Ngày cấp</label>
                <input
                  type="date"
                  value={idCardDate}
                  onChange={e => setIdCardDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1">Nơi cấp</label>
                <input
                  type="text"
                  value={idCardPlace}
                  onChange={e => setIdCardPlace(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-blue-200 rounded-lg focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {/* Photo Upload: Front & Back */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Front Photo */}
              <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-2">
                <span className="font-semibold text-slate-700 block">Ảnh Mặt Trước CCCD</span>
                <div className="h-32 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                  {frontPreview ? (
                    <img src={frontPreview} alt="Mặt trước" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400 p-2">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      <span>Chưa có ảnh</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFrontChange}
                  className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              {/* Back Photo */}
              <div className="bg-white p-3 rounded-xl border border-blue-200 space-y-2">
                <span className="font-semibold text-slate-700 block">Ảnh Mặt Sau CCCD</span>
                <div className="h-32 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
                  {backPreview ? (
                    <img src={backPreview} alt="Mặt sau" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center text-slate-400 p-2">
                      <ImageIcon className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      <span>Chưa có ảnh</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackChange}
                  className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Personal & Contract Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-700 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={e => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1">Giới tính</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 mb-1">Quê quán</label>
              <input
                type="text"
                placeholder="Tỉnh/Thành phố"
                value={hometown}
                onChange={e => setHometown(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1">Biển số xe</label>
              <input
                type="text"
                placeholder="62-F1 123.45"
                value={licensePlate}
                onChange={e => setLicensePlate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500 uppercase font-mono"
              />
            </div>
          </div>

          {/* Lease Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 mb-1">Ngày bắt đầu thuê</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1">Tiền đặt cọc (đ)</label>
              <input
                type="number"
                value={deposit}
                onChange={e => setDeposit(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500 font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-700 mb-1">Mật khẩu khách đăng nhập</label>
              <input
                type="text"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Representative & Notes */}
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRepresentative}
                onChange={e => setIsRepresentative(e.target.checked)}
                className="w-4 h-4 rounded-md text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <span className="font-semibold text-slate-800">Là người đại diện phòng (Nhận hóa đơn & ký hợp đồng)</span>
            </label>
          </div>

          <div>
            <label className="block text-slate-700 mb-1">Ghi chú về khách</label>
            <textarea
              rows={2}
              placeholder="Ghi chú nghề nghiệp, giờ giấc làm việc, đồ dùng mang vào..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Submit */}
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
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Đang lưu...' : 'Lưu Hồ Sơ Khách Trọ'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
