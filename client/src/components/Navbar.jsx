import React from 'react';
import { Home, ShieldCheck, UserCheck, Bell, Calendar, Sparkles, Building2, User, LogOut, RotateCw } from 'lucide-react';

export default function Navbar({
  currentMonth,
  setCurrentMonth,
  role,
  setRole,
  selectedRoomId,
  setSelectedRoomId,
  rooms = [],
  pendingProofsCount = 0,
  announcementsCount = 0,
  settings = {},
  currentUser = null,
  onLogout,
  onRefresh,
  refreshing = false
}) {
  // Generate list of months (cho phép chọn lùi về 12 tháng trước để nhập dữ liệu lịch sử)
  const getMonthOptions = () => {
    const list = [];
    const baseDate = new Date();
    for (let i = -12; i <= 3; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
      list.push({ val, label });
    }
    return list;
  };

  const months = getMonthOptions();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base sm:text-lg tracking-tight truncate">
                  {settings.houseName || 'Nhà Trọ An Cư'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  6 Phòng
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate hidden md:block">
                {settings.address || 'Quản lý thu chi, điện nước, hóa đơn & đối soát chứng từ tự động'}
              </p>
            </div>
          </div>

          {/* Month Selector & Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Quick Refresh Button (Làm Mới Tiện Lợi Cho Di Động) */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition-all border shadow-2xs cursor-pointer ${
                refreshing
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white hover:bg-slate-50 active:bg-blue-50 text-slate-700 hover:text-blue-600 border-slate-200'
              }`}
              title="Nhấn để cập nhật lại dữ liệu ngay lập tức"
            >
              <RotateCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Đang tải...' : 'Làm Mới'}</span>
            </button>

            {/* Month Picker */}
            <div className="flex items-center bg-slate-100/90 rounded-xl p-1 border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500 ml-2 hidden sm:block" />
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 px-2 py-1 outline-hidden cursor-pointer"
              >
                {months.map(m => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* User State & Access Control */}
            {currentUser?.role === 'TENANT' ? (
              // LOCKED TENANT VIEW: Only their room, NO switcher, NO access to other rooms!
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-300 rounded-xl px-3 py-1.5 text-xs text-emerald-950 font-semibold shadow-2xs">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    <strong className="text-emerald-900">{currentUser.name}</strong> • {currentUser.roomName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                  title="Đăng xuất khỏi tài khoản phòng"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng Xuất</span>
                </button>
              </div>
            ) : (
              // MANAGER VIEW: Full admin controls + option to preview
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRole('MANAGER')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      role === 'MANAGER'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Chủ Trọ</span> (Quản Lý)
                    {pendingProofsCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold bg-amber-400 text-amber-950 rounded-full animate-pulse ml-0.5">
                        {pendingProofsCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('TENANT')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      role === 'TENANT'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Chủ trọ xem thử giao diện người thuê"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Xem Thử</span> Cổng Khách
                  </button>
                </div>

                {role === 'TENANT' && (
                  <div className="flex items-center bg-emerald-50 border border-emerald-300 rounded-xl px-2 py-1">
                    <span className="text-xs font-medium text-emerald-800 mr-1 hidden sm:inline">Xem phòng:</span>
                    <select
                      value={selectedRoomId || (rooms[0] && rooms[0].id) || 1}
                      onChange={(e) => setSelectedRoomId(Number(e.target.value))}
                      className="bg-transparent text-xs sm:text-sm font-bold text-emerald-900 outline-hidden cursor-pointer"
                    >
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.representativeName ? `(${r.representativeName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                  title="Đăng xuất khỏi hệ thống quản lý"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng Xuất</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
