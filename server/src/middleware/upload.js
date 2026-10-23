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

// Image MIME types for public items
const itemFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, and GIF image files are allowed for item photos'), false);
  }
};

// Receipt MIME types (allows images + PDF proof of ownership)
const receiptFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, GIF, and PDF files are allowed for claim verification receipts'), false);
  }
};

const upload = multer({
  storage: itemStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  fileFilter: itemFileFilter
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  fileFilter: receiptFileFilter
});

/**
 * Inspects real magic bytes on disk to confirm genuine file format
 */
function inspectMagicBytes(filePath, allowedTypes = ['image']) {
  if (!fs.existsSync(filePath)) return false;
  let fd = null;
  try {
    const buffer = Buffer.alloc(16);
    fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    fd = null;

    if (bytesRead < 4) return false;

    // Check JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return 'image/jpeg';
    }
    // Check PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
      return 'image/png';
    }
    // Check GIF: 47 49 46 38 ('GIF8')
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'image/gif';
    }
    // Check WebP: RIFF ... WEBP
    if (bytesRead >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x42 && buffer[10] === 0x45 && buffer[11] === 0x50) {
      return 'image/webp';
    }
    // Check PDF: %PDF (25 50 44 46)
    if (allowedTypes.includes('pdf') &&
        buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }

    return false;
  } catch (err) {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (e) {}
    }
    return false;
  }
}

/**
 * Express middleware to verify uploaded file contents match permitted magic bytes
 */
function verifyUploadMagicBytes(type = 'image') {
  const allowed = type === 'receipt' ? ['image', 'pdf'] : ['image'];
  return (req, res, next) => {
    if (!req.file) return next();

    const detected = inspectMagicBytes(req.file.path, allowed);
    if (!detected) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (err) {
        console.error('Failed to unlink rejected upload:', err);
      }
      req.file = null;
      return res.status(400).json({
        error: `Invalid file content. Uploaded file does not match permitted ${type === 'receipt' ? 'image/PDF' : 'image'} formats.`
      });
    }
    next();
  };
}

upload.uploadReceipt = uploadReceipt;
upload.inspectMagicBytes = inspectMagicBytes;
upload.verifyUploadMagicBytes = verifyUploadMagicBytes;

module.exports = upload;
