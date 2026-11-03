import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import ManagerDashboard from './components/ManagerDashboard';
import TenantPortal from './components/TenantPortal';
import InvoiceModal from './components/InvoiceModal';
import MeterReadingModal from './components/MeterReadingModal';
import ProofReviewModal from './components/ProofReviewModal';
import TenantModal from './components/TenantModal';
import ExpenseModal from './components/ExpenseModal';
import AnnouncementModal from './components/AnnouncementModal';
import RoomModal from './components/RoomModal';
import LoginModal from './components/LoginModal';
import {
  fetchSettings,
  fetchRooms,
  fetchInvoices,
  fetchTenants,
  fetchProofs,
  fetchExpenses,
  fetchStatistics,
  fetchAuditLogs,
  fetchAnnouncements
} from './api';
import './App.css';

export default function App() {
  // Current logged in user: null | { role: 'MANAGER'|'TENANT', name, phone, roomId, roomName }
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('web_nha_tro_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Current month e.g. '2026-11'
  const [currentMonth, setCurrentMonth] = useState('2026-11');
  const [role, setRole] = useState(currentUser?.role === 'TENANT' ? 'TENANT' : 'MANAGER');
  const [selectedRoomId, setSelectedRoomId] = useState(currentUser?.roomId || 1);

  // Core Data
  const [settings, setSettings] = useState({});
  const [rooms, setRooms] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeInvoiceModal, setActiveInvoiceModal] = useState(null);
  const [activeMeterModal, setActiveMeterModal] = useState(null);
  const [activeProofModal, setActiveProofModal] = useState(null);
  const [activeTenantModal, setActiveTenantModal] = useState(null); // null or tenant obj or { roomId }
  const [activeRoomModal, setActiveRoomModal] = useState(null); // null or room obj or {}
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);

  // Fetch all data
  const loadAllData = useCallback(async () => {
    try {
      const [
        st,
        rmList,
        invList,
        tnList,
        prList,
        expList,
        annList,
        stats,
        logs
      ] = await Promise.all([
        fetchSettings(),
        fetchRooms(),
        fetchInvoices({ month: currentMonth }),
        fetchTenants(),
        fetchProofs(),
        fetchExpenses({ month: currentMonth }),
        fetchAnnouncements(),
        fetchStatistics(currentMonth),
        fetchAuditLogs()
      ]);

      setSettings(st || {});
      setRooms(rmList || []);
      setInvoices(invList || []);
      setTenants(tnList || []);
      setProofs(prList || []);
      setExpenses(expList || []);
      setAnnouncements(annList || []);
      setStatistics(stats || {});
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Dynamically update browser tab title to match landlord's houseName
  useEffect(() => {
    if (settings?.houseName && settings.houseName.trim()) {
      document.title = `${settings.houseName.trim()} - Quản Lý Nhà Trọ`;
    } else {
      document.title = 'Quản Lý Nhà Trọ';
    }
  }, [settings?.houseName]);

  // Keep selected room valid and adhere to tenant room lock
  useEffect(() => {
    if (currentUser?.role === 'TENANT' && currentUser.roomId) {
      setSelectedRoomId(currentUser.roomId);
      setRole('TENANT');
    } else if (rooms.length > 0 && !rooms.some(r => r.id === selectedRoomId)) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId, currentUser]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('web_nha_tro_user', JSON.stringify(user));
    } catch (e) {}
    if (user.role === 'TENANT') {
      setRole('TENANT');
      setSelectedRoomId(user.roomId);
    } else {
      setRole('MANAGER');
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('web_nha_tro_user');
    } catch (e) {}
    setCurrentUser(null);
  };

  const pendingProofsCount = proofs.filter(p => p.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* If not logged in, prompt Login Screen */}
      {!currentUser && (
        <LoginModal
          settings={settings}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* Navigation Header */}
      <Navbar
        currentMonth={currentMonth}
        setCurrentMonth={setCurrentMonth}
        role={role}
        setRole={setRole}
        selectedRoomId={selectedRoomId}
        setSelectedRoomId={setSelectedRoomId}
        rooms={rooms}
        pendingProofsCount={pendingProofsCount}
        announcementsCount={announcements.length}
        settings={settings}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold text-slate-500">Đang tải dữ liệu nhà trọ...</p>
          </div>
        ) : (
          <>
            {role === 'MANAGER' ? (
              <ManagerDashboard
                rooms={rooms}
                invoices={invoices}
                tenants={tenants}
                proofs={proofs}
                expenses={expenses}
                announcements={announcements}
                statistics={statistics}
                auditLogs={auditLogs}
                settings={settings}
                currentMonth={currentMonth}
                onRefresh={loadAllData}
                onOpenInvoiceModal={(inv) => setActiveInvoiceModal(inv)}
                onOpenMeterModal={(inv) => setActiveMeterModal(inv)}
                onOpenProofModal={(proof) => setActiveProofModal(proof)}
                onOpenTenantModal={(t) => setActiveTenantModal(t || {})}
                onOpenExpenseModal={() => setShowExpenseModal(true)}
                onOpenAnnouncementModal={() => setShowAnnouncementModal(true)}
                onOpenRoomModal={(r) => setActiveRoomModal(r || {})}
              />
            ) : (
              <TenantPortal
                selectedRoomId={selectedRoomId}
                setSelectedRoomId={setSelectedRoomId}
                rooms={rooms}
                invoices={invoices}
                tenants={tenants}
                proofs={proofs}
                announcements={announcements}
                settings={settings}
                currentMonth={currentMonth}
                currentUser={currentUser}
                onRefresh={loadAllData}
                onOpenInvoiceModal={(inv) => setActiveInvoiceModal(inv)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>{settings.houseName || 'Nhà Trọ An Cư'}</strong> • Quản lý 6 phòng chuyên nghiệp & tự động
          </div>
          <div>
            Hệ thống đối soát chứng từ, hóa đơn & lưu trữ CCCD an toàn
          </div>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* POPUP MODALS */}
      {/* ======================================================== */}

      {/* Invoice Detail / Print / Zalo Modal */}
      {activeInvoiceModal && (
        <InvoiceModal
          invoice={activeInvoiceModal}
          settings={settings}
          onClose={() => setActiveInvoiceModal(null)}
          onRefresh={loadAllData}
        />
      )}

      {/* Meter Reading & Fee Calculator Modal */}
      {activeMeterModal && (
        <MeterReadingModal
          invoice={activeMeterModal}
          onClose={() => setActiveMeterModal(null)}
          onSaved={loadAllData}
        />
      )}

      {/* Payment Proof Review Modal */}
      {activeProofModal && (
        <ProofReviewModal
          proof={activeProofModal}
          onClose={() => setActiveProofModal(null)}
          onReviewed={loadAllData}
        />
      )}

      {/* Tenant & CCCD Modal */}
      {activeTenantModal !== null && (
        <TenantModal
          tenant={activeTenantModal?.id ? activeTenantModal : null}
          rooms={rooms}
          onClose={() => setActiveTenantModal(null)}
          onSaved={loadAllData}
        />
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          onClose={() => setShowExpenseModal(false)}
          onSaved={loadAllData}
        />
      )}

      {/* Announcement Modal (Cúp điện, Cúp nước, Thông báo) */}
      {showAnnouncementModal && (
        <AnnouncementModal
          rooms={rooms}
          onClose={() => setShowAnnouncementModal(false)}
          onSaved={loadAllData}
        />
      )}

      {/* Room Modal (Sửa thông tin & Thêm/Xóa phòng trọ) */}
      {activeRoomModal !== null && (
        <RoomModal
          room={activeRoomModal?.id ? activeRoomModal : null}
          rooms={rooms}
          onClose={() => setActiveRoomModal(null)}
          onSaved={loadAllData}
        />
      )}

    </div>
  );
}
