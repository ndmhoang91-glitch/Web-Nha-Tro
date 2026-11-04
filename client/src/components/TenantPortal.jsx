import React, { useState, useEffect } from 'react';
import {
  Home, CreditCard, QrCode, Upload, CheckCircle2, Clock, AlertCircle,
  FileText, History, Wrench, ShieldCheck, Copy, Check, Eye, ExternalLink,
  ChevronRight, Calendar, UserCheck, MessageSquare, AlertTriangle, Bell, Zap, Droplet
} from 'lucide-react';
import { formatVND, getVietQRUrl, submitProof, submitRequest, fetchRequests, fetchInvoices } from '../api';
import confetti from 'canvas-confetti';

export default function TenantPortal({
  selectedRoomId,
  setSelectedRoomId,
  rooms = [],
  invoices = [],
  tenants = [],
  proofs = [],
  announcements = [],
  settings = {},
  currentMonth,
  currentUser = null,
  onRefresh,
  onOpenInvoiceModal
}) {
  const [activeSubTab, setActiveSubTab] = useState('currentBill'); // currentBill, announcements, history, cccd, requests
  
  // Current selected room and representative tenant
  const currentRoom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
  const currentTenant = tenants.find(t => t.roomId === currentRoom?.id && t.isRepresentative) || tenants.find(t => t.roomId === currentRoom?.id);
  const roomTenants = tenants.filter(t => t.roomId === currentRoom?.id && t.status === 'ACTIVE');

  // Announcements for this room
  const relevantAnnouncements = announcements.filter(a => a.targetType === 'ALL' || a.targetRoomId === currentRoom?.id);
  const hasOutage = relevantAnnouncements.some(a => a.type === 'OUTAGE_ELECTRIC' || a.type === 'OUTAGE_WATER' || a.type === 'URGENT');

  // All historical invoices for this room
  const [allRoomInvoices, setAllRoomInvoices] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  useEffect(() => {
    setSelectedMonth(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    if (currentRoom?.id) {
      fetchInvoices({ roomId: currentRoom.id }).then(res => {
        if (Array.isArray(res) && res.length > 0) {
          setAllRoomInvoices(res);
        }
      }).catch(console.error);
    }
  }, [currentRoom?.id]);

  // Combined room invoices
  const roomInvoices = allRoomInvoices.length > 0
    ? allRoomInvoices
    : invoices.filter(i => i.roomId === currentRoom?.id);

  const currentInvoice = roomInvoices.find(i => i.month === selectedMonth) || roomInvoices.find(i => i.month === currentMonth) || roomInvoices[0];

  const roomRentTotal = (Number(currentInvoice?.roomPrice) || 0) + (Number(currentInvoice?.wifiFee) || 0);
  const utilitiesTotal = (Number(currentInvoice?.electricityCost) || 0) + (Number(currentInvoice?.waterCost) || 0) + (Number(currentInvoice?.totalExtraFee) || 0) - (Number(currentInvoice?.discount) || 0);

  const isRoomRentPaid = Boolean(currentInvoice && currentInvoice.paidAmount >= roomRentTotal);
  const isUtilitiesPending = Boolean(currentInvoice && isRoomRentPaid && currentInvoice.remainingAmount > 0);
  const isAllPaid = Boolean(currentInvoice && (currentInvoice.status === 'PAID' || currentInvoice.remainingAmount <= 0));

  const payAmount = currentInvoice
    ? (currentInvoice.remainingAmount > 0 ? currentInvoice.remainingAmount : currentInvoice.totalAmount)
    : 0;

  const memoType = isUtilitiesPending ? 'DIEN NUOC' : 'TIEN TRO';

  // Proofs submitted for this room
  const roomProofs = proofs.filter(p => p.roomId === currentRoom?.id);
  const currentProof = currentInvoice ? roomProofs.find(p => p.invoiceId === currentInvoice.id) : null;

  // Upload proof form
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');
  const [transCode, setTransCode] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Maintenance request form
  const [requests, setRequests] = useState([]);

  if (!rooms || rooms.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto my-8">
        <Home className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="font-bold text-slate-800 text-lg">Chưa có dữ liệu phòng trọ</h3>
        <p className="text-xs text-slate-500 mt-2">
          Hệ thống hiện chưa có phòng trọ nào. Vui lòng chuyển sang giao diện Quản Lý ở góc trên để tạo phòng trọ mới.
        </p>
      </div>
    );
  }
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [submittingReq, setSubmittingReq] = useState(false);

  useEffect(() => {
    if (currentRoom?.id) {
      fetchRequests({ roomId: currentRoom.id }).then(setRequests).catch(console.error);
    }
  }, [currentRoom?.id]);

  const handleProofFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!currentInvoice) return;
    if (!proofFile && !proofPreview) {
      alert('Vui lòng chọn ảnh chụp màn hình biên lai chuyển khoản!');
      return;
    }

    setUploadingProof(true);
    try {
      const form = new FormData();
      form.append('invoiceId', currentInvoice.id);
      form.append('roomId', currentRoom.id);
      form.append('tenantId', currentTenant?.id || '');
      form.append('amount', currentInvoice.remainingAmount > 0 ? currentInvoice.remainingAmount : currentInvoice.totalAmount);
      form.append('paymentMethod', 'BANK_TRANSFER');
      form.append('transactionCode', transCode);
      form.append('paymentDate', new Date().toLocaleString('vi-VN'));
      form.append('submittedBy', 'TENANT');
      if (proofFile) {
        form.append('proofImage', proofFile);
      }

      await submitProof(form);
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      alert('Đã gửi chứng từ thanh toán thành công! Chủ trọ sẽ đối soát và cập nhật hoàn tất.');
      setProofFile(null);
      setProofPreview('');
      setTransCode('');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Lỗi gửi chứng từ: ' + err.message);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(settings.bankAccount || '');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!reqTitle.trim()) return;
    setSubmittingReq(true);
    try {
      await submitRequest({
        roomId: currentRoom.id,
        tenantId: currentTenant?.id || null,
        title: reqTitle.trim(),
        description: reqDesc.trim()
      });
      alert('Đã gửi thông báo báo hỏng cho chủ trọ!');
      setReqTitle('');
      setReqDesc('');
      const updated = await fetchRequests({ roomId: currentRoom.id });
      setRequests(updated);
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmittingReq(false);
    }
  };

  const qrUrl = currentInvoice ? getVietQRUrl(
    settings.bankName,
    settings.bankAccount,
    settings.bankOwner,
    payAmount,
    `${currentRoom?.name?.replace(/[^0-9]/g, 'P') || 'P'} ${memoType} T${currentInvoice?.month?.replace('-', '')}`
  ) : '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Room Profile Banner */}
      <div className="bg-linear-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 pointer-events-none transform skew-x-12"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                Tài Khoản Khách Thuê
              </span>
              <span className="text-emerald-300 text-xs">Tầng {currentRoom?.floor || 1}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {currentRoom?.name} - {currentTenant?.fullName || 'Khách thuê trọ'}
            </h2>
            <p className="text-xs text-emerald-200/90 mt-1 flex items-center gap-3">
              <span>SĐT: <strong className="font-mono text-white">{currentTenant?.phone || 'Chưa cập nhật'}</strong></span>
              <span>•</span>
              <span>Tiền cọc: <strong className="text-amber-300 font-bold">{formatVND(currentTenant?.deposit || 1500000)}</strong></span>
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-emerald-700/40 text-xs">
              <span className="bg-emerald-800/80 text-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-600/50 flex items-center gap-1.5">
                📅 Ngày ký HĐ: <strong className="text-white">{currentTenant?.startDate ? new Date(currentTenant.startDate).toLocaleDateString('vi-VN') : '---'}</strong>
              </span>
              <span className="bg-blue-900/60 text-blue-200 px-2.5 py-1 rounded-lg border border-blue-500/40 flex items-center gap-1.5">
                🏠 Tiền phòng: Thu ngày <strong className="text-white">{currentInvoice?.rentDueDay || (currentTenant?.startDate ? new Date(currentTenant.startDate).getDate() : 1)} hàng tháng</strong>
              </span>
              <span className="bg-amber-900/60 text-amber-200 px-2.5 py-1 rounded-lg border border-amber-500/40 flex items-center gap-1.5">
                ⚡ Điện nước: Thu ngày <strong className="text-white">1 Tây hàng tháng</strong>
              </span>
            </div>
          </div>

          {/* Quick Room Switcher (Only visible to Landlord Manager when previewing!) */}
          {currentUser?.role === 'MANAGER' && (
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shrink-0">
              <label className="text-[11px] text-emerald-200 block mb-1 font-semibold">Xem thử phòng khác:</label>
              <select
                value={selectedRoomId || currentRoom?.id}
                onChange={e => setSelectedRoomId(Number(e.target.value))}
                className="bg-emerald-950 text-white font-bold text-xs px-3 py-1.5 rounded-xl border border-emerald-700 outline-hidden cursor-pointer"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.representativeName ? `(${r.representativeName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-emerald-700/50 overflow-x-auto">
          {[
            { id: 'currentBill', label: 'Hóa Đơn Tháng Này', icon: FileText },
            { id: 'announcements', label: 'Bảng Tin & Thông Báo', icon: Bell, count: relevantAnnouncements.length, alert: hasOutage },
            { id: 'history', label: 'Lịch Sử Đã Đóng Chi Phí', icon: History, count: roomInvoices.length },
            { id: 'cccd', label: 'Hồ Sơ CCCD & Hợp Đồng', icon: ShieldCheck },
            { id: 'requests', label: 'Báo Hỏng Hóc / Sửa Đồ', icon: Wrench, count: requests.length },
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white text-emerald-900 shadow-md'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.alert && !active ? 'text-amber-300 animate-bounce' : ''}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    active
                      ? 'bg-emerald-100 text-emerald-900'
                      : tab.alert
                      ? 'bg-amber-400 text-amber-950 font-black'
                      : 'bg-emerald-950/60 text-emerald-200'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Outage / Urgent Notice Warning Banner (Always visible on all tabs if active!) */}
      {relevantAnnouncements.length > 0 && (
        <div className="space-y-3">
          {relevantAnnouncements.slice(0, 2).map(ann => {
            const isElectric = ann.type === 'OUTAGE_ELECTRIC';
            const isWater = ann.type === 'OUTAGE_WATER';
            const isUrgent = ann.type === 'URGENT';

            return (
              <div
                key={ann.id}
                className={`p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isElectric
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : isWater
                    ? 'bg-cyan-50 border-cyan-300 text-cyan-950'
                    : isUrgent
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-blue-50 border-blue-300 text-blue-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                    isElectric ? 'bg-amber-500' : isWater ? 'bg-cyan-600' : isUrgent ? 'bg-rose-600' : 'bg-blue-600'
                  }`}>
                    {isElectric ? <Zap className="w-6 h-6 animate-pulse" /> : isWater ? <Droplet className="w-6 h-6 animate-pulse" /> : isUrgent ? <AlertTriangle className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isElectric ? 'bg-amber-200 text-amber-950' : isWater ? 'bg-cyan-200 text-cyan-950' : 'bg-rose-200 text-rose-950'
                      }`}>
                        {isElectric ? '⚡ Thông Báo Cúp Điện' : isWater ? '💧 Thông Báo Cúp Nước' : '🚨 Thông Báo Khẩn'}
                      </span>
                      <span className="font-bold text-sm sm:text-base text-slate-900">{ann.title}</span>
                    </div>

                    {(ann.startTime || ann.endTime) && (
                      <div className="text-xs font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Thời gian cúp dự kiến:</span>
                        <strong className="font-mono text-rose-700">{ann.startTime} {ann.endTime ? `➔ ${ann.endTime}` : ''}</strong>
                      </div>
                    )}
                    <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                      {ann.content}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('announcements')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 shadow-2xs transition-colors shrink-0"
                >
                  Xem Lời Dặn Dò
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 1: CURRENT BILL & PAYMENT */}
      {/* ======================================================== */}
      {activeSubTab === 'currentBill' && (
        <div className="space-y-6">
          
          {currentInvoice ? (
            <>
              {/* Quick Month Switcher for Room Invoices */}
              {roomInvoices.length > 1 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-700 font-bold">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Chọn kỳ hóa đơn phòng:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {roomInvoices.map(inv => {
                      const invRoomRent = (Number(inv.roomPrice) || 0) + (Number(inv.wifiFee) || 0);
                      const invPaid = Boolean(inv.status === 'PAID' || inv.remainingAmount <= 0);
                      const invRoomPaid = Boolean(inv.paidAmount >= invRoomRent && inv.remainingAmount > 0);
                      const isCurrentActive = inv.month === (currentInvoice?.month);

                      return (
                        <button
                          key={inv.id}
                          type="button"
                          onClick={() => setSelectedMonth(inv.month)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isCurrentActive
                              ? 'bg-emerald-800 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <span>Tháng {inv.month?.slice(5)}/{inv.month?.slice(0, 4)}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            invPaid
                              ? (isCurrentActive ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800')
                              : invRoomPaid
                              ? (isCurrentActive ? 'bg-amber-400 text-amber-950 font-black' : 'bg-amber-100 text-amber-900')
                              : (isCurrentActive ? 'bg-rose-400 text-rose-950 font-black' : 'bg-rose-100 text-rose-800')
                          }`}>
                            {invPaid
                              ? '✓ Đã xong'
                              : invRoomPaid
                              ? `⚡ Điện Nước: ${formatVND(inv.remainingAmount)}`
                              : `🏠 Tiền Phòng: ${formatVND(inv.remainingAmount)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Status Alert Banner */}
              <div className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                isAllPaid
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : currentInvoice.status === 'PENDING_APPROVAL'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : isUtilitiesPending
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 text-amber-950 shadow-xs'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    isAllPaid
                      ? 'bg-emerald-600 text-white'
                      : currentInvoice.status === 'PENDING_APPROVAL'
                      ? 'bg-amber-500 text-white animate-pulse'
                      : isUtilitiesPending
                      ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white'
                      : 'bg-rose-600 text-white'
                  }`}>
                    {isAllPaid ? (
                      <CheckCircle2 className="w-7 h-7" />
                    ) : currentInvoice.status === 'PENDING_APPROVAL' ? (
                      <Clock className="w-7 h-7" />
                    ) : isUtilitiesPending ? (
                      <Zap className="w-7 h-7" />
                    ) : (
                      <AlertTriangle className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {isAllPaid
                          ? '✓ Đã Thanh Toán Hoàn Tất'
                          : currentInvoice.status === 'PENDING_APPROVAL'
                          ? '⏳ Đang Chờ Chủ Trọ Đối Soát Tiền'
                          : isUtilitiesPending
                          ? '⚡ Cần Thanh Toán Tiền Điện & Nước (Chốt Ngày 1 Tây)'
                          : '⚠️ Cần Thanh Toán Tiền Trọ Theo Hợp Đồng'}
                      </span>
                      {isUtilitiesPending && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          ✓ Tiền phòng đã đóng ngày {currentInvoice.paidDate ? new Date(currentInvoice.paidDate).toLocaleDateString('vi-VN') : 'theo HĐ'}
                        </span>
                      )}
                    </div>
                    <div className="text-xl sm:text-2xl font-black mt-0.5">
                      {isAllPaid
                        ? formatVND(currentInvoice.totalAmount)
                        : `Còn phải nộp: ${formatVND(currentInvoice.remainingAmount)}`}
                    </div>
                    <p className="text-xs opacity-90 mt-0.5">
                      {isAllPaid
                        ? `Hoàn tất lúc: ${currentInvoice.paidDate || 'Hôm nay'}. Đã lưu chứng từ đối soát an toàn.`
                        : currentInvoice.status === 'PENDING_APPROVAL'
                        ? 'Bạn đã tải lên biên lai chuyển khoản. Chủ trọ đang kiểm tra biến động số dư tài khoản để duyệt.'
                        : isUtilitiesPending
                        ? `Kỳ Tháng ${currentInvoice.month?.slice(5)}/${currentInvoice.month?.slice(0, 4)}: Tiền phòng đã thanh toán đủ. Đây là tiền điện (chốt 1/11: ${currentInvoice.electricityUsage} kWh) & nước (chốt 20/10: ${currentInvoice.waterUsage} m³) thu vào đầu tháng ngày 1 Tây.`
                        : `Kỳ thanh toán Tháng ${currentInvoice.month?.slice(5)}/${currentInvoice.month?.slice(0, 4)} • Hạn đóng ngày ${currentInvoice.rentDueDay || 1} hàng tháng theo HĐ`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenInvoiceModal(currentInvoice)}
                  className="px-4 py-2 bg-white rounded-xl text-xs font-bold shadow-xs border border-slate-200 text-slate-800 hover:bg-slate-50 transition-colors shrink-0"
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1 text-blue-600" />
                  Xem Phiếu Thu Chi Tiết
                </button>
              </div>

              {/* Bill Details Breakdown Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Chi Tiết Các Chi Phí Tháng {currentInvoice.month?.slice(5)}/{currentInvoice.month?.slice(0, 4)}
                  </h3>
                  <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-600">
                    {currentInvoice.invoiceCode}
                  </span>
                </div>

                {/* 5 Clear Cost Rows */}
                <div className="space-y-3 text-xs">
                  
                  {/* 1. Tiền phòng */}
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${
                    isRoomRentPaid
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 block text-sm">1. Tiền thuê phòng trọ</span>
                        {isRoomRentPaid && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Đã đóng theo HĐ {currentInvoice.paidDate ? `(${new Date(currentInvoice.paidDate).toLocaleDateString('vi-VN')})` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-blue-700 text-[11px] font-medium block">
                        Kỳ: {currentInvoice.rentCycleStr || (currentInvoice.schedule?.rentCycleStr) || '1 tháng'} • Thu ngày {currentInvoice.rentDueDay || 1} hàng tháng
                      </span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{formatVND(currentInvoice.roomPrice)}</span>
                  </div>

                  {/* 2. Tiền điện */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 text-sm">
                        <span>2. Tiền điện sinh hoạt</span>
                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-sm font-semibold">4.000 đ/kW</span>
                        <span className="bg-white text-amber-900 text-[10px] px-1.5 py-0.2 rounded-sm border border-amber-200">Chốt ngày 1 Tây</span>
                        {isUtilitiesPending && (
                          <span className="bg-amber-200 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-sm font-bold">⚡ Cần nộp</span>
                        )}
                      </div>
                      <span className="text-slate-600 text-[11px] font-mono">
                        Số cũ: <strong>{currentInvoice.oldElectricity}</strong> ➔ Số mới: <strong>{currentInvoice.newElectricity}</strong> = <strong className="text-amber-800">{currentInvoice.electricityUsage} kWh</strong>
                      </span>
                    </div>
                    <span className="text-sm font-black text-amber-950">{formatVND(currentInvoice.electricityCost)}</span>
                  </div>

                  {/* 3. Tiền nước */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-50/60 border border-cyan-200">
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-cyan-900 text-sm">
                        <span>3. Tiền nước sinh hoạt</span>
                        <span className="bg-cyan-100 text-cyan-800 text-[10px] px-1.5 py-0.2 rounded-sm font-semibold">12.000 đ/khối</span>
                        <span className="bg-white text-cyan-900 text-[10px] px-1.5 py-0.2 rounded-sm border border-cyan-200">Chốt ngày 20 Tây</span>
                        {isUtilitiesPending && (
                          <span className="bg-cyan-200 text-cyan-950 text-[10px] px-1.5 py-0.2 rounded-sm font-bold">💧 Cần nộp</span>
                        )}
                      </div>
                      <span className="text-slate-600 text-[11px] font-mono">
                        Số cũ: <strong>{currentInvoice.oldWater}</strong> ➔ Số mới: <strong>{currentInvoice.newWater}</strong> = <strong className="text-cyan-800">{currentInvoice.waterUsage} m³</strong>
                      </span>
                    </div>
                    <span className="text-sm font-black text-cyan-950">{formatVND(currentInvoice.waterCost)}</span>
                  </div>

                  {/* 4. Wifi */}
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${
                    isRoomRentPaid
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-slate-50 border-slate-100'
                  }`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 block text-sm">4. Phí mạng Internet / Wifi</span>
                        {isRoomRentPaid && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Đã đóng theo HĐ
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[11px]">Cáp quang tốc độ cao chia phòng</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{formatVND(currentInvoice.wifiFee)}</span>
                  </div>

                  {/* 5. Phụ phí khác nếu có */}
                  {currentInvoice.extraFees && currentInvoice.extraFees.map((fee, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">5.{idx + 1}. {fee.name}</span>
                        <span className="text-slate-500 text-[11px]">Phí dịch vụ phát sinh</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{formatVND(fee.amount)}</span>
                    </div>
                  ))}

                  {/* Discount if any */}
                  {currentInvoice.discount > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                      <span className="font-bold text-sm">Giảm trừ khuyến mại</span>
                      <span className="text-sm font-black">-{formatVND(currentInvoice.discount)}</span>
                    </div>
                  )}

                  {/* Total & Paid Breakdown */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm uppercase tracking-wider text-slate-300">Tổng cộng chi phí kỳ này:</span>
                      <span className="text-xl font-black text-amber-300">{formatVND(currentInvoice.totalAmount)}</span>
                    </div>

                    {currentInvoice.paidAmount > 0 && (
                      <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold pt-1 border-t border-slate-800">
                        <span>Đã thanh toán (Tiền phòng & Wifi theo HĐ):</span>
                        <span className="font-mono font-bold">-{formatVND(currentInvoice.paidAmount)}</span>
                      </div>
                    )}

                    {currentInvoice.remainingAmount > 0 && currentInvoice.paidAmount > 0 && (
                      <div className="flex items-center justify-between text-sm text-rose-300 font-black pt-1 border-t border-slate-700">
                        <span className="uppercase tracking-wide text-xs">
                          {isUtilitiesPending ? '⚡ Còn phải nộp (Điện & Nước chốt 1 Tây):' : 'Còn phải nộp:'}
                        </span>
                        <span className="text-base text-rose-400 font-black">{formatVND(currentInvoice.remainingAmount)}</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* VietQR Quick Scan & Bank Transfer */}
              {currentInvoice.status !== 'PAID' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-blue-600" />
                        Quét Mã QR Chuyển Khoản Tự Động (VietQR) - {isUtilitiesPending ? 'Tiền Điện & Nước (1 Tây)' : 'Tiền Trọ Theo HĐ'}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {isUtilitiesPending
                          ? 'Tiền phòng đã đóng đủ. Quét mã QR dưới đây để thanh toán riêng tiền điện nước chốt ngày 1 Tây.'
                          : 'Chỉ cần mở app ngân hàng bất kỳ (Momo, Vietcombank, MB, Techcombank...) quét mã để thanh toán đúng số tiền và cú pháp'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="w-48 h-48 bg-white p-2.5 rounded-xl shadow-xs border border-slate-200 shrink-0 flex items-center justify-center">
                      <img src={qrUrl} alt="VietQR" className="w-full h-full object-contain" />
                    </div>

                    <div className="space-y-2 text-xs text-slate-700 flex-1">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Ngân hàng:</span>
                          <strong className="text-slate-900 font-bold">{settings.bankName}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Chủ tài khoản:</span>
                          <strong className="text-slate-900 font-bold">{settings.bankOwner}</strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500">Số tài khoản:</span>
                          <div className="flex items-center gap-1.5">
                            <strong className="font-mono text-blue-700 text-sm font-black">{settings.bankAccount}</strong>
                            <button
                              type="button"
                              onClick={handleCopyAccount}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold"
                            >
                              {copiedAccount ? 'Đã sao chép' : 'Sao chép'}
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500">Nội dung chuyển khoản:</span>
                          <strong className="font-mono text-emerald-700 font-bold">
                            {currentRoom?.name?.replace(/[^0-9]/g, 'P') || 'P'} {memoType} T{currentInvoice?.month?.replace('-', '')}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500">
                            {isUtilitiesPending ? 'Số tiền chuyển (Điện Nước):' : 'Số tiền chuyển:'}
                          </span>
                          <strong className="text-rose-600 font-black text-sm">
                            {formatVND(payAmount)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Payment Receipt / Proof Section */}
              {currentInvoice.status !== 'PAID' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Upload className="w-5 h-5 text-emerald-600" />
                      Gửi Ảnh Biên Lai / Chứng Từ Thanh Toán Cho Chủ Trọ
                    </h4>
                    <p className="text-xs text-slate-500">
                      Sau khi chuyển khoản ngân hàng thành công, vui lòng chụp màn hình và tải lên để chủ trọ đối soát xác nhận
                    </p>
                  </div>

                  <form onSubmit={handleUploadProof} className="space-y-4 text-xs">
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-800 block">
                          Chọn ảnh chụp màn hình ngân hàng:
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProofFileChange}
                          className="text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                          required
                        />
                      </div>

                      {proofPreview && (
                        <div className="w-24 h-24 bg-white rounded-xl border border-slate-200 overflow-hidden shrink-0">
                          <img src={proofPreview} alt="Preview" className="w-full h-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-700 font-semibold block mb-1">
                          Mã giao dịch ngân hàng (nếu có):
                        </label>
                        <input
                          type="text"
                          placeholder="vd: FT2611..., VCB998..."
                          value={transCode}
                          onChange={e => setTransCode(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={uploadingProof}
                        className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {uploadingProof ? 'Đang tải lên...' : 'Xác Nhận & Gửi Chứng Từ Cho Chủ Trọ'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Show uploaded proof preview if pending approval */}
              {currentProof && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {currentProof.proofImageUrl && (
                      <a href={currentProof.proofImageUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={currentProof.proofImageUrl}
                          alt="Chứng từ đã nộp"
                          className="w-16 h-16 object-contain rounded-lg border border-amber-200 bg-white shadow-2xs"
                        />
                      </a>
                    )}
                    <div>
                      <span className="font-bold text-amber-950 text-xs block">
                        Chứng từ bạn đã nộp: {formatVND(currentProof.amount)}
                      </span>
                      <span className="text-[11px] text-amber-800">
                        Thời gian: {currentProof.paymentDate} • Mã: {currentProof.transactionCode || 'N/A'}
                      </span>
                      <div className="text-[11px] font-bold text-amber-700 mt-0.5">
                        Trạng thái: {currentProof.status === 'APPROVED' ? '✓ Đã duyệt thành công' : currentProof.status === 'PENDING' ? '⏳ Đang chờ chủ trọ duyệt' : '❌ Cần kiểm tra lại'}
                      </div>
                    </div>
                  </div>
                  <a
                    href={currentProof.proofImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-amber-900 bg-amber-200/80 px-3 py-1.5 rounded-lg hover:bg-amber-300"
                  >
                    Xem ảnh gốc
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              Phòng này chưa phát sinh hóa đơn trong tháng này.
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB: ANNOUNCEMENTS (BẢNG TIN & THÔNG BÁO TỪ CHỦ TRỌ) */}
      {/* ======================================================== */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              Bảng Tin & Lịch Thông Báo Từ Chủ Nhà Trọ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Thông báo chính thức về lịch cúp điện, cúp nước máy, sửa chữa thiết bị và quy định nhà trọ
            </p>
          </div>

          <div className="space-y-4">
            {relevantAnnouncements.map(ann => {
              const isElectric = ann.type === 'OUTAGE_ELECTRIC';
              const isWater = ann.type === 'OUTAGE_WATER';
              const isUrgent = ann.type === 'URGENT';

              return (
                <div
                  key={ann.id}
                  className={`rounded-2xl border p-5 shadow-xs transition-all ${
                    isElectric
                      ? 'bg-amber-50/60 border-amber-300'
                      : isWater
                      ? 'bg-cyan-50/60 border-cyan-300'
                      : isUrgent
                      ? 'bg-rose-50/60 border-rose-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${
                        isElectric
                          ? 'bg-amber-200 text-amber-950'
                          : isWater
                          ? 'bg-cyan-200 text-cyan-950'
                          : isUrgent
                          ? 'bg-rose-200 text-rose-950'
                          : 'bg-blue-100 text-blue-900'
                      }`}>
                        {isElectric ? <Zap className="w-4 h-4 text-amber-700" /> : isWater ? <Droplet className="w-4 h-4 text-cyan-700" /> : isUrgent ? <AlertTriangle className="w-4 h-4 text-rose-700" /> : <Bell className="w-4 h-4 text-blue-700" />}
                        {isElectric ? 'Thông Báo Cúp Điện' : isWater ? 'Thông Báo Cúp Nước' : isUrgent ? 'Khẩn Cấp' : 'Thông Báo'}
                      </span>

                      <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                        {ann.targetType === 'ALL' ? 'Gửi toàn bộ 6 phòng' : `Gửi riêng cho ${currentRoom?.name}`}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {ann.createdAt}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-slate-900 mb-2">
                    {ann.title}
                  </h4>

                  {/* Outage time banner */}
                  {(ann.startTime || ann.endTime) && (
                    <div className="bg-white p-3 rounded-xl border border-slate-200 mb-3 flex items-center gap-2 text-xs">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-slate-600 font-medium">Khung giờ cúp dự kiến:</span>
                      <strong className="font-mono text-sm text-rose-700 font-bold">
                        {ann.startTime} {ann.endTime ? `➔ ${ann.endTime}` : ''}
                      </strong>
                    </div>
                  )}

                  {/* Body text */}
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line mb-3">
                    {ann.content}
                  </div>

                  {/* Helpful landlord tips */}
                  <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-base shrink-0">💡</span>
                    <div>
                      <strong className="text-slate-800">Lưu ý cho khách trọ: </strong>
                      {isElectric ? (
                        <span>Vui lòng tranh thủ sạc đầy pin điện thoại, laptop trước giờ cắt điện. Tắt công tắc bình nóng lạnh và điều hòa để bảo vệ thiết bị.</span>
                      ) : isWater ? (
                        <span>Vui lòng chuẩn bị xô, chậu hứng sẵn nước trước giờ khóa. Nhớ kiểm tra đóng các vòi nước để tránh chảy tràn khi cấp nước trở lại.</span>
                      ) : (
                        <span>Mọi thắc mắc vui lòng gọi trực tiếp cho chủ trọ qua số điện thoại trên hợp đồng.</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {relevantAnnouncements.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                Hiện tại nhà trọ không có thông báo cúp điện hay cắt nước nào. Toàn bộ hệ thống điện nước đang hoạt động bình thường!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: PAYMENT HISTORY (LỊCH SỬ ĐÃ ĐÓNG CHI PHÍ GÌ) */}
      {/* ======================================================== */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Lịch Sử Chi Phí & Chứng Từ Đã Đóng Các Tháng Trước
            </h3>
            <p className="text-xs text-slate-500">
              Xem lại từng tháng bạn đã đóng những khoản gì, ngày giờ thanh toán và biên lai đối soát
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Kỳ thanh toán</th>
                  <th className="p-3 text-center">Điện tiêu thụ</th>
                  <th className="p-3 text-center">Nước tiêu thụ</th>
                  <th className="p-3 text-right">Tổng tiền</th>
                  <th className="p-3 text-center">Trạng thái</th>
                  <th className="p-3 text-center">Chứng từ / Phiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {roomInvoices.map(inv => {
                  const proof = roomProofs.find(p => p.invoiceId === inv.id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <strong className="font-bold text-slate-900 text-sm">
                          Tháng {inv.month?.slice(5)}/{inv.month?.slice(0, 4)}
                        </strong>
                        <div className="text-[10px] text-slate-400 font-mono">{inv.invoiceCode}</div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="font-bold text-amber-700">{inv.electricityUsage} kWh</span>
                        <div className="text-[10px] text-slate-400">{formatVND(inv.electricityCost)}</div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="font-bold text-cyan-700">{inv.waterUsage} m³</span>
                        <div className="text-[10px] text-slate-400">{formatVND(inv.waterCost)}</div>
                      </td>

                      <td className="p-3 text-right font-black text-slate-900 text-sm">
                        {formatVND(inv.totalAmount)}
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {inv.status === 'PAID' ? '✓ Đã thanh toán' : inv.status === 'PENDING_APPROVAL' ? '⏳ Chờ duyệt' : '⚠️ Chưa đóng'}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenInvoiceModal(inv)}
                            className="text-blue-600 hover:underline font-semibold"
                          >
                            Xem phiếu
                          </button>
                          {proof && proof.proofImageUrl && (
                            <a
                              href={proof.proofImageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:underline font-semibold"
                            >
                              Ảnh biên lai
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {roomInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Chưa có lịch sử hóa đơn nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 3: CCCD ARCHIVE (HỒ SƠ CĂN CƯỚC CỦA TÔI) */}
      {/* ======================================================== */}
      {activeSubTab === 'cccd' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-5">
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Hồ Sơ Căn Cước Công Dân & Hợp Đồng Phòng {currentRoom?.name}
            </h3>
            <p className="text-xs text-slate-500">
              Thông tin CCCD và hình ảnh 2 mặt đã được lưu trữ trên hệ thống nhà trọ để đối soát pháp lý
            </p>
          </div>

          {currentTenant ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Họ và tên:</span>
                  <strong className="text-slate-900 text-sm font-bold">{currentTenant.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Số điện thoại:</span>
                  <strong className="text-slate-900 font-mono font-bold">{currentTenant.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Số CCCD:</span>
                  <strong className="text-slate-900 font-mono font-bold">{currentTenant.idCardNumber || 'Chưa cung cấp'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Quê quán:</span>
                  <strong className="text-slate-900">{currentTenant.hometown || 'Chưa cập nhật'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Ngày bắt đầu thuê:</span>
                  <strong className="text-slate-900">{currentTenant.startDate || '---'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Tiền cọc phòng:</span>
                  <strong className="text-emerald-700 font-bold">{formatVND(currentTenant.deposit)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Biển số xe:</span>
                  <strong className="text-slate-900 font-mono">{currentTenant.licensePlate || '---'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Tình trạng:</span>
                  <span className="text-emerald-700 font-bold">Đang thuê hợp pháp</span>
                </div>
              </div>

              {/* Photos */}
              <div>
                <span className="text-xs font-bold text-slate-800 block mb-2">
                  Ảnh 2 Mặt Căn Cước Công Dân Được Lưu:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-700 block mb-2">Mặt trước CCCD:</span>
                    <div className="h-44 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
                      {currentTenant.idCardFrontUrl ? (
                        <a href={currentTenant.idCardFrontUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={currentTenant.idCardFrontUrl}
                            alt="Mặt trước CCCD"
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.src = '/uploads/cccd/sample_cccd_front.svg'; }}
                          />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Chưa có ảnh</span>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-700 block mb-2">Mặt sau CCCD:</span>
                    <div className="h-44 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
                      {currentTenant.idCardBackUrl ? (
                        <a href={currentTenant.idCardBackUrl} target="_blank" rel="noopener noreferrer">
                          <img
                            src={currentTenant.idCardBackUrl}
                            alt="Mặt sau CCCD"
                            className="w-full h-full object-contain"
                            onError={(e) => { e.currentTarget.src = '/uploads/cccd/sample_cccd_back.svg'; }}
                          />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Chưa có ảnh</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              Chưa có hồ sơ khách thuê cho phòng này.
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 4: MAINTENANCE REQUESTS (BÁO HỎNG HÓC SỬA CHỮA) */}
      {/* ======================================================== */}
      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          
          {/* New Request Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-600" />
              Gửi Yêu Cầu Sửa Chữa / Báo Hỏng Thiết Bị
            </h4>
            <p className="text-xs text-slate-500">
              Báo cho chủ trọ biết nếu phòng bị rò nước, cháy bóng đèn, hỏng ổ cắm, tắc cống...
            </p>

            <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Thiết bị hỏng hóc *</label>
                <input
                  type="text"
                  placeholder="vd: Hỏng bóng đèn nhà tắm, Vòi xịt toilet bị rỉ nước..."
                  value={reqTitle}
                  onChange={e => setReqTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả cụ thể để chủ trọ mang đúng đồ nghề hoặc thợ sửa..."
                  value={reqDesc}
                  onChange={e => setReqDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                >
                  {submittingReq ? 'Đang gửi...' : 'Gửi Yêu Cầu Cho Chủ Trọ'}
                </button>
              </div>
            </form>
          </div>

          {/* List of Previous Requests */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">
              Lịch Sử Các Yêu Cầu Đã Gửi ({requests.length})
            </h4>

            <div className="space-y-2">
              {requests.map(req => (
                <div key={req.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <strong className="font-bold text-slate-800 text-sm block">{req.title}</strong>
                    {req.description && <p className="text-slate-500 text-[11px] mt-0.5">{req.description}</p>}
                    <span className="text-[10px] text-slate-400 font-mono">{req.createdAt}</span>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    req.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : req.status === 'PROCESSING'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {req.status === 'COMPLETED' ? '✓ Đã sửa xong' : req.status === 'PROCESSING' ? 'Đang xử lý' : 'Đang chờ xử lý'}
                  </span>
                </div>
              ))}

              {requests.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  Chưa có yêu cầu sửa chữa nào. Thiết bị phòng đang hoạt động tốt!
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
