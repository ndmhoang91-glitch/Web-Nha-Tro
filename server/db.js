const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Support Render Persistent Disk via DATA_DIR environment variable
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
const dbDir = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'db') : __dirname;
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.sqlite');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency & performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure upload directories exist
const uploadsBase = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '../uploads');

const uploadDirs = [
  uploadsBase,
  path.join(uploadsBase, 'cccd'),
  path.join(uploadsBase, 'proofs'),
  path.join(uploadsBase, 'meters'),
  path.join(uploadsBase, 'expenses'),
  path.join(uploadsBase, 'requests')
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Auto-seed sample mock SVGs if not present
const sampleProofs = [
  {
    path: path.join(uploadsBase, 'proofs', 'sample_proof_101.svg'),
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560"><rect width="100%" height="100%" fill="#f0fdf4"/><rect x="20" y="20" width="360" height="520" rx="16" fill="white" stroke="#16a34a" stroke-width="2"/><circle cx="200" cy="80" r="32" fill="#22c55e"/><path d="M188 80l8 8 16-16" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="200" y="140" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#15803d">GIAO DỊCH THÀNH CÔNG</text><text x="200" y="180" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="bold" fill="#0f172a">1.840.000 đ</text><text x="200" y="210" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#64748b">02/11/2026 09:28:15</text><line x1="40" y1="230" x2="360" y2="230" stroke="#e2e8f0" stroke-dasharray="4"/><text x="50" y="270" font-family="sans-serif" font-size="13" fill="#64748b">Người thụ hưởng:</text><text x="350" y="270" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">NGUYEN VAN HOANG</text><text x="50" y="310" font-family="sans-serif" font-size="13" fill="#64748b">Ngân hàng:</text><text x="350" y="310" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">MBBank (0988123456)</text><text x="50" y="350" font-family="sans-serif" font-size="13" fill="#64748b">Nội dung:</text><text x="350" y="350" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="bold" fill="#2563eb">P101 T11 2026</text><text x="50" y="390" font-family="sans-serif" font-size="13" fill="#64748b">Mã giao dịch:</text><text x="350" y="390" text-anchor="end" font-family="sans-serif" font-size="13" font-family="monospace" fill="#475569">FT261102983172</text><rect x="40" y="430" width="320" height="50" rx="8" fill="#f8fafc" stroke="#cbd5e1"/><text x="200" y="460" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#16a34a" font-weight="bold">✓ Đã đối soát &amp; lưu trữ chứng từ an toàn</text></svg>`
  },
  {
    path: path.join(uploadsBase, 'proofs', 'sample_proof_102.svg'),
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="560" viewBox="0 0 400 560"><rect width="100%" height="100%" fill="#eff6ff"/><rect x="20" y="20" width="360" height="520" rx="16" fill="white" stroke="#3b82f6" stroke-width="2"/><circle cx="200" cy="80" r="32" fill="#3b82f6"/><path d="M188 80l8 8 16-16" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="200" y="140" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1d4ed8">GIAO DỊCH CHỜ DUYỆT</text><text x="200" y="180" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="bold" fill="#0f172a">1.818.000 đ</text><text x="200" y="210" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#64748b">02/11/2026 11:45:00</text><line x1="40" y1="230" x2="360" y2="230" stroke="#e2e8f0" stroke-dasharray="4"/><text x="50" y="270" font-family="sans-serif" font-size="13" fill="#64748b">Người thụ hưởng:</text><text x="350" y="270" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">NGUYEN VAN HOANG</text><text x="50" y="310" font-family="sans-serif" font-size="13" fill="#64748b">Ngân hàng:</text><text x="350" y="310" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="bold" fill="#1e293b">MBBank (0988123456)</text><text x="50" y="350" font-family="sans-serif" font-size="13" fill="#64748b">Nội dung:</text><text x="350" y="350" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="bold" fill="#2563eb">P102 TIEN TRO T11</text><text x="50" y="390" font-family="sans-serif" font-size="13" fill="#64748b">Mã giao dịch:</text><text x="350" y="390" text-anchor="end" font-family="sans-serif" font-size="13" font-family="monospace" fill="#475569">VCB998124501</text><rect x="40" y="430" width="320" height="50" rx="8" fill="#fef3c7" stroke="#f59e0b"/><text x="200" y="460" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#b45309" font-weight="bold">⏳ Đang chờ chủ trọ duyệt đối soát</text></svg>`
  },
  {
    path: path.join(uploadsBase, 'cccd', 'sample_cccd_front.svg'),
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="320" viewBox="0 0 500 320"><rect width="500" height="320" rx="16" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/><text x="250" y="38" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="#1e3a8a">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</text><text x="250" y="54" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#1e3a8a">Độc lập - Tự do - Hạnh phúc</text><text x="250" y="78" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#dc2626">CĂN CƯỚC CÔNG DÂN</text><rect x="40" y="95" width="100" height="130" rx="8" fill="#e2e8f0" stroke="#94a3b8"/><circle cx="90" cy="140" r="28" fill="#cbd5e1"/><text x="160" y="115" font-family="sans-serif" font-size="11" fill="#475569">Số / No.:</text><text x="230" y="115" font-family="monospace" font-size="14" font-weight="bold" fill="#0f172a">0792 0100 4567</text><text x="160" y="145" font-family="sans-serif" font-size="11" fill="#475569">Họ và tên / Full name:</text><text x="160" y="165" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">TRẦN VĂN MINH</text><text x="160" y="195" font-family="sans-serif" font-size="11" fill="#475569">Ngày sinh / Date of birth:</text><text x="310" y="195" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a">15/08/2001</text></svg>`
  },
  {
    path: path.join(uploadsBase, 'cccd', 'sample_cccd_back.svg'),
    content: `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="320" viewBox="0 0 500 320"><rect width="500" height="320" rx="16" fill="#eff6ff" stroke="#3b82f6" stroke-width="2"/><text x="30" y="35" font-family="sans-serif" font-size="11" fill="#475569">Đặc điểm nhận dạng / Personal identification:</text><text x="30" y="55" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a">Nốt ruồi c. 1cm dưới sau đuôi lông mày trái</text><text x="30" y="85" font-family="sans-serif" font-size="11" fill="#475569">Ngày, tháng, năm / Date, month, year:</text><text x="240" y="85" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a">10/05/2021</text><rect x="20" y="235" width="460" height="65" rx="6" fill="#1e293b"/><text x="35" y="260" font-family="monospace" font-size="12" fill="#38bdf8">IDVNM0792010045672&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</text></svg>`
  }
];

sampleProofs.forEach(item => {
  if (!fs.existsSync(item.path)) {
    fs.writeFileSync(item.path, item.content);
  }
});

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      houseName TEXT DEFAULT 'Nhà Trọ An Cư',
      address TEXT DEFAULT '123 Đường Số 5, Linh Trung, TP. Thủ Đức, TP. HCM',
      landlordName TEXT DEFAULT 'Nguyễn Văn Hoàng (Chủ Trọ)',
      landlordPhone TEXT DEFAULT '0988123456',
      bankName TEXT DEFAULT 'MBBANK',
      bankAccount TEXT DEFAULT '0988123456',
      bankOwner TEXT DEFAULT 'NGUYEN VAN HOANG',
      defaultRoomPrice REAL DEFAULT 1500000,
      defaultWifiFee REAL DEFAULT 50000,
      defaultElectricityPrice REAL DEFAULT 4000,
      defaultWaterPrice REAL DEFAULT 12000,
      defaultGarbageFee REAL DEFAULT 30000,
      billDueDay INTEGER DEFAULT 5,
      managerPassword TEXT DEFAULT 'admin123'
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      floor INTEGER DEFAULT 1,
      basePrice REAL DEFAULT 1500000,
      wifiFee REAL DEFAULT 50000,
      status TEXT DEFAULT 'OCCUPIED', -- 'OCCUPIED', 'AVAILABLE', 'MAINTENANCE'
      area REAL DEFAULT 18.5,
      description TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roomId INTEGER NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password TEXT DEFAULT '123456',
      idCardNumber TEXT,
      idCardDate TEXT,
      idCardPlace TEXT,
      idCardFrontUrl TEXT,
      idCardBackUrl TEXT,
      dateOfBirth TEXT,
      gender TEXT DEFAULT 'Nam',
      hometown TEXT,
      licensePlate TEXT,
      startDate TEXT,
      deposit REAL DEFAULT 1500000,
      isRepresentative INTEGER DEFAULT 1,
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'MOVED_OUT'
      notes TEXT,
      createdAt TEXT,
      FOREIGN KEY (roomId) REFERENCES rooms (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceCode TEXT UNIQUE NOT NULL,
      roomId INTEGER NOT NULL,
      month TEXT NOT NULL, -- YYYY-MM
      roomPrice REAL DEFAULT 1500000,
      oldElectricity REAL DEFAULT 0,
      newElectricity REAL DEFAULT 0,
      electricityUsage REAL DEFAULT 0,
      electricityPrice REAL DEFAULT 4000,
      electricityCost REAL DEFAULT 0,
      electricityMeterPhoto TEXT,
      oldWater REAL DEFAULT 0,
      newWater REAL DEFAULT 0,
      waterUsage REAL DEFAULT 0,
      waterPrice REAL DEFAULT 12000,
      waterCost REAL DEFAULT 0,
      waterMeterPhoto TEXT,
      wifiFee REAL DEFAULT 50000,
      extraFees TEXT DEFAULT '[]', -- JSON array: [{ name, amount }]
      totalExtraFee REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      totalAmount REAL NOT NULL,
      paidAmount REAL DEFAULT 0,
      remainingAmount REAL NOT NULL,
      status TEXT DEFAULT 'UNPAID', -- 'UNPAID', 'PARTIAL', 'PAID', 'PENDING_APPROVAL'
      dueDate TEXT,
      paidDate TEXT,
      notes TEXT,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY (roomId) REFERENCES rooms (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payment_proofs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceId INTEGER NOT NULL,
      roomId INTEGER NOT NULL,
      tenantId INTEGER,
      amount REAL NOT NULL,
      paymentMethod TEXT DEFAULT 'BANK_TRANSFER', -- 'BANK_TRANSFER', 'CASH'
      proofImageUrl TEXT NOT NULL,
      transactionCode TEXT,
      paymentDate TEXT NOT NULL,
      submittedBy TEXT DEFAULT 'TENANT', -- 'TENANT', 'MANAGER'
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
      reviewNotes TEXT,
      reviewedAt TEXT,
      createdAt TEXT,
      FOREIGN KEY (invoiceId) REFERENCES invoices (id) ON DELETE CASCADE,
      FOREIGN KEY (roomId) REFERENCES rooms (id) ON DELETE CASCADE,
      FOREIGN KEY (tenantId) REFERENCES tenants (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL, -- 'DIEN_NUOC_TONG', 'SUA_CHUA', 'INTERNET', 'VE_SINH_RAC', 'VAT_TU', 'KHAC'
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      receiptImageUrl TEXT,
      notes TEXT,
      createdAt TEXT
    );

    CREATE TABLE IF NOT EXISTS maintenance_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roomId INTEGER NOT NULL,
      tenantId INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      imageUrl TEXT,
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED'
      createdAt TEXT,
      resolvedAt TEXT,
      FOREIGN KEY (roomId) REFERENCES rooms (id) ON DELETE CASCADE,
      FOREIGN KEY (tenantId) REFERENCES tenants (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      detail TEXT NOT NULL,
      actorRole TEXT NOT NULL,
      actorName TEXT,
      roomId INTEGER,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'OUTAGE_ELECTRIC', -- 'OUTAGE_ELECTRIC', 'OUTAGE_WATER', 'URGENT', 'GENERAL', 'REMINDER'
      targetType TEXT DEFAULT 'ALL', -- 'ALL' (tất cả 6 phòng) or 'SPECIFIC_ROOM'
      targetRoomId INTEGER,
      startTime TEXT,
      endTime TEXT,
      isPinned INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL,
      createdBy TEXT DEFAULT 'Chủ Trọ',
      FOREIGN KEY (targetRoomId) REFERENCES rooms (id) ON DELETE CASCADE
    );
  `);

  // Initialize Settings if not exists
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (settingsCount === 0) {
    db.prepare(`
      INSERT INTO settings (
        id, houseName, address, landlordName, landlordPhone,
        bankName, bankAccount, bankOwner, defaultRoomPrice,
        defaultWifiFee, defaultElectricityPrice, defaultWaterPrice,
        defaultGarbageFee, billDueDay, managerPassword
      ) VALUES (
        1, 'Nhà Trọ An Cư 6 Phòng', '123/45 Đường Số 8, Phường Linh Trung, TP. Thủ Đức, TP. HCM',
        'Nguyễn Văn Hoàng', '0988123456',
        'MBBANK', '0988123456', 'NGUYEN VAN HOANG',
        1500000, 50000, 4000, 12000, 30000, 5, 'admin123'
      )
    `).run();
  }

  // Initialize 6 Rooms if not exists
  const roomCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  if (roomCount === 0) {
    const insertRoom = db.prepare(`
      INSERT INTO rooms (name, floor, basePrice, wifiFee, status, area, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const rooms = [
      { name: 'Phòng 101', floor: 1, basePrice: 1500000, wifiFee: 50000, status: 'OCCUPIED', area: 18, description: 'Tầng 1 - Mặt tiền thoáng mát, có gác lửng, toilet riêng' },
      { name: 'Phòng 102', floor: 1, basePrice: 1500000, wifiFee: 50000, status: 'OCCUPIED', area: 18, description: 'Tầng 1 - Cạnh sân để xe, có bếp nấu ăn, quạt trần' },
      { name: 'Phòng 103', floor: 1, basePrice: 1500000, wifiFee: 50000, status: 'OCCUPIED', area: 19, description: 'Tầng 1 - Phòng cuối yên tĩnh, cửa sổ trời' },
      { name: 'Phòng 201', floor: 2, basePrice: 1500000, wifiFee: 50000, status: 'OCCUPIED', area: 18, description: 'Tầng 2 - Ban công trước lộng gió, gác cao đứng thẳng' },
      { name: 'Phòng 202', floor: 2, basePrice: 1500000, wifiFee: 50000, status: 'OCCUPIED', area: 18, description: 'Tầng 2 - Phòng giữa sáng sủa, có chỗ phơi đồ riêng' },
      { name: 'Phòng 203', floor: 2, basePrice: 1500000, wifiFee: 50000, status: 'AVAILABLE', area: 18, description: 'Tầng 2 - Cửa sổ ban công sau, thoáng mát sạch sẽ' },
    ];

    rooms.forEach(r => {
      insertRoom.run(r.name, r.floor, r.basePrice, r.wifiFee, r.status, r.area, r.description);
    });

    // Sample tenants for 5 occupied rooms
    const insertTenant = db.prepare(`
      INSERT INTO tenants (
        roomId, fullName, phone, password, idCardNumber, idCardDate, idCardPlace,
        idCardFrontUrl, idCardBackUrl, dateOfBirth, gender, hometown, licensePlate,
        startDate, deposit, isRepresentative, status, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const tenants = [
      {
        roomId: 1,
        fullName: 'Trần Văn Minh',
        phone: '0912345678',
        password: '123',
        idCardNumber: '079201004567',
        idCardDate: '2021-05-10',
        idCardPlace: 'Cục Cảnh sát QLHC về TTXH',
        idCardFrontUrl: '/uploads/cccd/sample_cccd_front.svg',
        idCardBackUrl: '/uploads/cccd/sample_cccd_back.svg',
        dateOfBirth: '2001-08-15',
        gender: 'Nam',
        hometown: 'Long An',
        licensePlate: '62-F1 889.92',
        startDate: '2026-01-10',
        deposit: 1500000,
        isRepresentative: 1,
        status: 'ACTIVE',
        notes: 'Sinh viên ĐH Bách Khoa, ở hiền lành, thanh toán đúng hạn',
        createdAt: now
      },
      {
        roomId: 2,
        fullName: 'Lê Thị Thu Thảo',
        phone: '0987654321',
        password: '123',
        idCardNumber: '075200009876',
        idCardDate: '2022-02-14',
        idCardPlace: 'Cục Cảnh sát QLHC về TTXH',
        idCardFrontUrl: '/uploads/cccd/sample_cccd_front.svg',
        idCardBackUrl: '/uploads/cccd/sample_cccd_back.svg',
        dateOfBirth: '2000-11-20',
        gender: 'Nữ',
        hometown: 'Đồng Nai',
        licensePlate: '60-B3 456.78',
        startDate: '2026-03-01',
        deposit: 1500000,
        isRepresentative: 1,
        status: 'ACTIVE',
        notes: 'Nhân viên văn phòng công ty FPT',
        createdAt: now
      },
      {
        roomId: 3,
        fullName: 'Nguyễn Thành Đạt',
        phone: '0933112233',
        password: '123',
        idCardNumber: '083198007788',
        idCardDate: '2021-09-12',
        idCardPlace: 'Cục Cảnh sát QLHC về TTXH',
        idCardFrontUrl: '/uploads/cccd/sample_cccd_front.svg',
        idCardBackUrl: '/uploads/cccd/sample_cccd_back.svg',
        dateOfBirth: '1998-04-05',
        gender: 'Nam',
        hometown: 'Bến Tre',
        licensePlate: '71-C2 123.45',
        startDate: '2026-02-15',
        deposit: 1500000,
        isRepresentative: 1,
        status: 'ACTIVE',
        notes: 'Làm kỹ sư cơ khí, đi làm ca ngày',
        createdAt: now
      },
      {
        roomId: 4,
        fullName: 'Phạm Quỳnh Anh',
        phone: '0909887766',
        password: '123',
        idCardNumber: '077202003344',
        idCardDate: '2023-01-05',
        idCardPlace: 'Cục Cảnh sát QLHC về TTXH',
        idCardFrontUrl: '/uploads/cccd/sample_cccd_front.svg',
        idCardBackUrl: '/uploads/cccd/sample_cccd_back.svg',
        dateOfBirth: '2002-12-10',
        gender: 'Nữ',
        hometown: 'Vũng Tàu',
        licensePlate: '72-D1 998.81',
        startDate: '2026-05-01',
        deposit: 1500000,
        isRepresentative: 1,
        status: 'ACTIVE',
        notes: 'Sinh viên năm cuối ĐH KHXH&NV',
        createdAt: now
      },
      {
        roomId: 5,
        fullName: 'Võ Minh Quân',
        phone: '0977223344',
        password: '123',
        idCardNumber: '086199005511',
        idCardDate: '2022-08-19',
        idCardPlace: 'Cục Cảnh sát QLHC về TTXH',
        idCardFrontUrl: '/uploads/cccd/sample_cccd_front.svg',
        idCardBackUrl: '/uploads/cccd/sample_cccd_back.svg',
        dateOfBirth: '1999-07-25',
        gender: 'Nam',
        hometown: 'Bình Thuận',
        licensePlate: '86-B2 678.90',
        startDate: '2026-04-10',
        deposit: 1500000,
        isRepresentative: 1,
        status: 'ACTIVE',
        notes: 'Kế toán viên',
        createdAt: now
      }
    ];

    tenants.forEach(t => {
      insertTenant.run(
        t.roomId, t.fullName, t.phone, t.password, t.idCardNumber, t.idCardDate,
        t.idCardPlace, t.idCardFrontUrl, t.idCardBackUrl, t.dateOfBirth, t.gender,
        t.hometown, t.licensePlate, t.startDate, t.deposit, t.isRepresentative,
        t.status, t.notes, t.createdAt
      );
    });

    // Sample Invoices for current month: 2026-11
    const currentMonth = '2026-11';
    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        invoiceCode, roomId, month, roomPrice,
        oldElectricity, newElectricity, electricityUsage, electricityPrice, electricityCost,
        oldWater, newWater, waterUsage, waterPrice, waterCost,
        wifiFee, extraFees, totalExtraFee, discount, totalAmount, paidAmount, remainingAmount,
        status, dueDate, paidDate, notes, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Sample invoices for rooms 1-5
    const sampleInvoices = [
      {
        code: `HD-${currentMonth.replace('-', '')}-101`,
        roomId: 1,
        oldE: 1420, newE: 1485, eUsage: 65, eCost: 65 * 4000,
        oldW: 42, newW: 47, wUsage: 5, wCost: 5 * 12000,
        wifi: 50000,
        extraFees: JSON.stringify([{ name: 'Rác & Vệ sinh hành lang', amount: 30000 }]),
        totalExtra: 30000,
        total: 1500000 + (65 * 4000) + (5 * 12000) + 50000 + 30000,
        paid: 1500000 + (65 * 4000) + (5 * 12000) + 50000 + 30000,
        status: 'PAID',
        paidDate: '2026-11-02 09:30:00'
      },
      {
        code: `HD-${currentMonth.replace('-', '')}-102`,
        roomId: 2,
        oldE: 980, newE: 1040, eUsage: 60, eCost: 60 * 4000,
        oldW: 30, newW: 34, wUsage: 4, wCost: 4 * 12000,
        wifi: 50000,
        extraFees: JSON.stringify([{ name: 'Rác & Vệ sinh hành lang', amount: 30000 }]),
        totalExtra: 30000,
        total: 1500000 + (60 * 4000) + (4 * 12000) + 50000 + 30000,
        paid: 0,
        status: 'PENDING_APPROVAL', // Waiting landlord review for proof!
        paidDate: null
      },
      {
        code: `HD-${currentMonth.replace('-', '')}-103`,
        roomId: 3,
        oldE: 1105, newE: 1180, eUsage: 75, eCost: 75 * 4000,
        oldW: 55, newW: 61, wUsage: 6, wCost: 6 * 12000,
        wifi: 50000,
        extraFees: JSON.stringify([{ name: 'Rác & Vệ sinh', amount: 30000 }, { name: 'Gửi xe thêm 1 chiếc', amount: 100000 }]),
        totalExtra: 130000,
        total: 1500000 + (75 * 4000) + (6 * 12000) + 50000 + 130000,
        paid: 0,
        status: 'UNPAID',
        paidDate: null
      },
      {
        code: `HD-${currentMonth.replace('-', '')}-201`,
        roomId: 4,
        oldE: 820, newE: 872, eUsage: 52, eCost: 52 * 4000,
        oldW: 28, newW: 32, wUsage: 4, wCost: 4 * 12000,
        wifi: 50000,
        extraFees: JSON.stringify([{ name: 'Rác & Vệ sinh', amount: 30000 }]),
        totalExtra: 30000,
        total: 1500000 + (52 * 4000) + (4 * 12000) + 50000 + 30000,
        paid: 1836000,
        status: 'PAID',
        paidDate: '2026-11-01 20:15:00'
      },
      {
        code: `HD-${currentMonth.replace('-', '')}-202`,
        roomId: 5,
        oldE: 750, newE: 810, eUsage: 60, eCost: 60 * 4000,
        oldW: 20, newW: 25, wUsage: 5, wCost: 5 * 12000,
        wifi: 50000,
        extraFees: JSON.stringify([{ name: 'Rác & Vệ sinh', amount: 30000 }]),
        totalExtra: 30000,
        total: 1500000 + (60 * 4000) + (5 * 12000) + 50000 + 30000,
        paid: 0,
        status: 'UNPAID',
        paidDate: null
      }
    ];

    sampleInvoices.forEach(inv => {
      const rem = inv.total - inv.paid;
      insertInvoice.run(
        inv.code, inv.roomId, currentMonth, 1500000,
        inv.oldE, inv.newE, inv.eUsage, 4000, inv.eCost,
        inv.oldW, inv.newW, inv.wUsage, 12000, inv.wCost,
        inv.wifi, inv.extraFees, inv.totalExtra, 0, inv.total, inv.paid, rem,
        inv.status, `${currentMonth}-05`, inv.paidDate, 'Hóa đơn tiền phòng định kỳ', now, now
      );
    });

    // Sample Payment Proofs
    const insertProof = db.prepare(`
      INSERT INTO payment_proofs (
        invoiceId, roomId, tenantId, amount, paymentMethod,
        proofImageUrl, transactionCode, paymentDate, submittedBy,
        status, reviewNotes, reviewedAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Room 1 paid with proof approved
    insertProof.run(
      1, 1, 1, 1840000, 'BANK_TRANSFER',
      '/uploads/proofs/sample_proof_101.svg', 'FT261102983172',
      '2026-11-02 09:28:15', 'TENANT', 'APPROVED',
      'Đã đối soát khớp tiền vào tài khoản MBBank', '2026-11-02 09:30:00', '2026-11-02 09:28:15'
    );

    // Room 2 submitted proof waiting approval!
    insertProof.run(
      2, 2, 2, 1818000, 'BANK_TRANSFER',
      '/uploads/proofs/sample_proof_102.svg', 'VCB998124501',
      '2026-11-02 11:45:00', 'TENANT', 'PENDING',
      null, null, '2026-11-02 11:45:00'
    );

    // Sample Expenses
    const insertExpense = db.prepare(`
      INSERT INTO expenses (title, category, amount, date, receiptImageUrl, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertExpense.run('Tiền điện tổng EVN tháng 10', 'DIEN_NUOC_TONG', 1250000, '2026-10-25', '', 'Thanh toán tự động qua app ngân hàng', now);
    insertExpense.run('Tiền nước Sawaco tháng 10', 'DIEN_NUOC_TONG', 340000, '2026-10-26', '', 'Hóa đơn nước máy tổng', now);
    insertExpense.run('Thay vòi sen inox phòng 103', 'SUA_CHUA', 180000, '2026-10-28', '', 'Mua tại tiệm điện nước đầu ngõ', now);
    insertExpense.run('Cáp quang VNPT gói doanh nghiệp', 'INTERNET', 280000, '2026-10-29', '', 'Internet tốc độ cao chia 6 phòng', now);

    // Sample Audit Logs
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (action, detail, actorRole, actorName, roomId, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertAudit.run('KHỞI_TẠO_HỆ_THỐNG', 'Hệ thống quản lý nhà trọ 6 phòng đã sẵn sàng', 'SYSTEM', 'Hệ thống', null, now);
    insertAudit.run('THANH_TOÁN_THÀNH_CÔNG', 'Đã duyệt đối soát hóa đơn HD-202611-101 (1.840.000đ) - Trần Văn Minh', 'MANAGER', 'Nguyễn Văn Hoàng', 1, now);
    insertAudit.run('GỬI_CHỨNG_TỪ', 'Khách phòng 102 (Lê Thị Thu Thảo) gửi ảnh ủy nhiệm chi chuyển khoản 1.818.000đ', 'TENANT', 'Lê Thị Thu Thảo', 2, now);
  }

  // Check and seed announcements
  const annCount = db.prepare('SELECT COUNT(*) as c FROM announcements').get().c;
  if (annCount === 0) {
    const insertAnn = db.prepare(`
      INSERT INTO announcements (title, content, type, targetType, targetRoomId, startTime, endTime, isPinned, createdAt, createdBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toLocaleString('vi-VN');

    insertAnn.run(
      '⚠️ Thông Báo Tạm Cúp Điện Bảo Trì Lưới Điện Khu Vực',
      'Điện lực Thủ Đức thông báo tạm ngừng cấp điện để thay thế aptomat tổng và bảo trì định kỳ trạm hạ áp. Quý khách vui lòng sạc đầy pin điện thoại, laptop, ngắt các thiết bị điện công suất lớn (máy giặt, bình nóng lạnh) trước giờ cắt điện để đảm bảo an toàn.',
      'OUTAGE_ELECTRIC',
      'ALL',
      null,
      '08:00 - 05/11/2026',
      '11:30 - 05/11/2026',
      1,
      now,
      'Chủ Nhà Trọ'
    );

    insertAnn.run(
      '💧 Thông Báo Tạm Khóa Nước Súc Rửa Bồn Nước Inox',
      'Chủ trọ sẽ tiến hành thau rửa, khử khuẩn và vệ sinh bồn chứa nước inox tổng trên sân thượng vào chiều Chủ Nhật. Toàn bộ hệ thống nước máy sẽ tạm ngắt trong thời gian thực hiện. Các phòng vui lòng chủ động trữ sẵn nước sinh hoạt vào xô chậu trước 13:00.',
      'OUTAGE_WATER',
      'ALL',
      null,
      '13:30 - 08/11/2026',
      '16:00 - 08/11/2026',
      1,
      now,
      'Chủ Nhà Trọ'
    );
  }
}

initDatabase();

module.exports = db;
