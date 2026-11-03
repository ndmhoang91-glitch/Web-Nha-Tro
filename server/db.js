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
        1, 'Nhà Trọ An Cư 6 Phòng', '123/45 Đường Số 8, Phường Linh Trung, TP. Thủ Đức, TP. HCM',
        'Nguyễn Văn Hoàng', '0988123456',
        'MBBANK', '0988123456', 'NGUYEN VAN HOANG',
        1500000, 50000, 4000, 12000, 30000, 5, 'admin123'
      )
    `).run();
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
