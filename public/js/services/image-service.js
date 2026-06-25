/**
 * services/image-service.js — Shared image processing and client-side compression
 */

'use strict';

const ImageService = (() => {

  /**
   * Compresses an image file to JPEG format and yields a base64 string and a blob.
   * @param {File} file - The file to compress
   * @param {Object} options - Compression options
   * @param {number} [options.maxWidth=1000] - Max width of image
   * @param {number} [options.maxHeight=800] - Max height of image
   * @param {number} [options.quality=0.8] - JPEG quality (0.0 to 1.0)
   * @param {Function} callback - Called with (error, { base64, blob })
   */
  function compressAndPreview(file, options, callback) {
    const maxWidth = options.maxWidth || 1000;
    const maxHeight = options.maxHeight || 800;
    const quality = options.quality !== undefined ? options.quality : 0.8;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const base64 = canvas.toDataURL('image/jpeg', quality);
          canvas.toBlob((blob) => {
            callback(null, { base64, blob });
          }, 'image/jpeg', quality);
        } catch (err) {
          callback(err, null);
        }
      };
      img.onerror = (err) => {
        callback(err, null);
      };
      img.src = e.target.result;
    };
    reader.onerror = (err) => {
      callback(err, null);
    };
    reader.readAsDataURL(file);
  }

  return { compressAndPreview };

})();
