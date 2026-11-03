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
      status TEXT DEFAULT 'AVAILABLE', -- 'OCCUPIED', 'AVAILABLE', 'MAINTENANCE'
      area REAL DEFAULT 18.5,
      description TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roomId INTEGER NOT NULL,
      fullName TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password TEXT DEFAULT '123',
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
      rentDueDate TEXT,
      utilityDueDate TEXT,
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
      targetType TEXT DEFAULT 'ALL',
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
        1, 'Nhà Trọ Hoàng Phát', '45A/23A, Đinh Tiên Hoàng, Phường Tân Hạnh, Tỉnh Vĩnh Long',
        'Nguyễn Đặng Minh Hoàng', '0829506597',
        'TECHCOMBANK', '8868357117', 'NGUYEN DANG MINH HOANG',
        1500000, 50000, 4000, 12000, 30000, 5, 'Hoang@357117'
      )
    `).run();
  }

  // Seed default 6 rooms & tenants & historical invoices if database is fresh
  const roomsCount = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
  if (roomsCount === 0) {
    const insertRoom = db.prepare(`
      INSERT INTO rooms (id, name, floor, basePrice, wifiFee, status, area, description, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertRoom.run(1, 'Phòng số 1', 1, 1500000, 50000, 'OCCUPIED', 18, 'Phòng tầng trệt, thoáng mát, vệ sinh khép kín', '');
    insertRoom.run(2, 'Phòng số 2', 1, 1500000, 50000, 'OCCUPIED', 18, 'Phòng tầng trệt, thoáng mát, vệ sinh khép kín', '');
    insertRoom.run(3, 'Phòng số 3', 1, 1500000, 50000, 'OCCUPIED', 18, 'Phòng tầng trệt, thoáng mát, vệ sinh khép kín', '');
    insertRoom.run(4, 'Phòng số 4', 1, 1500000, 50000, 'OCCUPIED', 18, 'Phòng tầng trệt, thoáng mát, vệ sinh khép kín', '');
    insertRoom.run(5, 'Phòng số 5', 1, 1500000, 50000, 'OCCUPIED', 18, 'Phòng tầng trệt, thoáng mát, vệ sinh khép kín', '');
    insertRoom.run(6, 'Phòng số 6', 1, 1500000, 50000, 'OCCUPIED', 18, 'Phòng tầng trệt, thoáng mát, vệ sinh khép kín', '');

    const now = new Date().toISOString();

    const insertTenant = db.prepare(`
      INSERT INTO tenants (
        id, roomId, fullName, phone, password, idCardNumber, idCardDate, idCardPlace,
        idCardFrontUrl, idCardBackUrl, dateOfBirth, gender, hometown, licensePlate,
        startDate, deposit, isRepresentative, status, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTenant.run(1, 1, 'Trần Như Huỳnh', '086308001527', '086308001527', '086308001527', '2023-03-09', 'Cục Cảnh sát QLHC về TTXH', '/uploads/cccd/sample_cccd_front.svg', '/uploads/cccd/sample_cccd_back.svg', '2008-02-23', 'Nữ', 'Vĩnh Long', '', '2026-09-13', 1500000, 1, 'ACTIVE', 'Người đại diện phòng số 1', now);
    insertTenant.run(2, 1, 'Trần Thị Ngọc Huyền', '086308004370', '086308004370', '086308004370', '2022-07-29', 'Cục Cảnh sát QLHC về TTXH', '/uploads/cccd/sample_cccd_front.svg', '/uploads/cccd/sample_cccd_back.svg', '', 'Nữ', 'Vĩnh Long', '', '2026-09-13', 1500000, 0, 'ACTIVE', 'Ở cùng phòng số 1', now);
    insertTenant.run(3, 2, 'Phạm Ngọc Ý', '0788738250', '0788738250', '093307006748', '2022-05-11', 'Cục Cảnh sát QLHC về TTXH', '/uploads/cccd/sample_cccd_front.svg', '/uploads/cccd/sample_cccd_back.svg', '2007-10-16', 'Nữ', 'Hậu Giang', '', '2026-09-13', 1500000, 1, 'ACTIVE', 'Khách thuê đại diện phòng số 2', now);
    insertTenant.run(4, 3, 'Nguyễn Mỹ Trân', '0829506597', '0829506597', '094308002875', '2021-05-10', 'Cục Cảnh sát QLHC về TTXH', '/uploads/cccd/sample_cccd_front.svg', '/uploads/cccd/sample_cccd_back.svg', '2008-02-14', 'Nữ', 'Sóc Trăng', '', '2026-10-30', 1500000, 1, 'ACTIVE', 'Khách thuê đại diện phòng số 3', now);
    insertTenant.run(5, 4, 'La Nguyễn Trọng Nhân', '0778182371', '0778182371', '086205010323', '2021-12-09', 'Cục Cảnh sát QLHC về TTXH', '/uploads/cccd/sample_cccd_front.svg', '/uploads/cccd/sample_cccd_back.svg', '2005-12-16', 'Nam', 'Vĩnh Long', '', '2026-09-30', 1500000, 1, 'ACTIVE', 'Khách thuê đại diện phòng số 4', now);
    insertTenant.run(6, 5, 'Trần Chí Thiện', '0796880319', '0796880319', '087208015345', '2023-01-21', 'Cục Cảnh sát QLHC về TTXH', '/uploads/cccd/sample_cccd_front.svg', '/uploads/cccd/sample_cccd_back.svg', '2008-04-23', 'Nam', 'Đồng Tháp', '', '2026-08-28', 1500000, 1, 'ACTIVE', 'Khách thuê đại diện phòng số 5', now);
    insertTenant.run(7, 6, 'Nguyễn Thị Hồng Mận', '0355214800', '0355214800', '089308018794', '2022-08-04', 'Cục Cảnh sát QLHC về TTXH', '/uploads/cccd/sample_cccd_front.svg', '/uploads/cccd/sample_cccd_back.svg', '2008-02-24', 'Nữ', 'An Giang', '', '2026-08-30', 1500000, 1, 'ACTIVE', 'Khách thuê đại diện phòng số 6', now);

    const insertInv = db.prepare(`
      INSERT INTO invoices (
        invoiceCode, roomId, month, roomPrice,
        oldElectricity, newElectricity, electricityUsage, electricityPrice, electricityCost,
        oldWater, newWater, waterUsage, waterPrice, waterCost,
        wifiFee, extraFees, totalExtraFee, discount, totalAmount, paidAmount, remainingAmount,
        status, dueDate, paidDate, notes, createdAt, updatedAt, rentDueDate, utilityDueDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 2026-08 (T8)
    insertInv.run('HD-202608-1', 1, '2026-08', 1500000, 0, 11, 11, 4000, 44000, 0, 1, 1, 12000, 12000, 50000, '[]', 0, 0, 1606000, 0, 1606000, 'UNPAID', '2026-08-13', null, 'Điện chốt 1 Tây: 11, Nước chốt 20 Tây: 1', now, now, '2026-08-13', '2026-08-01');
    insertInv.run('HD-202608-2', 2, '2026-08', 1500000, 0, 1, 1, 4000, 4000, 0, 0, 0, 12000, 0, 50000, '[]', 0, 0, 1554000, 0, 1554000, 'UNPAID', '2026-08-13', null, 'Điện chốt 1 Tây: 1, Nước chốt 20 Tây: 0', now, now, '2026-08-13', '2026-08-01');
    insertInv.run('HD-202608-3', 3, '2026-08', 1500000, 0, 0, 0, 4000, 0, 0, 1, 0, 12000, 0, 50000, '[]', 0, 0, 1550000, 0, 1550000, 'UNPAID', '2026-08-30', null, 'Điện chốt 1 Tây: 0, Nước đồng hồ: 1', now, now, '2026-08-30', '2026-08-01');
    insertInv.run('HD-202608-4', 4, '2026-08', 1500000, 0, 0, 0, 4000, 0, 0, 8, 0, 12000, 0, 50000, '[]', 0, 0, 1550000, 0, 1550000, 'UNPAID', '2026-08-30', null, 'Điện chốt 1 Tây: 0, Nước đồng hồ: 8', now, now, '2026-08-30', '2026-08-01');
    insertInv.run('HD-202608-5', 5, '2026-08', 1500000, 0, 13, 13, 4000, 52000, 0, 2, 2, 12000, 24000, 50000, '[]', 0, 0, 1626000, 1550000, 76000, 'PARTIAL', '2026-08-28', '2026-08-28', 'Đã thu tiền phòng tháng đầu ngày 28/08 (1.550.000 đ). Điện chốt 1 Tây: 13, Nước chốt 20 Tây: 2.', now, now, '2026-08-28', '2026-08-01');
    insertInv.run('HD-202608-6', 6, '2026-08', 1500000, 0, 24, 24, 4000, 96000, 0, 1, 1, 12000, 12000, 50000, '[]', 0, 0, 1658000, 1550000, 108000, 'PARTIAL', '2026-08-30', '2026-08-30', 'Đã thu tiền phòng tháng đầu ngày 30/08 (1.550.000 đ). Điện chốt 1 Tây: 24, Nước chốt 20 Tây: 1.', now, now, '2026-08-30', '2026-08-01');

    // 2026-09 (T9)
    insertInv.run('HD-202609-1', 1, '2026-09', 1500000, 11, 23, 12, 4000, 48000, 1, 5, 4, 12000, 48000, 50000, '[]', 0, 0, 1646000, 1550000, 96000, 'PARTIAL', '2026-09-13', '2026-09-13', 'Đã thu tiền phòng tháng đầu ngày 13/09 (1.550.000 đ). Điện chốt 1 Tây: 23, Nước chốt 20 Tây: 5.', now, now, '2026-09-13', '2026-09-01');
    insertInv.run('HD-202609-2', 2, '2026-09', 1500000, 1, 6, 5, 4000, 20000, 0, 3, 3, 12000, 36000, 50000, '[]', 0, 0, 1606000, 1550000, 56000, 'PARTIAL', '2026-09-13', '2026-09-13', 'Đã thu tiền phòng tháng đầu ngày 13/09 (1.550.000 đ). Điện chốt 1 Tây: 6, Nước chốt 20 Tây: 3.', now, now, '2026-09-13', '2026-09-01');
    insertInv.run('HD-202609-3', 3, '2026-09', 1500000, 0, 0, 0, 4000, 0, 1, 1, 0, 12000, 0, 50000, '[]', 0, 0, 1550000, 0, 1550000, 'UNPAID', '2026-09-30', null, 'Chưa vào ở', now, now, '2026-09-30', '2026-09-01');
    insertInv.run('HD-202609-4', 4, '2026-09', 1500000, 0, 0, 0, 4000, 0, 8, 10, 2, 12000, 24000, 50000, '[]', 0, 0, 1574000, 1550000, 24000, 'PARTIAL', '2026-09-30', '2026-09-30', 'Đã thu tiền phòng tháng đầu ngày 30/09 (1.550.000 đ). Điện chốt 1 Tây: 0, Nước chốt 20 Tây: 10.', now, now, '2026-09-30', '2026-09-01');
    insertInv.run('HD-202609-5', 5, '2026-09', 1500000, 13, 31, 18, 4000, 72000, 2, 4, 2, 12000, 24000, 50000, '[]', 0, 0, 1646000, 1550000, 96000, 'PARTIAL', '2026-09-28', '2026-09-28', 'Đã thu tiền phòng tháng 2 ngày 28/09 (1.550.000 đ). Điện chốt 1 Tây: 31, Nước chốt 20 Tây: 4.', now, now, '2026-09-28', '2026-09-01');
    insertInv.run('HD-202609-6', 6, '2026-09', 1500000, 24, 40, 16, 4000, 64000, 1, 2, 1, 12000, 12000, 50000, '[]', 0, 0, 1626000, 1550000, 76000, 'PARTIAL', '2026-09-30', '2026-09-30', 'Đã thu tiền phòng tháng 2 ngày 30/09 (1.550.000 đ). Điện chốt 1 Tây: 40, Nước chốt 20 Tây: 2.', now, now, '2026-09-30', '2026-09-01');

    // 2026-10 (T10)
    insertInv.run('HD-202610-1', 1, '2026-10', 1500000, 23, 60, 37, 4000, 148000, 5, 5, 0, 12000, 0, 50000, '[]', 0, 0, 1698000, 0, 1698000, 'UNPAID', '2026-10-13', null, 'Tiền phòng kỳ 13/10. Điện chốt 1 Tây: 60 (dùng 37kW). Nước giữ số 5.', now, now, '2026-10-13', '2026-10-01');
    insertInv.run('HD-202610-2', 2, '2026-10', 1500000, 6, 31, 25, 4000, 100000, 3, 3, 0, 12000, 0, 50000, '[]', 0, 0, 1650000, 0, 1650000, 'UNPAID', '2026-10-13', null, 'Tiền phòng kỳ 13/10. Điện chốt 1 Tây: 31 (dùng 25kW). Nước giữ số 3.', now, now, '2026-10-13', '2026-10-01');
    insertInv.run('HD-202610-3', 3, '2026-10', 1500000, 0, 1, 1, 4000, 4000, 1, 1, 0, 12000, 0, 50000, '[]', 0, 0, 1554000, 1550000, 4000, 'PARTIAL', '2026-10-30', '2026-10-30', 'Đã thu tiền phòng tháng đầu ngày 30/10 (1.550.000 đ). Điện chốt 1 Tây: 1. Nước giữ số 1.', now, now, '2026-10-30', '2026-10-01');
    insertInv.run('HD-202610-4', 4, '2026-10', 1500000, 0, 14, 14, 4000, 56000, 10, 10, 0, 12000, 0, 50000, '[]', 0, 0, 1606000, 0, 1606000, 'UNPAID', '2026-10-30', null, 'Tiền phòng kỳ 30/10. Điện chốt 1 Tây: 14 (dùng 14kW). Nước giữ số 10.', now, now, '2026-10-30', '2026-10-01');
    insertInv.run('HD-202610-5', 5, '2026-10', 1500000, 31, 93, 62, 4000, 248000, 4, 4, 0, 12000, 0, 50000, '[]', 0, 0, 1798000, 0, 1798000, 'UNPAID', '2026-10-28', null, 'Tiền phòng kỳ 28/10. Điện chốt 1 Tây: 93 (dùng 62kW). Nước giữ số 4.', now, now, '2026-10-28', '2026-10-01');
    insertInv.run('HD-202610-6', 6, '2026-10', 1500000, 40, 77, 37, 4000, 148000, 2, 2, 0, 12000, 0, 50000, '[]', 0, 0, 1698000, 0, 1698000, 'UNPAID', '2026-10-30', null, 'Tiền phòng kỳ 30/10. Điện chốt 1 Tây: 77 (dùng 37kW). Nước giữ số 2.', now, now, '2026-10-30', '2026-10-01');

    // 2026-11 (T11)
    insertInv.run('HD-202611-1', 1, '2026-11', 1500000, 60, 60, 0, 4000, 0, 5, 5, 0, 12000, 0, 50000, '[{"name":"Rác & Vệ sinh chung","amount":30000}]', 30000, 0, 1580000, 0, 1580000, 'UNPAID', '2026-11-13', null, 'Tiền phòng thu ngày 13 theo HĐ, Điện nước chốt ngày 1 Tây', now, now, '2026-11-13', '2026-11-01');
    insertInv.run('HD-202611-2', 2, '2026-11', 1500000, 31, 31, 0, 4000, 0, 3, 3, 0, 12000, 0, 50000, '[{"name":"Rác & Vệ sinh chung","amount":30000}]', 30000, 0, 1580000, 0, 1580000, 'UNPAID', '2026-11-13', null, 'Tiền phòng thu ngày 13 theo HĐ, Điện nước chốt ngày 1 Tây', now, now, '2026-11-13', '2026-11-01');
    insertInv.run('HD-202611-3', 3, '2026-11', 1500000, 1, 1, 0, 4000, 0, 1, 1, 0, 12000, 0, 50000, '[{"name":"Rác & Vệ sinh chung","amount":30000}]', 30000, 0, 1580000, 0, 1580000, 'UNPAID', '2026-11-30', null, 'Tiền phòng thu ngày 30 theo HĐ, Điện nước chốt ngày 1 Tây', now, now, '2026-11-30', '2026-11-01');
    insertInv.run('HD-202611-4', 4, '2026-11', 1500000, 14, 14, 0, 4000, 0, 10, 10, 0, 12000, 0, 50000, '[{"name":"Rác & Vệ sinh chung","amount":30000}]', 30000, 0, 1580000, 0, 1580000, 'UNPAID', '2026-11-30', null, 'Tiền phòng thu ngày 30 theo HĐ, Điện nước chốt ngày 1 Tây', now, now, '2026-11-30', '2026-11-01');
    insertInv.run('HD-202611-5', 5, '2026-11', 1500000, 93, 93, 0, 4000, 0, 4, 4, 0, 12000, 0, 50000, '[{"name":"Rác & Vệ sinh chung","amount":30000}]', 30000, 0, 1580000, 0, 1580000, 'UNPAID', '2026-11-28', null, 'Tiền phòng thu ngày 28 theo HĐ, Điện nước chốt ngày 1 Tây', now, now, '2026-11-28', '2026-11-01');
    insertInv.run('HD-202611-6', 6, '2026-11', 1500000, 77, 77, 0, 4000, 0, 2, 2, 0, 12000, 0, 50000, '[{"name":"Rác & Vệ sinh chung","amount":30000}]', 30000, 0, 1580000, 0, 1580000, 'UNPAID', '2026-11-30', null, 'Tiền phòng thu ngày 30 theo HĐ, Điện nước chốt ngày 1 Tây', now, now, '2026-11-30', '2026-11-01');
  }

  // Ensure extra columns exist in invoices table if older DB
  try {
    const tableInfo = db.prepare('PRAGMA table_info(invoices)').all();
    const colNames = tableInfo.map(c => c.name);
    if (!colNames.includes('rentDueDate')) {
      db.prepare('ALTER TABLE invoices ADD COLUMN rentDueDate TEXT').run();
    }
    if (!colNames.includes('utilityDueDate')) {
      db.prepare('ALTER TABLE invoices ADD COLUMN utilityDueDate TEXT').run();
    }
  } catch (e) {
    // Ignore if already exists
  }
}

initDatabase();

module.exports = db;
