const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');

// Ensure upload and receipts directories exist
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(config.RECEIPTS_DIR)) {
  fs.mkdirSync(config.RECEIPTS_DIR, { recursive: true });
}

// Storage for public item photos
const itemStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `item-${Date.now()}-${uniqueSuffix}${safeExt}`);
  }
});

// Storage for private claim proof receipts
const receiptStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.RECEIPTS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf'].includes(ext) ? ext : '.jpg';
    cb(null, `receipt-${Date.now()}-${uniqueSuffix}${safeExt}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, GIF, and PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: itemStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  fileFilter: fileFilter
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  fileFilter: fileFilter
});

upload.uploadReceipt = uploadReceipt;

module.exports = upload;
