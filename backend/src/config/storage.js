const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const config = require('./env');

// Ensure local uploads directory exists
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

// Check if Cloudinary is configured
const isCloudinaryConfigured = Boolean(
  config.CLOUDINARY_CLOUD_NAME &&
  config.CLOUDINARY_API_KEY &&
  config.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('[Storage] Cloudinary initialized for photo storage.');
} else {
  console.log(`[Storage] Cloudinary credentials not detected; using secure local disk storage at ${config.UPLOAD_DIR}`);
}

/**
 * Upload a file to Cloudinary or save to local disk
 * @param {Object} file - Multer file object
 * @param {String} folder - Subfolder name e.g. 'chapter23/orders'
 */
async function uploadPhotoFile(file, folder = 'chapter23/orders') {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            storageType: 'cloudinary',
            bytes: result.bytes,
            format: result.format,
          });
        }
      );

      uploadStream.end(file.buffer);
    });
  }

  // Fallback: Local storage
  const ext = path.extname(file.originalname).toLowerCase();
  const filename = `c23_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
  const filepath = path.join(config.UPLOAD_DIR, filename);

  fs.writeFileSync(filepath, file.buffer);

  return {
    url: `/uploads/${filename}`,
    publicId: filename,
    storageType: 'local',
    bytes: file.size,
    format: ext.replace('.', ''),
  };
}

/**
 * Delete a photo file from storage
 */
async function deletePhotoFile(publicId, storageType = 'local') {
  if (storageType === 'cloudinary' && isCloudinaryConfigured) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (err) {
      console.error('[Storage] Error deleting from Cloudinary:', err.message);
      return false;
    }
  }

  // Local storage deletion
  try {
    const filepath = path.join(config.UPLOAD_DIR, publicId);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
    return true;
  } catch (err) {
    console.error('[Storage] Error deleting local file:', err.message);
    return false;
  }
}

module.exports = {
  isCloudinaryConfigured,
  uploadPhotoFile,
  deletePhotoFile,
};
