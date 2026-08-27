import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

export const generateQrToken = () => {
  return uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '').slice(0, 16);
};

export const generateQrCodeDataUrl = async (token) => {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 300,
    color: { dark: '#1e3a8a', light: '#ffffff' },
  });
};

export const generateQrCodeBuffer = async (token) => {
  return QRCode.toBuffer(token, {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 400,
    color: { dark: '#1e3a8a', light: '#ffffff' },
  });
};
