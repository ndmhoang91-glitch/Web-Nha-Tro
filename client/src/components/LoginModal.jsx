import React, { useState } from 'react';
import { Building2, ShieldCheck, UserCheck, Lock, Phone, ArrowRight, Sparkles, Key, AlertCircle } from 'lucide-react';
import { loginUser } from '../api';

export default function LoginModal({ settings = {}, onLoginSuccess }) {
  const [tab, setTab] = useState('TENANT'); // 'TENANT' | 'MANAGER'
  
  // Tenant fields
  const [phone, setPhone] = useState('');
  const [tenantPassword, setTenantPassword] = useState('');
  
  // Manager fields
  const [managerPassword, setManagerPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleTenantLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!phone.trim()) {
      setErrorMsg('Vui lòng nhập số điện thoại');
      return;
    }
    if (!tenantPassword.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu (mặc định: 123)');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({
        role: 'TENANT',
        phone: phone.trim(),
        password: tenantPassword.trim()
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Số điện thoại hoặc mật khẩu không chính xác');
        return;
      }

      onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManagerLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!managerPassword.trim()) {
      setErrorMsg('Vui lòng nhập mật khẩu quản lý (mặc định: admin123)');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser({
        role: 'MANAGER',
        password: managerPassword.trim()
      });

      if (!res.success) {
        setErrorMsg(res.message || 'Mật khẩu quản lý không chính xác');
        return;
      }

      onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTenantSample = (samplePhone) => {
    setTab('TENANT');
    setPhone(samplePhone);
    setTenantPassword('123');
    setErrorMsg('');
  };

  const handleQuickManager = () => {
    setTab('MANAGER');
    setManagerPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-lg">
            <Building2 className="w-8 h-8 text-blue-300" />
          </div>
          <h2 className="text-xl font-black tracking-tight">
            {settings.houseName || 'Nhà Trọ An Cư'}
          </h2>
          <p className="text-xs text-blue-200/80 mt-1 max-w-xs mx-auto">
            Hệ thống quản lý phòng trọ & Cổng thông tin khách thuê riêng tư
          </p>
        </div>

        {/* Tab Selection: Khách Thuê vs Chủ Trọ */}
        <div className="grid grid-cols-2 p-2 bg-slate-100 border-b border-slate-200 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setTab('TENANT'); setErrorMsg(''); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all cursor-pointer ${
              tab === 'TENANT'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Khách Thuê Trọ</span>
          </button>

          <button
            type="button"
            onClick={() => { setTab('MANAGER'); setErrorMsg(''); }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all cursor-pointer ${
              tab === 'MANAGER'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Chủ Nhà Trọ</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: KHÁCH THUÊ ĐĂNG NHẬP */}
          {tab === 'TENANT' && (
            <form onSubmit={handleTenantLogin} className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900">
                🔒 <strong>Bảo mật riêng tư:</strong> Khách thuê chỉ xem đúng hóa đơn, số điện nước và thông tin phòng của mình. Tuyệt đối không nhìn thấy các phòng khác.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Số điện thoại đăng ký ở trọ
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={tenantPassword}
                    onChange={e => setTenantPassword(e.target.value)}
                    placeholder="Mặc định: 123"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                    required
                  />
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Mật khẩu mặc định do chủ trọ cấp: <strong>123</strong>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập Vào Phòng Của Tôi'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Sample Quick Login for Testing */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <span className="text-[11px] text-slate-400 block mb-1.5">Thử nhanh với phòng mẫu:</span>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickTenantSample('0912345678')}
                    className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold"
                  >
                    P101 (Trần Văn Minh)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTenantSample('0987654321')}
                    className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold"
                  >
                    P102 (Lê Thị Thu Thảo)
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: CHỦ TRỌ ĐĂNG NHẬP */}
          {tab === 'MANAGER' && (
            <form onSubmit={handleManagerLogin} className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900">
                🛡️ <strong>Khu vực quản lý:</strong> Dành cho chủ nhà trọ quản lý toàn bộ các phòng, thu chi, ghi số điện nước và đối soát hóa đơn.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu quản trị chủ trọ
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={managerPassword}
                    onChange={e => setManagerPassword(e.target.value)}
                    placeholder="Mặc định: admin123"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-hidden font-medium"
                    required
                  />
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Mật khẩu mặc định: <strong>admin123</strong> (có thể đổi trong Cấu hình)
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Lý Nhà Trọ'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Fill Button */}
              <div className="pt-3 border-t border-slate-100 text-center">
                <button
                  type="button"
                  onClick={handleQuickManager}
                  className="px-3 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold"
                >
                  ⚡ Điền nhanh mật khẩu admin mẫu (admin123)
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
