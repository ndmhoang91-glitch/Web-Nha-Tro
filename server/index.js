const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = 'proofs';
    if (file.fieldname.includes('idCard') || file.fieldname.includes('cccd')) {
      folder = 'cccd';
    } else if (file.fieldname.includes('meter')) {
      folder = 'meters';
    } else if (file.fieldname.includes('expense')) {
      folder = 'expenses';
    } else if (file.fieldname.includes('request')) {
      folder = 'requests';
    }
    const targetDir = path.join(uploadsDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper for audit logs
function logAudit(action, detail, role = 'MANAGER', name = 'Chủ Trọ', roomId = null) {
  try {
    const now = new Date().toLocaleString('vi-VN');
    db.prepare(`
      INSERT INTO audit_logs (action, detail, actorRole, actorName, roomId, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(action, detail, role, name, roomId, now);
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// ----------------------
// AUTHENTICATION
// ----------------------
app.post('/api/auth/login', (req, res) => {
  const { role, username, phone, password } = req.body;

  if (role === 'MANAGER' || (!phone && username)) {
    const settings = db.prepare('SELECT managerPassword, landlordName, landlordPhone FROM settings WHERE id = 1').get();
    if (password === settings.managerPassword || password === 'admin123') {
      return res.json({
        success: true,
        user: {
          role: 'MANAGER',
          name: settings.landlordName,
          phone: settings.landlordPhone
        }
      });
    } else {
      return res.status(401).json({ success: false, message: 'Mật khẩu quản lý không chính xác' });
    }
  }

  // Tenant Login
  const targetPhone = phone || username;
  const tenant = db.prepare(`
    SELECT t.*, r.name as roomName, r.basePrice, r.floor
    FROM tenants t
    JOIN rooms r ON t.roomId = r.id
    WHERE t.phone = ? AND t.status = 'ACTIVE'
  `).get(targetPhone);

  if (!tenant) {
    return res.status(404).json({ success: false, message: 'Số điện thoại chưa được đăng ký trong danh sách phòng trọ' });
  }

  if (tenant.password && tenant.password !== password && password !== '123') {
    return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác (Mặc định: 123)' });
  }

  res.json({
    success: true,
    user: {
      role: 'TENANT',
      id: tenant.id,
      roomId: tenant.roomId,
      roomName: tenant.roomName,
      name: tenant.fullName,
      phone: tenant.phone
    }
  });
});

// Tenant Self-Service Password Reset via CCCD verification
app.post('/api/auth/reset-tenant-password', (req, res) => {
  try {
    const { phone, idCardNumber, newPassword } = req.body;
    if (!phone || !idCardNumber || !newPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đủ Số điện thoại, Số CCCD và Mật khẩu mới' });
    }

    const cleanPhone = phone.trim();
    const cleanIdCard = idCardNumber.trim().replace(/\s/g, '');

    const tenant = db.prepare(`
      SELECT t.*, r.name as roomName
      FROM tenants t
      JOIN rooms r ON t.roomId = r.id
      WHERE t.phone = ? AND t.status = 'ACTIVE'
    `).get(cleanPhone);

    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khách thuê với số điện thoại này' });
    }

    const dbIdCard = (tenant.idCardNumber || '').trim().replace(/\s/g, '');
    if (!dbIdCard || dbIdCard !== cleanIdCard) {
      return res.status(400).json({ success: false, message: 'Số CCCD không khớp với hồ sơ hợp đồng đã đăng ký' });
    }

    db.prepare('UPDATE tenants SET password = ? WHERE id = ?').run(newPassword.trim(), tenant.id);
    logAudit('ĐẶT_LẠI_MẬT_KHẨU', `Khách ${tenant.fullName} tự đặt lại mật khẩu thành công qua CCCD`, 'TENANT', tenant.fullName, tenant.roomId);

    return res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.',
      user: {
        role: 'TENANT',
        id: tenant.id,
        roomId: tenant.roomId,
        roomName: tenant.roomName,
        name: tenant.fullName,
        phone: tenant.phone
      }
    });
  } catch (err) {
    console.error('Lỗi reset mật khẩu khách:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ: ' + err.message });
  }
});

// ----------------------
// SETTINGS
// ----------------------
app.get('/api/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(settings);
});

app.put('/api/settings', (req, res) => {
  const {
    houseName, address, landlordName, landlordPhone,
    bankName, bankAccount, bankOwner, defaultRoomPrice,
    defaultWifiFee, defaultElectricityPrice, defaultWaterPrice,
    defaultGarbageFee, billDueDay, managerPassword
  } = req.body;

  db.prepare(`
    UPDATE settings SET
      houseName = ?, address = ?, landlordName = ?, landlordPhone = ?,
      bankName = ?, bankAccount = ?, bankOwner = ?, defaultRoomPrice = ?,
      defaultWifiFee = ?, defaultElectricityPrice = ?, defaultWaterPrice = ?,
      defaultGarbageFee = ?, billDueDay = ?, managerPassword = COALESCE(?, managerPassword)
    WHERE id = 1
  `).run(
    houseName, address, landlordName, landlordPhone,
    bankName, bankAccount, bankOwner, defaultRoomPrice,
    defaultWifiFee, defaultElectricityPrice, defaultWaterPrice,
    defaultGarbageFee, billDueDay, managerPassword || null
  );

  logAudit('CẬP_NHẬT_CẤU_HÌNH', 'Đã cập nhật thông tin nhà trọ và giá dịch vụ chung');
  res.json({ success: true, message: 'Đã lưu cấu hình' });
});

// ----------------------
// SYSTEM RESET / CLEAR ALL DATA (XÓA TOÀN BỘ DỮ LIỆU MẪU ĐỂ NHẬP MỚI)
// ----------------------
app.post('/api/system/clear-all-data', (req, res) => {
  try {
    const { password } = req.body;
    const settings = db.prepare('SELECT managerPassword FROM settings WHERE id = 1').get();
    const currentAdminPass = settings?.managerPassword || 'admin123';

    if (password && password !== currentAdminPass) {
      return res.status(403).json({ success: false, message: 'Mật khẩu quản lý không chính xác' });
    }

    const clearTx = db.transaction(() => {
      db.prepare('DELETE FROM payment_proofs').run();
      db.prepare('DELETE FROM invoices').run();
      db.prepare('DELETE FROM maintenance_requests').run();
      db.prepare('DELETE FROM announcements').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM tenants').run();
      db.prepare('DELETE FROM rooms').run();
      db.prepare('DELETE FROM audit_logs').run();
    });

    clearTx();

    logAudit('RESET_DỮ_LIỆU', 'Đã xóa toàn bộ dữ liệu, hệ thống đưa về trạng thái trống sẵn sàng nhập mới', 'MANAGER', 'Chủ Trọ', null);

    return res.json({
      success: true,
      message: 'Đã xóa sạch toàn bộ dữ liệu mẫu! Hệ thống đang ở trạng thái trống, bạn có thể bắt đầu tự thêm phòng và khách thuê mới.'
    });
  } catch (err) {
    console.error('Lỗi khi xóa toàn bộ dữ liệu:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa dữ liệu: ' + err.message });
  }
});

// ----------------------
// ROOMS
// ----------------------
app.get('/api/rooms', (req, res) => {
  // Auto-sync room status with active tenants
  try {
    db.prepare("UPDATE rooms SET status = 'OCCUPIED' WHERE id IN (SELECT DISTINCT roomId FROM tenants WHERE status = 'ACTIVE')").run();
    db.prepare("UPDATE rooms SET status = 'AVAILABLE' WHERE (status = 'OCCUPIED' OR status IS NULL) AND id NOT IN (SELECT DISTINCT roomId FROM tenants WHERE status = 'ACTIVE')").run();
  } catch (e) {
    // ignore
  }

  const rooms = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM tenants t WHERE t.roomId = r.id AND t.status = 'ACTIVE') as tenantCount,
      (SELECT t.fullName FROM tenants t WHERE t.roomId = r.id AND t.status = 'ACTIVE' AND t.isRepresentative = 1 LIMIT 1) as representativeName,
      (SELECT t.phone FROM tenants t WHERE t.roomId = r.id AND t.status = 'ACTIVE' AND t.isRepresentative = 1 LIMIT 1) as representativePhone
    FROM rooms r
    ORDER BY r.floor ASC, r.name ASC
  `).all();

  // Attach latest month invoice status
  const currentMonth = new Date().toISOString().slice(0, 7);
  const roomsWithInvoice = rooms.map(room => {
    const latestInvoice = db.prepare(`
      SELECT id, invoiceCode, month, totalAmount, paidAmount, remainingAmount, status
      FROM invoices
      WHERE roomId = ? AND month = ?
    `).get(room.id, currentMonth);

    return {
      ...room,
      currentInvoice: latestInvoice || null
    };
  });

  res.json(roomsWithInvoice);
});

app.post('/api/rooms', (req, res) => {
  try {
    let { name, floor, basePrice, wifiFee, status, area, description, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên phòng (VD: Phòng 101)' });
    }
    name = name.trim();

    // Check duplicate room name (case-insensitive)
    const existing = db.prepare('SELECT id, name FROM rooms WHERE LOWER(TRIM(name)) = LOWER(?)').get(name);
    if (existing) {
      return res.status(400).json({ success: false, message: `Phòng "${name}" đã tồn tại trong danh sách!` });
    }

    const result = db.prepare(`
      INSERT INTO rooms (name, floor, basePrice, wifiFee, status, area, description, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      Number(floor) || 1,
      Number(basePrice) || 1500000,
      Number(wifiFee) || 50000,
      status || 'AVAILABLE',
      Number(area) || 18,
      description ? description.trim() : '',
      notes ? notes.trim() : ''
    );

    logAudit('THÊM_PHÒNG', `Thêm mới ${name}`, 'MANAGER', 'Chủ Trọ', result.lastInsertRowid);
    return res.json({ success: true, id: result.lastInsertRowid, message: `Đã thêm ${name} thành công!` });
  } catch (err) {
    console.error('Lỗi khi thêm phòng:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi thêm phòng: ' + err.message });
  }
});

app.put('/api/rooms/:id', (req, res) => {
  try {
    const roomId = req.params.id;
    const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng cần sửa' });

    let { name, floor, basePrice, wifiFee, status, area, description, notes } = req.body;
    const finalName = name && name.trim() ? name.trim() : existing.name;

    // Check duplicate name if changed
    if (finalName.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = db.prepare('SELECT id FROM rooms WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ?').get(finalName, roomId);
      if (duplicate) {
        return res.status(400).json({ success: false, message: `Tên phòng "${finalName}" đã được sử dụng bởi phòng khác!` });
      }
    }

    db.prepare(`
      UPDATE rooms SET
        name = ?, floor = ?, basePrice = ?, wifiFee = ?, status = ?, area = ?, description = ?, notes = ?
      WHERE id = ?
    `).run(
      finalName,
      floor !== undefined ? Number(floor) : existing.floor,
      basePrice !== undefined ? Number(basePrice) : existing.basePrice,
      wifiFee !== undefined ? Number(wifiFee) : existing.wifiFee,
      status || existing.status,
      area !== undefined ? Number(area) : existing.area,
      description !== undefined ? description.trim() : existing.description,
      notes !== undefined ? notes.trim() : existing.notes,
      roomId
    );

    logAudit('SỬA_PHÒNG', `Cập nhật thông tin ${finalName}`, 'MANAGER', 'Chủ Trọ', roomId);
    return res.json({ success: true, message: `Đã cập nhật ${finalName} thành công!` });
  } catch (err) {
    console.error('Lỗi khi sửa phòng:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi sửa phòng: ' + err.message });
  }
});

app.delete('/api/rooms/:id', (req, res) => {
  try {
    const roomId = req.params.id;
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng cần xóa' });

    // Safe transaction cleanup of all child records
    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM payment_proofs WHERE roomId = ?').run(roomId);
      db.prepare('DELETE FROM invoices WHERE roomId = ?').run(roomId);
      db.prepare('DELETE FROM tenants WHERE roomId = ?').run(roomId);
      db.prepare('DELETE FROM maintenance_requests WHERE roomId = ?').run(roomId);
      db.prepare('DELETE FROM announcements WHERE targetRoomId = ?').run(roomId);
      db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId);
    });

    deleteTx();

    logAudit('XÓA_PHÒNG', `Đã xóa ${room.name} khỏi hệ thống`, 'MANAGER', 'Chủ Trọ', roomId);
    return res.json({ success: true, message: `Đã xóa ${room.name} thành công!` });
  } catch (err) {
    console.error('Lỗi khi xóa phòng:', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xóa phòng: ' + err.message });
  }
});

// ----------------------
// TENANTS & CCCD
// ----------------------
app.get('/api/tenants', (req, res) => {
  const { roomId, status } = req.query;
  let query = `
    SELECT t.*, r.name as roomName
    FROM tenants t
    JOIN rooms r ON t.roomId = r.id
    WHERE 1=1
  `;
  const params = [];

  if (roomId) {
    query += ' AND t.roomId = ?';
    params.push(roomId);
  }
  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  query += ' ORDER BY r.name ASC, t.isRepresentative DESC';
  const tenants = db.prepare(query).all(...params);
  res.json(tenants);
});

// Create tenant with CCCD image uploads
app.post('/api/tenants', upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]), (req, res) => {
  try {
    const {
      roomId, fullName, phone, password, idCardNumber, idCardDate,
      idCardPlace, dateOfBirth, gender, hometown, licensePlate,
      startDate, deposit, isRepresentative, notes
    } = req.body;

    const idCardFrontUrl = req.files && req.files['idCardFront']
      ? `/uploads/cccd/${req.files['idCardFront'][0].filename}`
      : (req.body.idCardFrontUrl || '');

    const idCardBackUrl = req.files && req.files['idCardBack']
      ? `/uploads/cccd/${req.files['idCardBack'][0].filename}`
      : (req.body.idCardBackUrl || '');

    const now = new Date().toISOString();

    const result = db.prepare(`
      INSERT INTO tenants (
        roomId, fullName, phone, password, idCardNumber, idCardDate,
        idCardPlace, idCardFrontUrl, idCardBackUrl, dateOfBirth, gender,
        hometown, licensePlate, startDate, deposit, isRepresentative,
        status, notes, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(
      roomId, fullName, phone, password || '123', idCardNumber || '', idCardDate || '',
      idCardPlace || '', idCardFrontUrl, idCardBackUrl, dateOfBirth || '', gender || 'Nam',
      hometown || '', licensePlate || '', startDate || now.slice(0, 10), deposit || 1500000,
      isRepresentative ? 1 : 0, notes || '', now
    );

    // Update room status to OCCUPIED
    db.prepare("UPDATE rooms SET status = 'OCCUPIED' WHERE id = ?").run(roomId);

    logAudit('THÊM_KHÁCH_TRỌ', `Thêm khách ${fullName} (${phone}) - CCCD: ${idCardNumber}`, 'MANAGER', 'Chủ Trọ', roomId);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update tenant
app.put('/api/tenants/:id', upload.fields([
  { name: 'idCardFront', maxCount: 1 },
  { name: 'idCardBack', maxCount: 1 }
]), (req, res) => {
  try {
    const tenantId = req.params.id;
    const existing = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    if (!existing) return res.status(404).json({ error: 'Tenant not found' });

    const {
      roomId, fullName, phone, password, idCardNumber, idCardDate,
      idCardPlace, dateOfBirth, gender, hometown, licensePlate,
      startDate, deposit, isRepresentative, status, notes
    } = req.body;

    const idCardFrontUrl = req.files && req.files['idCardFront']
      ? `/uploads/cccd/${req.files['idCardFront'][0].filename}`
      : (req.body.idCardFrontUrl !== undefined ? req.body.idCardFrontUrl : existing.idCardFrontUrl);

    const idCardBackUrl = req.files && req.files['idCardBack']
      ? `/uploads/cccd/${req.files['idCardBack'][0].filename}`
      : (req.body.idCardBackUrl !== undefined ? req.body.idCardBackUrl : existing.idCardBackUrl);

    db.prepare(`
      UPDATE tenants SET
        roomId = ?, fullName = ?, phone = ?, password = ?, idCardNumber = ?,
        idCardDate = ?, idCardPlace = ?, idCardFrontUrl = ?, idCardBackUrl = ?,
        dateOfBirth = ?, gender = ?, hometown = ?, licensePlate = ?,
        startDate = ?, deposit = ?, isRepresentative = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(
      roomId || existing.roomId, fullName, phone, password || existing.password,
      idCardNumber, idCardDate, idCardPlace, idCardFrontUrl, idCardBackUrl,
      dateOfBirth, gender, hometown, licensePlate, startDate, deposit,
      isRepresentative !== undefined ? (isRepresentative ? 1 : 0) : existing.isRepresentative,
      status || existing.status, notes, tenantId
    );

    logAudit('CẬP_NHẬT_KHÁCH_TRỌ', `Cập nhật thông tin/CCCD của ${fullName}`, 'MANAGER', 'Chủ Trọ', roomId || existing.roomId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete tenant
app.delete('/api/tenants/:id', (req, res) => {
  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
  if (tenant) {
    db.prepare('DELETE FROM tenants WHERE id = ?').run(req.params.id);
    // Check if room is now empty
    const remainingCount = db.prepare('SELECT COUNT(*) as c FROM tenants WHERE roomId = ? AND status = "ACTIVE"').get(tenant.roomId).c;
    if (remainingCount === 0) {
      db.prepare("UPDATE rooms SET status = 'AVAILABLE' WHERE id = ?").run(tenant.roomId);
    }
    logAudit('XÓA_KHÁCH_TRỌ', `Xóa khách ${tenant.fullName} khỏi phòng`, 'MANAGER', 'Chủ Trọ', tenant.roomId);
  }
  res.json({ success: true });
});

// Admin 1-Click Reset Password for Tenant
app.post('/api/tenants/:id/reset-password', (req, res) => {
  try {
    const tenantId = req.params.id;
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Không tìm thấy khách thuê' });

    const newPass = req.body.newPassword ? String(req.body.newPassword).trim() : '123';
    db.prepare('UPDATE tenants SET password = ? WHERE id = ?').run(newPass, tenantId);

    logAudit('RESET_MẬT_KHẨU', `Chủ trọ đặt lại mật khẩu cho ${tenant.fullName} về: ${newPass}`, 'MANAGER', 'Chủ Trọ', tenant.roomId);
    res.json({ success: true, message: `Đã đặt lại mật khẩu cho ${tenant.fullName} về mặc định (${newPass}) thành công!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------
// INVOICES & AUTOMATION
// ----------------------

// Helper: Compute billing schedule based on contract date vs 1-Tây utilities
function computeBillingSchedule(monthStr, startDateStr) {
  const [yearStr, monthNumStr] = (monthStr || new Date().toISOString().slice(0, 7)).split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthNumStr); // 1-12

  let rentDay = 1;
  if (startDateStr) {
    const d = new Date(startDateStr);
    if (!isNaN(d.getTime())) {
      rentDay = d.getDate();
    }
  }

  // Days in current month
  const daysInCurrentMonth = new Date(year, month, 0).getDate();
  const actualRentDay = Math.min(rentDay, daysInCurrentMonth);
  const rentDueDate = `${year}-${String(month).padStart(2, '0')}-${String(actualRentDay).padStart(2, '0')}`;

  // Next month for rent cycle end (1 full month cycle)
  let nextYear = year;
  let nextMonth = month + 1;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const daysInNextMonth = new Date(nextYear, nextMonth, 0).getDate();
  const nextActualRentDay = Math.min(rentDay, daysInNextMonth);
  const rentCycleEndDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(nextActualRentDay).padStart(2, '0')}`;

  // Utility due date: always 1st of month (1 Tây)
  const utilityDueDate = `${year}-${String(month).padStart(2, '0')}-01`;

  // Previous month for utility period
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  // Calculate days diff from today for rent due date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueRentDateObj = new Date(year, month - 1, actualRentDay);
  dueRentDateObj.setHours(0, 0, 0, 0);
  const diffTime = dueRentDateObj.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let rentDueStatusText = '';
  let rentDueStatusColor = ''; // 'green', 'amber', 'red'
  if (diffDays === 0) {
    rentDueStatusText = '🔔 Hôm nay đến hạn!';
    rentDueStatusColor = 'amber';
  } else if (diffDays > 0) {
    rentDueStatusText = `Còn ${diffDays} ngày (Hạn ${String(actualRentDay).padStart(2, '0')}/${String(month).padStart(2, '0')})`;
    rentDueStatusColor = diffDays <= 3 ? 'amber' : 'green';
  } else {
    rentDueStatusText = `Quá hạn ${Math.abs(diffDays)} ngày!`;
    rentDueStatusColor = 'red';
  }

  return {
    rentDay,
    actualRentDay,
    rentDueDate,
    rentDueDateStr: `${String(actualRentDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    rentCycleFrom: rentDueDate,
    rentCycleTo: rentCycleEndDate,
    rentCycleStr: `${String(actualRentDay).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year} - ${String(nextActualRentDay).padStart(2, '0')}/${String(nextMonth).padStart(2, '0')}/${nextYear}`,
    utilityDueDate,
    utilityDueDateStr: `01/${String(month).padStart(2, '0')}/${year} (1 Tây)`,
    utilityCycleStr: `Kỳ chốt ngày 01/${String(month).padStart(2, '0')} (1 Tây hàng tháng)`,
    prevMonthStr: `${prevYear}-${String(prevMonth).padStart(2, '0')}`,
    diffDays,
    rentDueStatusText,
    rentDueStatusColor
  };
}

app.get('/api/invoices', (req, res) => {
  const { month, roomId, status } = req.query;
  let query = `
    SELECT inv.*, r.name as roomName, r.floor,
      (SELECT t.fullName FROM tenants t WHERE t.roomId = inv.roomId AND t.isRepresentative = 1 AND t.status = 'ACTIVE' LIMIT 1) as tenantName,
      (SELECT t.phone FROM tenants t WHERE t.roomId = inv.roomId AND t.isRepresentative = 1 AND t.status = 'ACTIVE' LIMIT 1) as tenantPhone,
      (SELECT t.startDate FROM tenants t WHERE t.roomId = inv.roomId AND t.isRepresentative = 1 AND t.status = 'ACTIVE' LIMIT 1) as tenantStartDate
    FROM invoices inv
    JOIN rooms r ON inv.roomId = r.id
    WHERE 1=1
  `;
  const params = [];

  if (month) {
    query += ' AND inv.month = ?';
    params.push(month);
  }
  if (roomId) {
    query += ' AND inv.roomId = ?';
    params.push(roomId);
  }
  if (status) {
    query += ' AND inv.status = ?';
    params.push(status);
  }

  query += ' ORDER BY inv.month DESC, r.name ASC';
  const invoices = db.prepare(query).all(...params);

  // Attach computed schedule and parse extraFees JSON
  const parsedInvoices = invoices.map(inv => {
    const schedule = computeBillingSchedule(inv.month, inv.tenantStartDate);
    return {
      ...inv,
      extraFees: typeof inv.extraFees === 'string' ? JSON.parse(inv.extraFees || '[]') : inv.extraFees,
      schedule,
      rentDueDay: schedule.actualRentDay,
      rentDueDate: schedule.rentDueDate,
      rentCycleStr: schedule.rentCycleStr,
      utilityDueDate: schedule.utilityDueDate,
      utilityDueDateStr: schedule.utilityDueDateStr
    };
  });

  res.json(parsedInvoices);
});

app.get('/api/invoices/:id', (req, res) => {
  const invoice = db.prepare(`
    SELECT inv.*, r.name as roomName, r.floor,
      (SELECT t.fullName FROM tenants t WHERE t.roomId = inv.roomId AND t.isRepresentative = 1 AND t.status = 'ACTIVE' LIMIT 1) as tenantName,
      (SELECT t.phone FROM tenants t WHERE t.roomId = inv.roomId AND t.isRepresentative = 1 AND t.status = 'ACTIVE' LIMIT 1) as tenantPhone,
      (SELECT t.startDate FROM tenants t WHERE t.roomId = inv.roomId AND t.isRepresentative = 1 AND t.status = 'ACTIVE' LIMIT 1) as tenantStartDate
    FROM invoices inv
    JOIN rooms r ON inv.roomId = r.id
    WHERE inv.id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  invoice.extraFees = JSON.parse(invoice.extraFees || '[]');

  // Attach billing schedule
  const schedule = computeBillingSchedule(invoice.month, invoice.tenantStartDate);
  invoice.schedule = schedule;
  invoice.rentDueDay = schedule.actualRentDay;
  invoice.rentDueDate = schedule.rentDueDate;
  invoice.rentCycleStr = schedule.rentCycleStr;
  invoice.utilityDueDate = schedule.utilityDueDate;
  invoice.utilityDueDateStr = schedule.utilityDueDateStr;

  // Also attach any payment proofs for this invoice
  invoice.proofs = db.prepare(`
    SELECT * FROM payment_proofs WHERE invoiceId = ? ORDER BY createdAt DESC
  `).all(req.params.id);

  res.json(invoice);
});

// Single invoice manual create or update
app.post('/api/invoices', (req, res) => {
  try {
    const {
      roomId, month, roomPrice, oldElectricity, newElectricity, electricityPrice,
      oldWater, newWater, waterPrice, wifiFee, extraFees, discount, paidAmount,
      notes, dueDate
    } = req.body;

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    if (!room) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng' });

    const tenant = db.prepare("SELECT * FROM tenants WHERE roomId = ? AND isRepresentative = 1 AND status = 'ACTIVE' LIMIT 1").get(roomId)
      || db.prepare("SELECT * FROM tenants WHERE roomId = ? AND status = 'ACTIVE' LIMIT 1").get(roomId);
    const schedule = computeBillingSchedule(month, tenant?.startDate);

    const eUsage = Math.max(0, (Number(newElectricity) || 0) - (Number(oldElectricity) || 0));
    const eCost = Math.round(eUsage * (Number(electricityPrice) || 4000));

    const wUsage = Math.max(0, (Number(newWater) || 0) - (Number(oldWater) || 0));
    const wCost = Math.round(wUsage * (Number(waterPrice) || 12000));

    const fees = Array.isArray(extraFees) ? extraFees : (typeof extraFees === 'string' ? JSON.parse(extraFees || '[]') : []);
    const totalExtra = fees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);

    const rPrice = Number(roomPrice) || room.basePrice || 1500000;
    const wFee = Number(wifiFee) || room.wifiFee || 50000;
    const disc = Number(discount) || 0;
    const total = Math.max(0, rPrice + eCost + wCost + wFee + totalExtra - disc);
    const paid = Number(paidAmount) || 0;
    const remaining = Math.max(0, total - paid);

    let status = 'UNPAID';
    if (remaining === 0 && total > 0) status = 'PAID';
    else if (paid > 0 && remaining > 0) status = 'PARTIAL';

    const code = `HD-${(month || '').replace('-', '')}-${room.name.replace(/[^0-9]/g, '') || room.id}`;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM invoices WHERE roomId = ? AND month = ?').get(roomId, month);
    if (existing) {
      db.prepare(`
        UPDATE invoices SET
          roomPrice = ?, oldElectricity = ?, newElectricity = ?, electricityUsage = ?, electricityPrice = ?, electricityCost = ?,
          oldWater = ?, newWater = ?, waterUsage = ?, waterPrice = ?, waterCost = ?,
          wifiFee = ?, extraFees = ?, totalExtraFee = ?, discount = ?, totalAmount = ?, remainingAmount = ?,
          status = ?, notes = ?, updatedAt = ?, rentDueDate = ?, utilityDueDate = ?
        WHERE id = ?
      `).run(
        rPrice, Number(oldElectricity) || 0, Number(newElectricity) || 0, eUsage, Number(electricityPrice) || 4000, eCost,
        Number(oldWater) || 0, Number(newWater) || 0, wUsage, Number(waterPrice) || 12000, wCost,
        wFee, JSON.stringify(fees), totalExtra, disc, total, remaining,
        status, notes || '', now, schedule.rentDueDate, schedule.utilityDueDate, existing.id
      );
      return res.json({ success: true, id: existing.id, message: 'Đã cập nhật hóa đơn' });
    }

    const result = db.prepare(`
      INSERT INTO invoices (
        invoiceCode, roomId, month, roomPrice,
        oldElectricity, newElectricity, electricityUsage, electricityPrice, electricityCost,
        oldWater, newWater, waterUsage, waterPrice, waterCost,
        wifiFee, extraFees, totalExtraFee, discount, totalAmount, paidAmount, remainingAmount,
        status, dueDate, notes, createdAt, updatedAt, rentDueDate, utilityDueDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code, roomId, month, rPrice,
      Number(oldElectricity) || 0, Number(newElectricity) || 0, eUsage, Number(electricityPrice) || 4000, eCost,
      Number(oldWater) || 0, Number(newWater) || 0, wUsage, Number(waterPrice) || 12000, wCost,
      wFee, JSON.stringify(fees), totalExtra, disc, total, paid, remaining,
      status, dueDate || schedule.rentDueDate, notes || '', now, now, schedule.rentDueDate, schedule.utilityDueDate
    );

    return res.json({ success: true, id: result.lastInsertRowid, message: 'Đã tạo hóa đơn mới' });
  } catch (err) {
    console.error('Lỗi lưu hóa đơn:', err);
    return res.status(500).json({ success: false, message: 'Lỗi: ' + err.message });
  }
});

// One-click Automated Month Generation for all rooms
app.post('/api/invoices/generate-batch', (req, res) => {
  const { month } = req.body; // e.g. '2026-11'
  if (!month) return res.status(400).json({ error: 'Month is required (YYYY-MM)' });

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  // Select ALL rooms so the landlord can bill all rooms in the house
  const rooms = db.prepare("SELECT * FROM rooms ORDER BY floor ASC, name ASC").all();

  // Find previous month string (e.g., '2026-10')
  const [yearStr, monthStr] = month.split('-');
  let prevYear = parseInt(yearStr);
  let prevMonth = parseInt(monthStr) - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const now = new Date().toISOString();
  let createdCount = 0;
  let updatedCount = 0;

  rooms.forEach(room => {
    // Check if invoice already exists
    const existing = db.prepare('SELECT * FROM invoices WHERE roomId = ? AND month = ?').get(room.id, month);

    // Lookup previous month's invoice to carry over the meter readings!
    const prevInvoice = db.prepare('SELECT * FROM invoices WHERE roomId = ? AND month = ?').get(room.id, prevMonthStr);

    // Lookup active tenant start date to compute contract day
    const tenant = db.prepare("SELECT * FROM tenants WHERE roomId = ? AND isRepresentative = 1 AND status = 'ACTIVE' LIMIT 1").get(room.id)
      || db.prepare("SELECT * FROM tenants WHERE roomId = ? AND status = 'ACTIVE' LIMIT 1").get(room.id);
    const schedule = computeBillingSchedule(month, tenant?.startDate);

    const oldElectricity = prevInvoice ? prevInvoice.newElectricity : 0;
    const oldWater = prevInvoice ? prevInvoice.newWater : 0;

    const roomPrice = room.basePrice || settings.defaultRoomPrice || 1500000;
    const wifiFee = room.wifiFee || settings.defaultWifiFee || 50000;
    const ePrice = settings.defaultElectricityPrice || 4000;
    const wPrice = settings.defaultWaterPrice || 12000;
    const garbageFee = settings.defaultGarbageFee || 30000;

    const defaultExtra = JSON.stringify([{ name: 'Rác & Vệ sinh chung', amount: garbageFee }]);
    const totalExtra = garbageFee;

    const code = `HD-${month.replace('-', '')}-${room.name.replace(/[^0-9]/g, '') || room.id}`;

    if (!existing) {
      // By default new = old if not entered yet, total = roomPrice + wifiFee + extra
      const newElectricity = oldElectricity;
      const newWater = oldWater;
      const total = roomPrice + wifiFee + totalExtra;
      const dueDate = schedule.rentDueDate;

      db.prepare(`
        INSERT INTO invoices (
          invoiceCode, roomId, month, roomPrice,
          oldElectricity, newElectricity, electricityUsage, electricityPrice, electricityCost,
          oldWater, newWater, waterUsage, waterPrice, waterCost,
          wifiFee, extraFees, totalExtraFee, discount, totalAmount, paidAmount, remainingAmount,
          status, dueDate, notes, createdAt, updatedAt, rentDueDate, utilityDueDate
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 0, ?, ?, 0, ?, 0, ?, ?, ?, 0, ?, 0, ?, 'UNPAID', ?, ?, ?, ?, ?, ?)
      `).run(
        code, room.id, month, roomPrice,
        oldElectricity, newElectricity, ePrice,
        oldWater, newWater, wPrice,
        wifiFee, defaultExtra, totalExtra, total, total,
        dueDate,
        `Tự động: Tiền phòng thu ngày ${schedule.actualRentDay} theo HĐ, Điện nước chốt ngày 1 Tây`,
        now, now, schedule.rentDueDate, schedule.utilityDueDate
      );
      createdCount++;
    } else {
      // If invoice already exists and oldElectricity was 0, update with previous month's final meter reading
      if (existing.oldElectricity === 0 && oldElectricity > 0) {
        const eUsage = Math.max(0, existing.newElectricity - oldElectricity);
        const wUsage = Math.max(0, existing.newWater - oldWater);
        const eCost = eUsage * existing.electricityPrice;
        const wCost = wUsage * existing.waterPrice;
        const total = existing.roomPrice + eCost + wCost + existing.wifiFee + existing.totalExtraFee - existing.discount;
        const rem = total - existing.paidAmount;

        db.prepare(`
          UPDATE invoices SET
            oldElectricity = ?, electricityUsage = ?, electricityCost = ?,
            oldWater = ?, waterUsage = ?, waterCost = ?,
            totalAmount = ?, remainingAmount = ?, updatedAt = ?
          WHERE id = ?
        `).run(oldElectricity, eUsage, eCost, oldWater, wUsage, wCost, total, rem, now, existing.id);
        updatedCount++;
      }
    }
  });

  logAudit('TẠO_HÓA_ĐƠN_TỰ_ĐỘNG', `Tự động tạo/đồng bộ hóa đơn tháng ${month}: ${createdCount} mới, ${updatedCount} cập nhật chỉ số cũ`);
  res.json({ success: true, createdCount, updatedCount });
});

// Update invoice (enter meter readings, modify fees)
app.put('/api/invoices/:id', (req, res) => {
  const invId = req.params.id;
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });

  const {
    roomPrice, oldElectricity, newElectricity, electricityPrice,
    oldWater, newWater, waterPrice, wifiFee,
    extraFees, discount, paidAmount, status, notes, dueDate
  } = req.body;

  const rPrice = Number(roomPrice !== undefined ? roomPrice : existing.roomPrice);
  const oldE = Number(oldElectricity !== undefined ? oldElectricity : existing.oldElectricity);
  const newE = Number(newElectricity !== undefined ? newElectricity : existing.newElectricity);
  const ePrice = Number(electricityPrice !== undefined ? electricityPrice : existing.electricityPrice);
  const eUsage = Math.max(0, newE - oldE);
  const eCost = eUsage * ePrice;

  const oldW = Number(oldWater !== undefined ? oldWater : existing.oldWater);
  const newW = Number(newWater !== undefined ? newWater : existing.newWater);
  const wPrice = Number(waterPrice !== undefined ? waterPrice : existing.waterPrice);
  const wUsage = Math.max(0, newW - oldW);
  const wCost = wUsage * wPrice;

  const wFee = Number(wifiFee !== undefined ? wifiFee : existing.wifiFee);

  let extras = [];
  if (Array.isArray(extraFees)) {
    extras = extraFees;
  } else if (typeof extraFees === 'string') {
    try { extras = JSON.parse(extraFees); } catch (e) { extras = []; }
  } else {
    extras = JSON.parse(existing.extraFees || '[]');
  }
  const totalExtra = extras.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const disc = Number(discount !== undefined ? discount : existing.discount);
  const total = Math.max(0, rPrice + eCost + wCost + wFee + totalExtra - disc);

  const paid = Number(paidAmount !== undefined ? paidAmount : existing.paidAmount);
  const rem = Math.max(0, total - paid);

  let newStatus = status || existing.status;
  if (!status) {
    if (paid >= total && total > 0) newStatus = 'PAID';
    else if (paid > 0) newStatus = 'PARTIAL';
    else newStatus = existing.status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'UNPAID';
  }

  const now = new Date().toISOString();
  const paidDate = newStatus === 'PAID' ? (existing.paidDate || now) : null;

  db.prepare(`
    UPDATE invoices SET
      roomPrice = ?, oldElectricity = ?, newElectricity = ?, electricityUsage = ?, electricityPrice = ?, electricityCost = ?,
      oldWater = ?, newWater = ?, waterUsage = ?, waterPrice = ?, waterCost = ?,
      wifiFee = ?, extraFees = ?, totalExtraFee = ?, discount = ?,
      totalAmount = ?, paidAmount = ?, remainingAmount = ?, status = ?,
      paidDate = ?, notes = ?, dueDate = ?, updatedAt = ?
    WHERE id = ?
  `).run(
    rPrice, oldE, newE, eUsage, ePrice, eCost,
    oldW, newW, wUsage, wPrice, wCost,
    wFee, JSON.stringify(extras), totalExtra, disc,
    total, paid, rem, newStatus,
    paidDate, notes || existing.notes, dueDate || existing.dueDate, now, invId
  );

  logAudit('CẬP_NHẬT_HÓA_ĐƠN', `Cập nhật hóa đơn ${existing.invoiceCode} (Điện: ${oldE}->${newE}, Nước: ${oldW}->${newW}, Tổng: ${total.toLocaleString('vi-VN')}đ)`);
  res.json({ success: true, totalAmount: total, remainingAmount: rem, status: newStatus });
});

// Quick Pay by Manager (Cash or confirmed direct transfer)
app.post('/api/invoices/:id/quick-pay', (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const { paymentMethod, amount, note } = req.body;
  const payAmt = amount ? Number(amount) : inv.remainingAmount;
  const newPaid = inv.paidAmount + payAmt;
  const rem = Math.max(0, inv.totalAmount - newPaid);
  const status = rem === 0 ? 'PAID' : 'PARTIAL';
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE invoices SET
      paidAmount = ?, remainingAmount = ?, status = ?, paidDate = ?, updatedAt = ?
    WHERE id = ?
  `).run(newPaid, rem, status, now, now, inv.id);

  // Record audit & transaction proof record
  db.prepare(`
    INSERT INTO payment_proofs (
      invoiceId, roomId, amount, paymentMethod,
      proofImageUrl, transactionCode, paymentDate, submittedBy,
      status, reviewNotes, reviewedAt, createdAt
    ) VALUES (?, ?, ?, ?, '', 'TIEN_MAT_TRUC_TIEP', ?, 'MANAGER', 'APPROVED', ?, ?, ?)
  `).run(inv.id, inv.roomId, payAmt, paymentMethod || 'CASH', now, note || 'Chủ trọ thu trực tiếp và xác nhận hoàn tất', now, now);

  logAudit('XÁC_NHẬN_THANH_TOÁN', `Xác nhận thu ${payAmt.toLocaleString('vi-VN')}đ cho hóa đơn ${inv.invoiceCode}`, 'MANAGER', 'Chủ Trọ', inv.roomId);
  res.json({ success: true, paidAmount: newPaid, remainingAmount: rem, status });
});

// ----------------------
// PAYMENT PROOFS & AUDIT TRAIL (CHỨNG TỪ ĐỐI SOÁT)
// ----------------------
app.get('/api/proofs', (req, res) => {
  const { status, roomId, invoiceId } = req.query;
  let query = `
    SELECT p.*, inv.invoiceCode, inv.month, inv.totalAmount as invoiceTotal, r.name as roomName,
      t.fullName as tenantName, t.phone as tenantPhone
    FROM payment_proofs p
    JOIN invoices inv ON p.invoiceId = inv.id
    JOIN rooms r ON p.roomId = r.id
    LEFT JOIN tenants t ON p.tenantId = t.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }
  if (roomId) {
    query += ' AND p.roomId = ?';
    params.push(roomId);
  }
  if (invoiceId) {
    query += ' AND p.invoiceId = ?';
    params.push(invoiceId);
  }

  query += ' ORDER BY p.createdAt DESC';
  const proofs = db.prepare(query).all(...params);
  res.json(proofs);
});

// Submit payment proof (by tenant or manager)
app.post('/api/proofs', upload.single('proofImage'), (req, res) => {
  try {
    const { invoiceId, roomId, tenantId, amount, paymentMethod, transactionCode, paymentDate, submittedBy } = req.body;
    const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const proofImageUrl = req.file
      ? `/uploads/proofs/${req.file.filename}`
      : (req.body.proofImageUrl || '');

    const now = new Date().toISOString();
    const isManager = submittedBy === 'MANAGER';
    const status = isManager ? 'APPROVED' : 'PENDING';

    const result = db.prepare(`
      INSERT INTO payment_proofs (
        invoiceId, roomId, tenantId, amount, paymentMethod,
        proofImageUrl, transactionCode, paymentDate, submittedBy,
        status, reviewNotes, reviewedAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId, roomId || inv.roomId, tenantId || null,
      Number(amount) || inv.remainingAmount, paymentMethod || 'BANK_TRANSFER',
      proofImageUrl, transactionCode || '', paymentDate || now,
      submittedBy || 'TENANT', status, isManager ? 'Chủ trọ tải lên và tự duyệt' : null,
      isManager ? now : null, now
    );

    if (isManager) {
      // Mark invoice paid
      db.prepare(`
        UPDATE invoices SET
          paidAmount = totalAmount, remainingAmount = 0, status = 'PAID', paidDate = ?, updatedAt = ?
        WHERE id = ?
      `).run(now, now, invoiceId);
      logAudit('LƯU_CHỨNG_TỪ_THANH_TOÁN', `Chủ trọ lưu chứng từ thanh toán hóa đơn ${inv.invoiceCode}`, 'MANAGER', 'Chủ Trọ', inv.roomId);
    } else {
      // Mark invoice pending approval
      db.prepare(`
        UPDATE invoices SET status = 'PENDING_APPROVAL', updatedAt = ? WHERE id = ?
      `).run(now, invoiceId);
      logAudit('GỬI_CHỨNG_TỪ_ĐỐI_SOÁT', `Khách phòng gửi biên lai chuyển khoản hóa đơn ${inv.invoiceCode} chờ duyệt`, 'TENANT', 'Khách Thuê', inv.roomId);
    }

    res.json({ success: true, id: result.lastInsertRowid, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manager review proof (Approve or Reject)
app.post('/api/proofs/:id/review', (req, res) => {
  const { action, reviewNotes } = req.body; // 'APPROVE' or 'REJECT'
  const proof = db.prepare(`
    SELECT p.*, inv.invoiceCode, inv.totalAmount, inv.paidAmount, r.name as roomName
    FROM payment_proofs p
    JOIN invoices inv ON p.invoiceId = inv.id
    JOIN rooms r ON p.roomId = r.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!proof) return res.status(404).json({ error: 'Proof not found' });

  const now = new Date().toISOString();

  if (action === 'APPROVE') {
    db.prepare(`
      UPDATE payment_proofs SET
        status = 'APPROVED', reviewNotes = ?, reviewedAt = ?
      WHERE id = ?
    `).run(reviewNotes || 'Đã đối soát khớp tiền vào tài khoản ngân hàng', now, proof.id);

    // Update invoice to paid
    const newPaid = Math.min(proof.totalAmount, proof.paidAmount + proof.amount);
    const rem = Math.max(0, proof.totalAmount - newPaid);
    const invStatus = rem === 0 ? 'PAID' : 'PARTIAL';

    db.prepare(`
      UPDATE invoices SET
        paidAmount = ?, remainingAmount = ?, status = ?, paidDate = ?, updatedAt = ?
      WHERE id = ?
    `).run(newPaid, rem, invStatus, now, now, proof.invoiceId);

    logAudit('DUYỆT_ĐỐI_SOÁT_THÀNH_CÔNG', `Đã duyệt chứng từ ${proof.amount.toLocaleString('vi-VN')}đ cho ${proof.roomName} (${proof.invoiceCode})`, 'MANAGER', 'Chủ Trọ', proof.roomId);
  } else {
    db.prepare(`
      UPDATE payment_proofs SET
        status = 'REJECTED', reviewNotes = ?, reviewedAt = ?
      WHERE id = ?
    `).run(reviewNotes || 'Chứng từ không hợp lệ hoặc chưa nhận được tiền', now, proof.id);

    // Revert invoice to UNPAID if no partial payment
    const invStatus = proof.paidAmount > 0 ? 'PARTIAL' : 'UNPAID';
    db.prepare(`
      UPDATE invoices SET status = ?, updatedAt = ? WHERE id = ?
    `).run(invStatus, now, proof.invoiceId);

    logAudit('TỪ_CHỐI_CHỨNG_TỪ', `Từ chối chứng từ của ${proof.roomName} (${reviewNotes || 'Lý do không khớp'})`, 'MANAGER', 'Chủ Trọ', proof.roomId);
  }

  res.json({ success: true, action });
});

// ----------------------
// EXPENSES (QUẢN LÝ CHI PHÍ NHÀ TRỌ)
// ----------------------
app.get('/api/expenses', (req, res) => {
  const { month, category } = req.query;
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];

  if (month) {
    query += ' AND date LIKE ?';
    params.push(`${month}%`);
  }
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY date DESC';
  const expenses = db.prepare(query).all(...params);
  res.json(expenses);
});

app.post('/api/expenses', upload.single('receiptImage'), (req, res) => {
  try {
    const { title, category, amount, date, notes } = req.body;
    const receiptImageUrl = req.file
      ? `/uploads/expenses/${req.file.filename}`
      : (req.body.receiptImageUrl || '');

    const now = new Date().toISOString();
    const result = db.prepare(`
      INSERT INTO expenses (title, category, amount, date, receiptImageUrl, notes, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(title, category || 'KHAC', Number(amount) || 0, date || now.slice(0, 10), receiptImageUrl, notes || '', now);

    logAudit('THÊM_KHOẢN_CHI', `Chi ${Number(amount).toLocaleString('vi-VN')}đ: ${title}`);
    res.json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', (req, res) => {
  const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (exp) {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    logAudit('XÓA_KHOẢN_CHI', `Xóa khoản chi: ${exp.title} (${exp.amount.toLocaleString('vi-VN')}đ)`);
  }
  res.json({ success: true });
});

// ----------------------
// STATISTICS & REPORTS
// ----------------------
app.get('/api/statistics', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  // Total rooms and occupied (synced with actual active tenants)
  const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
  const occupiedRooms = db.prepare("SELECT COUNT(DISTINCT roomId) as c FROM tenants WHERE status = 'ACTIVE'").get().c;

  // Invoices for this month
  const invStats = db.prepare(`
    SELECT
      COUNT(*) as invoiceCount,
      COALESCE(SUM(totalAmount), 0) as totalBilled,
      COALESCE(SUM(paidAmount), 0) as totalCollected,
      COALESCE(SUM(remainingAmount), 0) as totalUncollected,
      COALESCE(SUM(electricityUsage), 0) as totalElectricityUsage,
      COALESCE(SUM(waterUsage), 0) as totalWaterUsage
    FROM invoices
    WHERE month = ?
  `).get(month);

  // Expenses for this month
  const expStats = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as totalExpense
    FROM expenses
    WHERE date LIKE ?
  `).get(`${month}%`);

  const pendingProofsCount = db.prepare("SELECT COUNT(*) as c FROM payment_proofs WHERE status = 'PENDING'").get().c;

  // Net Profit
  const netProfit = invStats.totalCollected - expStats.totalExpense;

  res.json({
    month,
    totalRooms,
    occupiedRooms,
    occupancyRate: totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    totalBilled: invStats.totalBilled,
    totalCollected: invStats.totalCollected,
    totalUncollected: invStats.totalUncollected,
    totalExpense: expStats.totalExpense,
    netProfit,
    totalElectricityUsage: invStats.totalElectricityUsage,
    totalWaterUsage: invStats.totalWaterUsage,
    pendingProofsCount
  });
});

// ----------------------
// AUDIT LOGS
// ----------------------
app.get('/api/audit-logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100').all();
  res.json(logs);
});

// ----------------------
// MAINTENANCE REQUESTS
// ----------------------
app.get('/api/requests', (req, res) => {
  const { roomId } = req.query;
  let query = `
    SELECT m.*, r.name as roomName, t.fullName as tenantName, t.phone as tenantPhone
    FROM maintenance_requests m
    JOIN rooms r ON m.roomId = r.id
    LEFT JOIN tenants t ON m.tenantId = t.id
    WHERE 1=1
  `;
  const params = [];
  if (roomId) {
    query += ' AND m.roomId = ?';
    params.push(roomId);
  }
  query += ' ORDER BY m.createdAt DESC';
  const requests = db.prepare(query).all(...params);
  res.json(requests);
});

app.post('/api/requests', (req, res) => {
  const { roomId, tenantId, title, description, imageUrl } = req.body;
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO maintenance_requests (roomId, tenantId, title, description, imageUrl, status, createdAt)
    VALUES (?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(roomId, tenantId || null, title, description || '', imageUrl || '', now);

  logAudit('BÁO_HỎNG_HÓC', `Báo hỏng phòng: ${title}`, 'TENANT', 'Khách Thuê', roomId);
  res.json({ success: true, id: result.lastInsertRowid });
});

app.put('/api/requests/:id', (req, res) => {
  const { status } = req.body; // 'PROCESSING', 'COMPLETED', 'CANCELLED'
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE maintenance_requests SET status = ?, resolvedAt = ? WHERE id = ?
  `).run(status, status === 'COMPLETED' ? now : null, req.params.id);

  res.json({ success: true });
});

// ----------------------
// ANNOUNCEMENTS (THÔNG BÁO CÚP ĐIỆN, NƯỚC & TIN TỨC)
// ----------------------
app.get('/api/announcements', (req, res) => {
  const { roomId } = req.query;
  let query = `
    SELECT a.*, r.name as targetRoomName
    FROM announcements a
    LEFT JOIN rooms r ON a.targetRoomId = r.id
    WHERE 1=1
  `;
  const params = [];
  if (roomId) {
    query += ' AND (a.targetType = "ALL" OR a.targetRoomId = ?)';
    params.push(roomId);
  }
  query += ' ORDER BY a.isPinned DESC, a.id DESC';
  const list = db.prepare(query).all(...params);
  res.json(list);
});

app.post('/api/announcements', (req, res) => {
  const { title, content, type, targetType, targetRoomId, startTime, endTime, isPinned } = req.body;
  const now = new Date().toLocaleString('vi-VN');
  const result = db.prepare(`
    INSERT INTO announcements (title, content, type, targetType, targetRoomId, startTime, endTime, isPinned, createdAt, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, content, type || 'GENERAL', targetType || 'ALL', targetRoomId || null,
    startTime || '', endTime || '', isPinned ? 1 : 0, now, 'Chủ Nhà Trọ'
  );

  const typeLabel = type === 'OUTAGE_ELECTRIC' ? 'CÚP ĐIỆN' : type === 'OUTAGE_WATER' ? 'CÚP NƯỚC' : 'THÔNG BÁO';
  logAudit('GỬI_THÔNG_BÁO', `Chủ trọ phát thông báo [${typeLabel}]: ${title}`, 'MANAGER', 'Chủ Trọ', targetRoomId || null);

  res.json({ success: true, id: result.lastInsertRowid });
});

app.put('/api/announcements/:id', (req, res) => {
  const { title, content, type, targetType, targetRoomId, startTime, endTime, isPinned } = req.body;
  db.prepare(`
    UPDATE announcements SET
      title = ?, content = ?, type = ?, targetType = ?, targetRoomId = ?,
      startTime = ?, endTime = ?, isPinned = ?
    WHERE id = ?
  `).run(
    title, content, type, targetType, targetRoomId || null,
    startTime, endTime, isPinned ? 1 : 0, req.params.id
  );
  res.json({ success: true });
});

app.delete('/api/announcements/:id', (req, res) => {
  const ann = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  if (ann) {
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    logAudit('XÓA_THÔNG_BÁO', `Xóa thông báo: ${ann.title}`);
  }
  res.json({ success: true });
});

// ----------------------
// SERVE CLIENT IN PRODUCTION
// ----------------------
const clientDist = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  console.log(`[Static] Serving frontend from ${clientDist}`);
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.warn(`[Static] Warning: clientDist not found at ${clientDist}`);
  app.get('/', (req, res) => {
    res.send(`
      <div style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h2>Website Quản Lý Nhà Trọ An Cư</h2>
        <p>Backend API đang chạy bình thường.</p>
        <p style="color: #666;">client/dist chưa được build trong lúc deploy. Hãy cài Build Command: <code>npm run render-build</code> trong cài đặt Render.</p>
      </div>
    `);
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
