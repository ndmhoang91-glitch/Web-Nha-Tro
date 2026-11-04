import React, { useState } from 'react';
import {
  LayoutDashboard, FileText, ShieldCheck, Users, Receipt, Settings as SettingsIcon,
  Plus, Sparkles, CheckCircle2, Clock, AlertTriangle, Zap, Droplet, Wifi,
  Printer, Copy, Search, ArrowUpRight, ArrowDownRight, DollarSign, Eye,
  Building, Phone, CreditCard, ChevronRight, Check, Bell, Trash2, Send,
  Edit3, Pencil, Calendar, Home, Building2, Key, Download, Upload
} from 'lucide-react';
import { formatVND, generateBatchInvoices, updateSettings, deleteAnnouncement, deleteRoom, adminResetTenantPassword, clearAllData, exportBackup, restoreBackup } from '../api';
import confetti from 'canvas-confetti';

export default function ManagerDashboard({
  rooms = [],
  invoices = [],
  tenants = [],
  proofs = [],
  expenses = [],
  announcements = [],
  statistics = {},
  auditLogs = [],
  settings = {},
  currentMonth,
  onRefresh,
  onOpenInvoiceModal,
  onOpenMeterModal,
  onOpenProofModal,
  onOpenTenantModal,
  onOpenExpenseModal,
  onOpenAnnouncementModal,
  onOpenRoomModal
}) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, invoices, proofs, tenants, cashflow, announcements, settings
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [copiedZaloId, setCopiedZaloId] = useState(null);

  // Settings form local state
  const [settingsForm, setSettingsForm] = useState({ ...settings });
  const [savingSettings, setSavingSettings] = useState(false);

  // Filter states
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('ALL');
  const [proofStatusFilter, setProofStatusFilter] = useState('ALL');
  const [announcementFilter, setAnnouncementFilter] = useState('ALL');
  const [copiedAnnounceId, setCopiedAnnounceId] = useState(null);

  const handleCopyAnnouncementZalo = (ann) => {
    const text = `📢 THÔNG BÁO TỪ CHỦ NHÀ TRỌ
------------------------------------
📌 ${ann.title}
⏰ Thời gian: ${ann.startTime || ''} ${ann.endTime ? `➔ ${ann.endTime}` : ''}
👥 Phạm vi: ${ann.targetType === 'ALL' ? 'Toàn bộ 6 phòng trọ' : `Phòng ${ann.targetRoomName || ''}`}
📝 Chi tiết dặn dò:
${ann.content}
------------------------------------
Mọi người chú ý chuẩn bị nhé. Cảm ơn quý khách!`;

    navigator.clipboard.writeText(text);
    setCopiedAnnounceId(ann.id);
    setTimeout(() => setCopiedAnnounceId(null), 2500);
  };

  const handleDeleteAnnounce = async (id, title) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thông báo: "${title}"?`)) return;
    try {
      await deleteAnnouncement(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleResetTenantPassword = async (tenant) => {
    if (!confirm(`Xác nhận đặt lại mật khẩu cho khách "${tenant.fullName}" (Phòng ${tenant.roomName}) về mặc định là: 123?`)) return;
    try {
      const res = await adminResetTenantPassword(tenant.id, '123');
      if (res && res.success) {
        alert(`✓ Đã đặt lại mật khẩu cho ${tenant.fullName} thành công!\nMật khẩu mới là: 123`);
        if (onRefresh) onRefresh();
      } else {
        alert(res?.message || 'Có lỗi khi đặt lại mật khẩu');
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Trigger one-click automated invoice generation
  const handleBatchGenerate = async () => {
    if (!confirm(`Tự động tạo/đồng bộ hóa đơn cho tất cả các phòng trong tháng ${currentMonth}?\n(Hệ thống sẽ tự động lấy chỉ số điện nước mới tháng trước làm chỉ số cũ tháng này)`)) return;
    setBatchGenerating(true);
    try {
      const res = await generateBatchInvoices(currentMonth);
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      alert(`Đã hoàn tất tự động: ${res.createdCount} phòng tạo mới, ${res.updatedCount} phòng đã đồng bộ chỉ số cũ!`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setBatchGenerating(false);
    }
  };

  const handleCopyZaloSingle = (inv) => {
    const text = `🏠 THÔNG BÁO TIỀN PHÒNG THÁNG ${inv.month?.slice(5)}/${inv.month?.slice(0, 4)} - ${inv.roomName}
