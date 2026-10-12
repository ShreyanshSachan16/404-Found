const QRCode = require('qrcode');
const crypto = require('crypto');
const config = require('../config');

/**
 * Generates a secure recovery QR Code Data URL for an item
 */
async function generateItemQRCode(itemId, baseUrl = config.CLIENT_URL) {
  // Generate a random public tracking token
  const token = crypto.randomBytes(8).toString('hex');
  const targetBase = baseUrl.replace(/\/+$/, '');
  const recoveryUrl = `${targetBase}/#recovery/${itemId}?token=${token}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(recoveryUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#1e293b',
        light: '#ffffff'
      }
    });

    return {
      token,
      recoveryUrl,
      qrDataUrl
    };
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return null;
  }
}

module.exports = {
  generateItemQRCode
};
