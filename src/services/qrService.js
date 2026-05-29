import QRCode from 'qrcode';

export const qrService = {
  /**
   * Generates a QR Code as a Data URI (Base64 PNG) for inclusion in HTML/IMG tags
   * @param {string} text - The text/URL to encode in the QR code
   * @returns {Promise<string>} Data URI string
   */
  generateDataURI: async (text) => {
    try {
      const options = {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.9,
        margin: 1,
        color: {
          dark: '#0f172a',  // deep slate (nearly black) matching premium palette
          light: '#ffffff'
        }
      };
      
      const dataUri = await QRCode.toDataURL(text, options);
      return dataUri;
    } catch (err) {
      console.error('Error generating QR Data URI:', err);
      // Fallback simple static representation or throw
      throw err;
    }
  },

  /**
   * Generates a QR Code as an SVG string for clean, lossless vector rendering
   * @param {string} text - The text/URL to encode
   * @returns {Promise<string>} SVG markup
   */
  generateSVG: async (text) => {
    try {
      const options = {
        errorCorrectionLevel: 'M',
        type: 'svg',
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      };
      
      const svg = await QRCode.toString(text, options);
      return svg;
    } catch (err) {
      console.error('Error generating QR SVG:', err);
      throw err;
    }
  }
};