👤 Khách thuê: ${inv.tenantName || 'Anh/Chị'}
- Tiền phòng: ${formatVND(inv.roomPrice)}
- Điện (${inv.oldElectricity} ➔ ${inv.newElectricity} = ${inv.electricityUsage} kWh x ${formatVND(inv.electricityPrice)}): ${formatVND(inv.electricityCost)}
- Nước (${inv.oldWater} ➔ ${inv.newWater} = ${inv.waterUsage} m³ x ${formatVND(inv.waterPrice)}): ${formatVND(inv.waterCost)}
- Wifi: ${formatVND(inv.wifiFee)}
👉 TỔNG TIỀN PHẢI NỘP: ${formatVND(inv.totalAmount)}
STK: ${settings.bankAccount} (${settings.bankName}) - ${settings.bankOwner}
Nội dung: ${inv.roomName?.replace(/[^0-9]/g, 'P')} TIEN TRO T${inv.month?.replace('-', '')}`;

    navigator.clipboard.writeText(text);
    setCopiedZaloId(inv.id);
    setTimeout(() => setCopiedZaloId(null), 2500);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateSettings(settingsForm);
      alert('Đã cập nhật thông tin cài đặt nhà trọ thành công!');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const [clearingData, setClearingData] = useState(false);

  const handleClearAllData = async () => {
    const confirmed = window.confirm(
      '⚠️ CẢNH BÁO QUAN TRỌNG:\n\nBạn có chắc chắn muốn XÓA SẠCH TOÀN BỘ dữ liệu mẫu (các phòng mẫu, khách thuê mẫu, hóa đơn, thông báo, chi phí) không?\n\nSau khi xóa, hệ thống sẽ đưa về trạng thái trống hoàn toàn để bạn bắt đầu tự thêm phòng và khách thuê thực tế của riêng mình.\n\nNhấn OK để xóa sạch dữ liệu mẫu!'
    );
    if (!confirmed) return;

    setClearingData(true);
    try {
      const res = await clearAllData(settingsForm.managerPassword || '');
      if (res.success) {
        alert('✓ Đã xóa sạch toàn bộ dữ liệu mẫu! Hệ thống đang trống, bạn có thể bấm "Thêm Phòng Đầu Tiên" để bắt đầu nhập phòng thực tế.');
        if (onRefresh) onRefresh();
        setActiveTab('overview');
      } else {
        alert(res.message || 'Lỗi khi xóa dữ liệu');
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setClearingData(false);
    }
  };

  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleExportBackup = async () => {
    setBackingUp(true);
    try {
      const data = await exportBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (data.houseName || 'nhatro').replace(/\s+/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `backup_${cleanName}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi xuất sao lưu: ' + err.message);
    } finally {
      setBackingUp(false);
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn khôi phục dữ liệu từ file "${file.name}" không?\n\nDữ liệu hiện tại sẽ được cập nhật hoàn toàn theo file này.`
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }

    setRestoring(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      const res = await restoreBackup(backupData);
      if (res.success) {
        alert('✓ Đã khôi phục thành công toàn bộ dữ liệu nhà trọ!');
        if (onRefresh) onRefresh();
      } else {
        alert(res.message || 'Lỗi khôi phục');
      }
    } catch (err) {
      alert('Lỗi đọc file hoặc khôi phục: ' + err.message);
    } finally {
      setRestoring(false);
      e.target.value = '';
    }
  };

  // Filtered lists
  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = inv.roomName?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                        inv.tenantName?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
                        inv.invoiceCode?.toLowerCase().includes(invoiceSearch.toLowerCase());
    const matchStatus = invoiceStatusFilter === 'ALL' || inv.status === invoiceStatusFilter;
    return matchSearch && matchStatus;
  });

  const pendingProofs = proofs.filter(p => p.status === 'PENDING');
  const filteredProofs = proofs.filter(p => {
    if (proofStatusFilter === 'ALL') return true;
    return p.status === proofStatusFilter;
  });

  return (
    <div className="space-y-6">
      
      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center justify-between overflow-x-auto pb-1 gap-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 shrink-0">
          {[
            { id: 'overview', label: 'Tổng Quan & 6 Phòng', icon: LayoutDashboard },
            { id: 'invoices', label: 'Hóa Đơn & Ghi Điện Nước', icon: FileText, badge: invoices.length },
            { id: 'proofs', label: 'Chứng Từ Đối Soát', icon: ShieldCheck, badge: pendingProofs.length, badgeColor: 'bg-amber-500' },
            { id: 'announcements', label: 'Thông Báo Cúp Điện/Nước', icon: Bell, badge: announcements.length, badgeColor: 'bg-amber-500' },
            { id: 'tenants', label: 'Khách Trọ & CCCD', icon: Users, badge: tenants.length },
            { id: 'cashflow', label: 'Thu - Chi & Lợi Nhuận', icon: Receipt },
            { id: 'settings', label: 'Cấu Hình & Giá Dịch Vụ', icon: SettingsIcon },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : (tab.badgeColor ? `${tab.badgeColor} text-white` : 'bg-slate-200 text-slate-700')
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Action: Batch auto calculate */}
        <div className="shrink-0 pl-2">
          <button
            type="button"
            disabled={batchGenerating}
            onClick={handleBatchGenerate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm transition-all"
            title="Tự động sao chép số cũ tháng trước, áp giá phòng và tạo hóa đơn cho 6 phòng"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{batchGenerating ? 'Đang tính...' : 'Tự Động Tính Tiền Tháng Này'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & 6 ROOMS GRID */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Total Revenue Collected */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Đã Thu Tiền Trọ</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-black text-slate-900">
                {formatVND(statistics.totalCollected)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>Tổng phải thu:</span>
                <strong className="text-slate-800">{formatVND(statistics.totalBilled)}</strong>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Tổng Chi Phí Nhà</span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-black text-rose-600">
                {formatVND(statistics.totalExpense)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Điện nước tổng, bảo trì, rác, wifi
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Lợi Nhuận Ròng</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-lg sm:text-2xl font-black ${statistics.netProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                {formatVND(statistics.netProfit)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Đã thu trừ toàn bộ chi phí
              </div>
            </div>

            {/* Uncollected / Outstanding */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Còn Nợ Chưa Thu</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-lg sm:text-2xl font-black text-amber-600">
                {formatVND(statistics.totalUncollected)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>Tỷ lệ lấp đầy:</span>
                <strong className="text-emerald-700">{statistics.occupiedRooms}/{statistics.totalRooms} phòng ({statistics.occupancyRate}%)</strong>
              </div>
            </div>

          </div>

          {/* Active Outage/Announcements Banner on Overview */}
          {announcements.length > 0 && (
            <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${
                  announcements[0].type === 'OUTAGE_ELECTRIC' ? 'bg-amber-500' : announcements[0].type === 'OUTAGE_WATER' ? 'bg-cyan-600' : 'bg-rose-600'
                }`}>
                  {announcements[0].type === 'OUTAGE_ELECTRIC' ? <Zap className="w-5 h-5" /> : announcements[0].type === 'OUTAGE_WATER' ? <Droplet className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{announcements[0].title}</span>
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Đang thông báo cho khách
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                    Thời gian: <strong className="font-mono text-slate-800">{announcements[0].startTime} {announcements[0].endTime ? `➔ ${announcements[0].endTime}` : ''}</strong> • {announcements[0].content}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('announcements')}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                >
                  Xem Bảng Tin ({announcements.length})
                </button>
                <button
                  type="button"
                  onClick={onOpenAnnouncementModal}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 transition-colors"
                >
                  + Phát Thông Báo
                </button>
              </div>
            </div>
          )}

          {/* Pending Proofs Alert Notice if any */}
          {pendingProofs.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    Có {pendingProofs.length} chứng từ thanh toán cần đối soát!
                  </h4>
                  <p className="text-xs text-amber-800">
                    Khách thuê đã chuyển khoản và gửi ảnh biên lai ngân hàng để xác nhận thanh toán.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('proofs')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-xs transition-colors"
              >
                Kiểm Tra Đối Soát Ngay
              </button>
            </div>
          )}

          {/* Smart Billing Schedule Section: Contract Date Rent vs 1-Tây Utilities */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                    Lịch Thu Tiền Phòng & Chốt Điện Nước Tự Động
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Cơ chế chuẩn
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    🏠 <strong>Tiền phòng:</strong> Thu theo ngày ký HĐ (đúng ngày ký tháng này ➔ thu ngày đó tháng sau) • ⚡ <strong>Điện nước:</strong> Chốt số & thu ngày 1 Tây hàng tháng
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Hôm nay: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></span>
              </div>
            </div>

            {/* Room Schedule Cards */}
            {rooms.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Chưa có phòng trọ nào. Hãy thêm phòng mới để bắt đầu thiết lập lịch thu tiền!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {rooms.map(room => {
                  const inv = invoices.find(i => Number(i.roomId) === Number(room.id));
                  const tenant = tenants.find(t => Number(t.roomId) === Number(room.id) && t.isRepresentative && t.status === 'ACTIVE') 
                    || tenants.find(t => Number(t.roomId) === Number(room.id) && t.status === 'ACTIVE');
                  const tenantInMonth = tenant && (!currentMonth || !tenant.startDate || tenant.startDate.slice(0, 7) <= currentMonth) ? tenant : null;
                  const isOccupied = Boolean(tenantInMonth);
                  const schedule = inv?.schedule;
                  const rentDay = schedule?.actualRentDay || (tenantInMonth?.startDate ? new Date(tenantInMonth.startDate).getDate() : 1);
                  const rentCycleStr = schedule?.rentCycleStr || `Ngày ${rentDay} tháng này ➔ Ngày ${rentDay} tháng sau`;
                  const isPaid = inv?.status === 'PAID' || (inv && Number(inv.remainingAmount) <= 0 && Number(inv.paidAmount) > 0);
                  const isPending = inv?.status === 'PENDING_APPROVAL';
                  const roomRentTotal = (Number(inv?.roomPrice) || (room.basePrice || 1500000)) + (Number(inv?.wifiFee) || (room.wifiFee || 50000));
                  const isRoomPaid = Boolean(inv && Number(inv.paidAmount) >= roomRentTotal && Number(inv.remainingAmount) > 0);

                  return (
                    <div
                      key={room.id}
                      className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all ${
                        isPaid
                          ? 'bg-emerald-50/40 border-emerald-200'
                          : isRoomPaid
                          ? 'bg-amber-50/40 border-amber-200'
                          : isOccupied
                          ? 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                          : 'bg-slate-50/30 border-dashed border-slate-200'
                      }`}
                    >
                      <div>
                        {/* Header: Room Name & Status */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">{room.name}</span>
                            <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              T{room.floor}
                            </span>
                          </div>
                          {isOccupied ? (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isRoomPaid
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : schedule?.diffDays < 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isPaid
                                ? '✓ Đã thu đủ'
                                : isPending
                                ? '⏳ Chờ duyệt'
                                : isRoomPaid
                                ? `⚡ Chờ điện nước (${formatVND(inv.remainingAmount)})`
                                : schedule?.rentDueStatusText || 'Chưa đóng'}
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Phòng trống
                            </span>
                          )}
                        </div>

                        {/* Tenant Info */}
                        {isOccupied && tenant ? (
                          <div className="text-[11px] text-slate-600 mb-2.5 pb-2 border-b border-slate-200/60 flex items-center justify-between">
                            <span className="font-semibold text-slate-800 truncate">{tenant.fullName}</span>
                            <span className="text-slate-500 font-mono text-[10px]">
                              Ký HĐ: {tenant.startDate ? new Date(tenant.startDate).toLocaleDateString('vi-VN') : 'Chưa nhập'}
                            </span>
                          </div>
                        ) : null}

                        {/* Dual Timelines */}
                        {isOccupied ? (
                          <div className="space-y-2 text-xs">
                            {/* Tiền phòng */}
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                                  <Home className="w-3 h-3 text-blue-600" /> Tiền phòng:
                                </span>
                                <span className="font-bold text-blue-700 text-xs">
                                  {formatVND(roomRentTotal)}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                                <span>Lịch thu:</span>
                                <strong className="text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  Ngày {rentDay} hàng tháng
                                </strong>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 font-mono truncate" title={rentCycleStr}>
                                Kỳ: {rentCycleStr}
                              </div>
                            </div>

                            {/* Tiền điện nước */}
                            <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                                  <Zap className="w-3 h-3 text-amber-500" /> Điện & Nước:
                                </span>
                                <span className="font-semibold text-slate-700 text-[11px]">
                                  {inv ? formatVND((inv.electricityCost || 0) + (inv.waterCost || 0) + (inv.totalExtraFee || 0)) : 'Chưa tính'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-1 flex items-center justify-between">
                                <span>Chốt & thu:</span>
                                <strong className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  Ngày 1 Tây hàng tháng
                                </strong>
                              </div>
                              {inv && (
                                <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                                  <span>Điện: {inv.electricityUsage} kWh</span>
                                  <span>Nước: {inv.waterUsage} m³</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="py-4 text-center text-xs text-slate-400 italic">
                            Chưa có khách thuê
                          </div>
                        )}
                      </div>

                      {/* Action footer */}
                      {isOccupied && (
                        <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenMeterModal(inv || { roomId: room.id, month: currentMonth })}
                            className="px-2 py-1 text-[11px] font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                            title="Ghi chỉ số điện nước ngày 1 Tây"
                          >
                            <Zap className="w-3 h-3 text-amber-500" /> Số điện nước
                          </button>
                          {inv ? (
                            <button
                              type="button"
                              onClick={() => onOpenInvoiceModal(inv)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
                            >
                              Xem Bill
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Chưa tạo bill</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6 Rooms Visual Grid */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Tình Trạng Các Phòng Trọ ({rooms.length} Phòng - Kỳ Thu: Tháng {currentMonth?.slice(5)}/{currentMonth?.slice(0, 4)})
                </h3>
                <p className="text-xs text-slate-500">
                  Theo dõi số điện nước, hóa đơn, sửa/xóa thông tin phòng và trạng thái thanh toán
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenRoomModal({})}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer"
                  title="Thêm phòng trọ mới vào hệ thống"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" /> Thêm Phòng Mới
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTenantModal({})}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm Khách Mới
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8 shadow-2xs">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-bold text-slate-700 text-base">Chưa có phòng trọ nào trong hệ thống</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                    Hiện bạn chưa có phòng trọ nào. Hãy bấm nút dưới đây để tạo phòng trọ mới với giá thuê và diện tích theo ý bạn!
                  </p>
                  <button
                    type="button"
                    onClick={() => onOpenRoomModal({})}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Thêm Phòng Trọ Đầu Tiên
                  </button>
                </div>
              ) : (
                rooms.map(room => {
                // Find invoice and tenant for this room
                const inv = invoices.find(i => Number(i.roomId) === Number(room.id));
                const tenant = tenants.find(t => Number(t.roomId) === Number(room.id) && t.isRepresentative && t.status === 'ACTIVE') 
                  || tenants.find(t => Number(t.roomId) === Number(room.id) && t.status === 'ACTIVE');
                const tenantInMonth = tenant && (!currentMonth || !tenant.startDate || tenant.startDate.slice(0, 7) <= currentMonth) ? tenant : null;
                const isOccupied = Boolean(tenantInMonth);
                const isPaidBottom = inv?.status === 'PAID' || (inv && Number(inv.remainingAmount) <= 0 && Number(inv.paidAmount) > 0);
                const roomRentTotalBottom = (Number(inv?.roomPrice) || (room.basePrice || 1500000)) + (Number(inv?.wifiFee) || (room.wifiFee || 50000));
                const isRoomPaidBottom = Boolean(inv && Number(inv.paidAmount) >= roomRentTotalBottom && Number(inv.remainingAmount) > 0);

                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900 text-lg">
                            {room.name}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Tầng {room.floor}
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenRoomModal(room)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Sửa thông tin / Đổi giá / Xóa phòng này"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Status Badge */}
                        {inv ? (
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isPaidBottom
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 text-amber-900 animate-pulse'
                              : isRoomPaidBottom
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isPaidBottom
                              ? '✓ Đã thanh toán'
                              : inv.status === 'PENDING_APPROVAL'
                              ? '⏳ Chờ duyệt bill'
                              : isRoomPaidBottom
                              ? `⚡ Chờ điện nước (${formatVND(inv.remainingAmount)})`
                              : '⚠️ Chưa đóng tiền'}
                          </span>
                        ) : isOccupied ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Chưa có HĐ
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            Phòng trống
                          </span>
                        )}
                      </div>

                      {/* Tenant & Room Details */}
                      {isOccupied ? (
                        <div className="space-y-2 mb-4 text-xs">
                          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div>
                              <div className="font-bold text-slate-800 text-sm">
                                {tenantInMonth?.fullName || 'Chưa có thông tin'}
                              </div>
                              <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{tenantInMonth?.phone || '---'}</span>
                              </div>
                            </div>
                            <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-1 rounded-lg font-semibold">
                              1 người ở
                            </span>
                          </div>

                          {/* Utilities breakdown snippet */}
                          {inv ? (
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                              <div className="flex items-center gap-1.5 text-amber-800">
                                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Điện: <strong>{inv.electricityUsage} kWh</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5 text-cyan-800">
                                <Droplet className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                                <span>Nước: <strong>{inv.waterUsage} m³</strong></span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-2 text-slate-400 text-xs italic">
                              Chưa tạo hóa đơn tháng này
                            </div>
                          )}

                          {/* Billing Schedule Summary Badge */}
                          {(() => {
                            const rentDay = inv?.schedule?.actualRentDay || (tenantInMonth?.startDate ? new Date(tenantInMonth.startDate).getDate() : 1);
                            return (
                              <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2 text-[11px] space-y-1">
                                <div className="flex items-center justify-between text-blue-900">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Home className="w-3 h-3 text-blue-600" /> Tiền phòng:
                                  </span>
                                  <span className="font-bold text-blue-800 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                                    Thu ngày {rentDay} hàng tháng
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-emerald-900">
                                  <span className="flex items-center gap-1 font-semibold">
                                    <Zap className="w-3 h-3 text-amber-500" /> Điện nước:
                                  </span>
                                  <span className="font-bold text-emerald-800 bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                                    Thu ngày 1 Tây hàng tháng
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-xl p-4 text-center my-4 space-y-2">
                          <div className="text-xs text-slate-600">
                            Giá thuê: <strong className="text-slate-900 font-bold">{formatVND(room.basePrice)}</strong>/tháng
                            {room.area > 0 && <span> • Diện tích: <strong>{room.area}m²</strong></span>}
                          </div>
                          {room.description && (
                            <p className="text-[11px] text-slate-500 italic line-clamp-2">{room.description}</p>
                          )}
                          
                          {/* Utilities breakdown snippet if invoice generated for empty room */}
                          {inv ? (
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-white p-2 rounded-xl border border-slate-200 text-left">
                              <div className="flex items-center gap-1.5 text-amber-800">
                                <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Điện: <strong>{inv.electricityUsage} kWh</strong></span>
                              </div>
                              <div className="flex items-center gap-1.5 text-cyan-800">
                                <Droplet className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                                <span>Nước: <strong>{inv.waterUsage} m³</strong></span>
                              </div>
                            </div>
                          ) : null}

                          <div className="flex items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => onOpenTenantModal({ roomId: room.id })}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-2xs cursor-pointer"
                            >
                              Xếp Khách Vào Phòng
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenRoomModal(room)}
                              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 shadow-2xs flex items-center gap-1 cursor-pointer"
                              title="Sửa thông tin hoặc xóa phòng này"
                            >
                              <Pencil className="w-3 h-3 text-blue-600" /> Sửa / Xóa
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Total Amount & Due */}
                      {inv && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 mb-4">
                          <span className="text-xs text-slate-500">Tổng tiền tháng này:</span>
                          <span className="text-base font-black text-slate-900">
                            {formatVND(inv.totalAmount)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons for Room */}
                    {inv ? (
                      <div className="grid grid-cols-4 gap-1 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onOpenMeterModal(inv)}
                          className="flex items-center justify-center gap-1 px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Ghi chỉ số điện nước"
                        >
                          <Zap className="w-3 h-3 text-amber-600" /> Điện
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenInvoiceModal(inv)}
                          className="flex items-center justify-center gap-1 px-1.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Xem chi tiết hóa đơn & in"
                        >
                          <Eye className="w-3 h-3" /> HĐ
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyZaloSingle(inv)}
                          className={`flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                            copiedZaloId === inv.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title="Sao chép nội dung gửi qua Zalo"
                        >
                          {copiedZaloId === inv.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-blue-600" />}
                          {copiedZaloId === inv.id ? 'Đã chép' : 'Zalo'}
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenRoomModal(room)}
                          className="flex items-center justify-center gap-1 px-1.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-blue-600 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Sửa thông tin hoặc xóa phòng này"
                        >
                          <Pencil className="w-3 h-3" /> Sửa
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => onOpenTenantModal({ roomId: room.id })}
                          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold text-center cursor-pointer transition-colors"
                        >
                          + Xếp Khách Vào Phòng
                        </button>
                      </div>
                    )}

                  </div>
                );
              })
            )}
            </div>
          </div>

          {/* Audit Logs Stream (Lịch sử hoạt động đối soát gần đây) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Nhật Ký Đối Soát & Giao Dịch Nhà Trọ Gần Đây
              </h4>
              <span className="text-xs text-slate-400">Minh bạch - Tránh rắc rối</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {auditLogs.slice(0, 8).map(log => (
                <div key={log.id} className="text-xs flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                    <span className="font-bold text-slate-800 shrink-0">{log.action}:</span>
                    <span className="text-slate-600 truncate">{log.detail}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 shrink-0 ml-2 font-mono">
                    {log.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: INVOICES & BILLING */}
      {/* ======================================================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          
          {/* Controls & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm phòng, tên khách, mã HĐ..."
                  value={invoiceSearch}
                  onChange={e => setInvoiceSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <select
                value={invoiceStatusFilter}
                onChange={e => setInvoiceStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-hidden"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="UNPAID">Chưa thanh toán</option>
                <option value="PENDING_APPROVAL">Chờ duyệt đối soát</option>
                <option value="PAID">Đã thanh toán</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleBatchGenerate}
                disabled={batchGenerating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tự Động Tính Tiền 6 Phòng
              </button>
            </div>
          </div>

          {/* Table of Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Mã HĐ & Phòng</th>
                    <th className="p-3">Khách Thuê</th>
                    <th className="p-3 text-center">Điện (Số cũ ➔ mới)</th>
                    <th className="p-3 text-center">Nước (Số cũ ➔ mới)</th>
                    <th className="p-3 text-right">Phí Khác</th>
                    <th className="p-3 text-right">Tổng Tiền</th>
                    <th className="p-3 text-center">Trạng Thái</th>
                    <th className="p-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 text-sm">{inv.roomName}</div>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                          {inv.invoiceCode}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{inv.tenantName || '---'}</div>
                        <div className="text-[11px] text-slate-500">{inv.tenantPhone || '---'}</div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="font-mono text-slate-700">{inv.oldElectricity} ➔ {inv.newElectricity}</div>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-sm">
                          {inv.electricityUsage} kWh ({formatVND(inv.electricityCost)})
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="font-mono text-slate-700">{inv.oldWater} ➔ {inv.newWater}</div>
                        <span className="text-[11px] font-bold text-cyan-700 bg-cyan-50 px-1.5 py-0.2 rounded-sm">
                          {inv.waterUsage} m³ ({formatVND(inv.waterCost)})
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-medium text-slate-800">{formatVND(inv.wifiFee + (inv.totalExtraFee || 0))}</div>
                        <div className="text-[10px] text-slate-400">Wifi + rác + phụ thu</div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="font-black text-slate-900 text-sm">{formatVND(inv.totalAmount)}</div>
                        {inv.paidAmount > 0 && inv.remainingAmount > 0 && (
                          <div className="text-[10px] text-rose-600 font-bold">Nợ lại: {formatVND(inv.remainingAmount)}</div>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'PENDING_APPROVAL'
                            ? 'bg-amber-100 text-amber-900 animate-pulse'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {inv.status === 'PAID' ? '✓ Đã thanh toán' : inv.status === 'PENDING_APPROVAL' ? '⏳ Chờ duyệt đối soát' : '⚠️ Chưa đóng'}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenMeterModal(inv)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                            title="Ghi chỉ số điện nước"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => onOpenInvoiceModal(inv)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                            title="Xem & in hóa đơn"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyZaloSingle(inv)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              copiedZaloId === inv.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title="Sao chép nội dung gửi Zalo"
                          >
                            {copiedZaloId === inv.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Không tìm thấy hóa đơn nào trong tháng này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PROOFS & AUDIT TRAIL (CHỨNG TỪ ĐỐI SOÁT) */}
      {/* ======================================================== */}
      {activeTab === 'proofs' && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Lưu Trữ & Đối Soát Chứng Từ Thanh Toán
              </h3>
              <p className="text-xs text-slate-500">
                Toàn bộ ảnh biên lai ngân hàng, ủy nhiệm chi được lưu lại vĩnh viễn để đối chiếu không bao giờ tranh chấp
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={proofStatusFilter}
                onChange={e => setProofStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700"
              >
                <option value="ALL">Tất cả chứng từ</option>
                <option value="PENDING">Đang chờ duyệt ({pendingProofs.length})</option>
                <option value="APPROVED">Đã đối soát xong</option>
                <option value="REJECTED">Bị từ chối</option>
              </select>
            </div>
          </div>

          {/* Proofs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProofs.map(proof => (
              <div
                key={proof.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-slate-900 text-base">{proof.roomName}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      proof.status === 'APPROVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : proof.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-900 animate-pulse'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {proof.status === 'APPROVED' ? '✓ Đã duyệt khớp' : proof.status === 'PENDING' ? '⏳ Chờ duyệt' : '❌ Từ chối'}
                    </span>
                  </div>

                  {/* Thumbnail */}
                  <div
                    onClick={() => onOpenProofModal(proof)}
                    className="h-44 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer relative group mb-3"
                  >
                    {proof.proofImageUrl ? (
                      <img
                        src={proof.proofImageUrl}
                        alt="Biên lai"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Nộp tiền mặt trực tiếp</span>
                    )}
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                      Nhấn để phóng to & duyệt
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Số tiền:</span>
                      <strong className="text-sm font-black text-slate-900">{formatVND(proof.amount)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Khách nộp:</span>
                      <strong className="text-slate-800">{proof.tenantName || 'Khách thuê'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Thời gian:</span>
                      <span className="font-mono text-slate-600 text-[11px]">{proof.paymentDate}</span>
                    </div>
                    {proof.transactionCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Mã GD:</span>
                        <span className="font-mono text-blue-700 text-[11px] font-bold">{proof.transactionCode}</span>
                      </div>
                    )}
                    {proof.reviewNotes && (
                      <div className="text-[11px] bg-slate-50 p-2 rounded-lg text-slate-600 mt-2">
                        Ghi chú: {proof.reviewNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Button */}
                <div className="pt-3 mt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenProofModal(proof)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                      proof.status === 'PENDING'
                        ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {proof.status === 'PENDING' ? 'Kiểm Tra & Duyệt Đối Soát' : 'Xem Chi Tiết Chứng Từ'}
                  </button>
                </div>
              </div>
            ))}

            {filteredProofs.length === 0 && (
              <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
                Chưa có chứng từ nào trong danh mục này.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: ANNOUNCEMENTS (BẢNG TIN & THÔNG BÁO CÚP ĐIỆN, NƯỚC) */}
      {/* ======================================================== */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" />
                Bảng Tin & Thông Báo Cho Khách Thuê (Cúp Điện, Nước, Tin Khẩn)
              </h3>
              <p className="text-xs text-slate-500">
                Thông báo hiển thị ngay trên đầu cổng thông tin của người thuê và hỗ trợ sao chép gửi Zalo phát loa
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={announcementFilter}
                onChange={e => setAnnouncementFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 outline-hidden"
              >
                <option value="ALL">Tất cả thông báo</option>
                <option value="OUTAGE_ELECTRIC">⚡ Cúp Điện</option>
                <option value="OUTAGE_WATER">💧 Cúp Nước</option>
                <option value="URGENT">🚨 Khẩn Cấp</option>
                <option value="GENERAL">📢 Nhắc Nhở Chung</option>
              </select>

              <button
                type="button"
                onClick={onOpenAnnouncementModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" /> Phát Thông Báo Mới
              </button>
            </div>
          </div>

          {/* List of Announcements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements
              .filter(a => announcementFilter === 'ALL' || a.type === announcementFilter)
              .map(ann => {
                const isElectric = ann.type === 'OUTAGE_ELECTRIC';
                const isWater = ann.type === 'OUTAGE_WATER';
                const isUrgent = ann.type === 'URGENT';

                return (
                  <div
                    key={ann.id}
                    className={`rounded-2xl border p-5 shadow-2xs flex flex-col justify-between transition-all ${
                      isElectric
                        ? 'bg-amber-50/50 border-amber-200'
                        : isWater
                        ? 'bg-cyan-50/50 border-cyan-200'
                        : isUrgent
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            isElectric
                              ? 'bg-amber-200 text-amber-900'
                              : isWater
                              ? 'bg-cyan-200 text-cyan-900'
                              : isUrgent
                              ? 'bg-rose-200 text-rose-900'
                              : 'bg-blue-100 text-blue-900'
                          }`}>
                            {isElectric ? <Zap className="w-3 h-3 text-amber-700" /> : isWater ? <Droplet className="w-3 h-3 text-cyan-700" /> : isUrgent ? <AlertTriangle className="w-3 h-3 text-rose-700" /> : <Bell className="w-3 h-3 text-blue-700" />}
                            {isElectric ? 'Cúp Điện' : isWater ? 'Cúp Nước' : isUrgent ? 'Khẩn Cấp' : 'Thông Báo Chung'}
                          </span>

                          <span className="text-[10px] font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                            {ann.targetType === 'ALL' ? '📢 Tất cả 6 phòng' : `👤 Riêng ${ann.targetRoomName || 'Phòng'}`}
                          </span>
                        </div>

                        {ann.isPinned === 1 && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                            📌 Đang ghim
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-slate-900 text-base mb-1.5">
                        {ann.title}
                      </h4>

                      {/* Timeframe Banner */}
                      {(ann.startTime || ann.endTime) && (
                        <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/80 mb-3 text-xs flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-slate-500">Thời gian:</span>
                          <strong className="font-mono text-slate-800">
                            {ann.startTime} {ann.endTime ? `➔ ${ann.endTime}` : ''}
                          </strong>
                        </div>
                      )}

                      {/* Content */}
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line mb-3">
                        {ann.content}
                      </p>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        {ann.createdAt} • Bởi {ann.createdBy || 'Chủ Trọ'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyAnnouncementZalo(ann)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                            copiedAnnounceId === ann.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {copiedAnnounceId === ann.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-blue-600" />}
                          {copiedAnnounceId === ann.id ? 'Đã chép!' : 'Chép gửi Zalo'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAnnounce(ann.id, ann.title)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Xóa thông báo này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {announcements.filter(a => announcementFilter === 'ALL' || a.type === announcementFilter).length === 0 && (
              <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                Chưa có thông báo nào trong mục này. Bấm <strong>"Phát Thông Báo Mới"</strong> để gửi thông tin cúp điện, cúp nước cho người thuê trọ.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: TENANTS & CCCD ARCHIVE */}
      {/* ======================================================== */}
      {activeTab === 'tenants' && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Quản Lý Hồ Sơ Khách Trọ & Lưu Trữ CCCD 2 Mặt
              </h3>
              <p className="text-xs text-slate-500">
                Lưu trữ hợp đồng, số CCCD, hình ảnh căn cước công dân và tiền đặt cọc để đối soát
              </p>
            </div>

            <button
              type="button"
              onClick={() => onOpenTenantModal(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" /> Thêm Khách Mới
            </button>
          </div>

          {/* Tenants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map(tenant => (
              <div
                key={tenant.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-black text-slate-900 text-base">{tenant.roomName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      tenant.isRepresentative ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {tenant.isRepresentative ? 'Người đại diện' : 'Ở cùng'}
                    </span>
                  </div>

                  {/* Personal info */}
                  <div className="space-y-1.5 text-xs mb-4">
                    <div className="font-bold text-slate-900 text-sm">{tenant.fullName}</div>
                    <div className="text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <strong className="font-mono">{tenant.phone}</strong>
                      <span className="text-[10px] text-slate-400">(MK: {tenant.password || '123'})</span>
                    </div>
                    <div className="text-slate-600 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>CCCD: <strong className="font-mono text-slate-800">{tenant.idCardNumber || 'Chưa có'}</strong></span>
                    </div>
                    <div className="text-slate-600">
                      Quê quán: <span className="font-semibold text-slate-800">{tenant.hometown || 'Chưa cập nhật'}</span>
                    </div>
                    <div className="text-slate-600">
                      Tiền cọc: <strong className="text-emerald-700 font-bold">{formatVND(tenant.deposit)}</strong>
                    </div>
                    {tenant.licensePlate && (
                      <div className="text-slate-600">
                        Biển số xe: <span className="font-mono font-semibold text-slate-800">{tenant.licensePlate}</span>
                      </div>
                    )}
                  </div>

                  {/* CCCD 2-face previews */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Ảnh CCCD Lưu Trữ (Mặt Trước & Mặt Sau):
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-20 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
                        {tenant.idCardFrontUrl ? (
                          <a href={tenant.idCardFrontUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={tenant.idCardFrontUrl}
                              alt="CCCD Mặt trước"
                              className="w-full h-full object-contain"
                              onError={(e) => { e.currentTarget.src = '/uploads/cccd/sample_cccd_front.svg'; }}
                            />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">Chưa có ảnh trước</span>
                        )}
                      </div>
                      <div className="h-20 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
                        {tenant.idCardBackUrl ? (
                          <a href={tenant.idCardBackUrl} target="_blank" rel="noopener noreferrer">
                            <img
                              src={tenant.idCardBackUrl}
                              alt="CCCD Mặt sau"
                              className="w-full h-full object-contain"
                              onError={(e) => { e.currentTarget.src = '/uploads/cccd/sample_cccd_back.svg'; }}
                            />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">Chưa có ảnh sau</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Vào ở: <strong className="font-mono">{tenant.startDate || '---'}</strong></span>
                    <span>•</span>
                    <span>MK: <strong className="font-mono bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded border border-slate-200">{tenant.password || '123'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleResetTenantPassword(tenant)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Đặt lại mật khẩu cho khách về 123"
                    >
                      <Key className="w-3 h-3 text-amber-600" />
                      <span>Reset MK (123)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTenantModal(tenant)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                    >
                      Sửa Thông Tin & CCCD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: CASH FLOW & EXPENSES (THU - CHI & LỢI NHUẬN) */}
      {/* ======================================================== */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          
          {/* Summary Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">
                Báo Cáo Thu Chi Tháng {currentMonth?.slice(5)}/{currentMonth?.slice(0, 4)}
              </span>
              <div className="text-3xl font-black text-amber-300 mt-1">
                Lợi Nhuận: {formatVND(statistics.netProfit)}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Tổng thu từ 6 phòng: {formatVND(statistics.totalCollected)} | Tổng chi phí vận hành: {formatVND(statistics.totalExpense)}
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenExpenseModal}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" /> Thêm Khoản Chi Tiêu
            </button>
          </div>

          {/* Expenses List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
            <h4 className="font-bold text-slate-900 text-base mb-3">
              Danh Sách Các Khoản Chi Phí Nhà Trọ (Tháng Này)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Khoản chi tiêu</th>
                    <th className="p-3">Danh mục</th>
                    <th className="p-3">Ngày chi</th>
                    <th className="p-3 text-right">Số tiền</th>
                    <th className="p-3 text-center">Chứng từ đính kèm</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{exp.title}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-medium">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{exp.date}</td>
                      <td className="p-3 text-right font-black text-rose-600 text-sm">{formatVND(exp.amount)}</td>
                      <td className="p-3 text-center">
                        {exp.receiptImageUrl ? (
                          <a
                            href={exp.receiptImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 font-semibold hover:underline"
                          >
                            Xem hóa đơn
                          </a>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Chưa có khoản chi tiêu nào trong tháng này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: SETTINGS (CẤU HÌNH NHÀ TRỌ & GIÁ DỊCH VỤ) */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6 max-w-3xl">
          
          <div>
            <h3 className="font-bold text-slate-900 text-lg">
              Cài Đặt Nhà Trọ & Bảng Giá Dịch Vụ Mặc Định
            </h3>
            <p className="text-xs text-slate-500">
              Cấu hình giá thuê 1.500.000 đ/tháng, wifi 50.000 đ, điện 4.000 đ/kW, nước 12.000 đ/khối và tài khoản VietQR
            </p>
          </div>

          {/* Pricing Config */}
          <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 space-y-3">
            <span className="font-bold text-blue-900 text-sm block">Đơn Giá Dịch Vụ Mặc Định</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Giá thuê phòng</label>
                <input
                  type="number"
                  value={settingsForm.defaultRoomPrice || 1500000}
                  onChange={e => setSettingsForm({ ...settingsForm, defaultRoomPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Wifi / Internet</label>
                <input
                  type="number"
                  value={settingsForm.defaultWifiFee || 50000}
                  onChange={e => setSettingsForm({ ...settingsForm, defaultWifiFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Điện (đ/kW)</label>
                <input
                  type="number"
                  value={settingsForm.defaultElectricityPrice || 4000}
                  onChange={e => setSettingsForm({ ...settingsForm, defaultElectricityPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Nước (đ/khối)</label>
                <input
                  type="number"
                  value={settingsForm.defaultWaterPrice || 12000}
                  onChange={e => setSettingsForm({ ...settingsForm, defaultWaterPrice: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl font-bold"
                  required
                />
              </div>
            </div>
          </div>

          {/* House Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tên nhà trọ</label>
              <input
                type="text"
                value={settingsForm.houseName || ''}
                onChange={e => setSettingsForm({ ...settingsForm, houseName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Địa chỉ</label>
              <input
                type="text"
                value={settingsForm.address || ''}
                onChange={e => setSettingsForm({ ...settingsForm, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Tên chủ trọ</label>
              <input
                type="text"
                value={settingsForm.landlordName || ''}
                onChange={e => setSettingsForm({ ...settingsForm, landlordName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Số điện thoại liên hệ</label>
              <input
                type="text"
                value={settingsForm.landlordPhone || ''}
                onChange={e => setSettingsForm({ ...settingsForm, landlordPhone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-mono"
                required
              />
            </div>
          </div>

          {/* Bank Info for VietQR */}
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3">
            <span className="font-bold text-emerald-950 text-sm block">
              Tài Khoản Ngân Hàng Nhận Tiền (Tự động sinh mã VietQR)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Ngân hàng (Mã viết tắt)</label>
                <input
                  type="text"
                  placeholder="MBBANK, VCB, TECHCOMBANK..."
                  value={settingsForm.bankName || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-bold uppercase"
                  required
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Số tài khoản</label>
                <input
                  type="text"
                  placeholder="0988123456"
                  value={settingsForm.bankAccount || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, bankAccount: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-bold font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Chủ tài khoản (Không dấu)</label>
                <input
                  type="text"
                  placeholder="NGUYEN VAN HOANG"
                  value={settingsForm.bankOwner || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, bankOwner: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl font-bold uppercase"
                  required
                />
              </div>
            </div>
          </div>

          {/* Admin Security & Password */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">
                  Mật Khẩu Quản Trị Chủ Trọ (Admin)
                </span>
              </div>
              <span className="text-[11px] text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-400/30 font-semibold">
                Bảo vệ toàn bộ hệ thống
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Mật khẩu này dùng để đăng nhập vào trang Quản Lý. Bạn có thể thay đổi bất kỳ lúc nào để đảm bảo bảo mật.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Mật khẩu quản trị mới</label>
                <input
                  type="text"
                  placeholder="Nhập mật khẩu quản trị mới..."
                  value={settingsForm.managerPassword || ''}
                  onChange={e => setSettingsForm({ ...settingsForm, managerPassword: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:border-amber-400 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center">
                <span className="text-[11px] text-slate-400">
                  Mật khẩu mặc định: <strong className="text-white font-mono">admin123</strong>. Sau khi đổi và bấm <strong>"Lưu Tất Cả Cài Đặt"</strong>, mật khẩu mới sẽ có hiệu lực ngay lập tức.
                </span>
              </div>
            </div>
          </div>

          {/* Backup & Restore Section */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-950">
                <Download className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold text-sm">
                  Sao Lưu & Khôi Phục Dữ Liệu An Toàn
                </span>
              </div>
              <span className="text-[11px] text-emerald-800 bg-emerald-100 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 w-fit">
                Bảo vệ 100% dữ liệu phòng & khách thuê
              </span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Bạn có thể tải file sao lưu về điện thoại hoặc máy tính bất kỳ lúc nào để lưu trữ danh sách phòng, hồ sơ khách thuê, hình CCCD và hóa đơn. Khi cần chuyển thiết bị hoặc khôi phục, chỉ cần chọn lại file sao lưu.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={backingUp}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {backingUp ? 'Đang xuất file...' : 'Tải Về Bản Sao Lưu (.json)'}
              </button>

              <label className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-600" />
                {restoring ? 'Đang khôi phục...' : 'Khôi Phục Từ File Sao Lưu'}
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  disabled={restoring}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Danger Zone: Clear Sample Data */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-900">
                <Trash2 className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="font-bold text-sm">
                  Dọn Sạch Toàn Bộ Dữ Liệu Mẫu / Đưa Hệ Thống Về Trống
                </span>
              </div>
              <span className="text-[11px] text-rose-800 bg-rose-100 font-semibold px-2.5 py-0.5 rounded-full border border-rose-200 w-fit">
                Bắt đầu tự nhập dữ liệu thực tế
              </span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              Nếu bạn muốn xóa sạch toàn bộ các phòng mẫu (Phòng 101 - 203), khách thuê mẫu và các hóa đơn ban đầu để bắt đầu tự thêm phòng và khách thuê thực tế của riêng mình, hãy bấm nút dưới đây:
            </p>
            <div>
              <button
                type="button"
                onClick={handleClearAllData}
                disabled={clearingData}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {clearingData ? 'Đang xóa dữ liệu...' : 'Xóa Toàn Bộ Dữ Liệu Mẫu & Bắt Đầu Nhập Mới'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {savingSettings ? 'Đang lưu...' : 'Lưu Tất Cả Cài Đặt'}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
