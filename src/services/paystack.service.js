import axios from 'axios';
import env from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const PAYSTACK_BASE = 'https://api.paystack.co';

const getHeaders = () => ({
  Authorization: `Bearer ${env.paystack.secretKey}`,
  'Content-Type': 'application/json',
});

export const initializeTransaction = async ({ email, amount, reference, metadata, callbackUrl }) => {
  if (!env.paystack.secretKey) {
    throw new AppError('Paystack is not configured. Set PAYSTACK_SECRET_KEY.', 503);
  }

  try {
    const response = await axios.post(
      `${PAYSTACK_BASE}/transaction/initialize`,
      {
        email,
        amount: Math.round(amount * 100),
        reference,
        metadata,
        callback_url: callbackUrl,
        currency: 'GHS',
      },
      { headers: getHeaders() }
    );

    return response.data.data;
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to initialize payment';
    throw new AppError(msg, 502);
  }
};

export const verifyTransaction = async (reference) => {
  if (!env.paystack.secretKey) {
    throw new AppError('Paystack is not configured. Set PAYSTACK_SECRET_KEY.', 503);
  }

  try {
    const response = await axios.get(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
      headers: getHeaders(),
    });
    return response.data.data;
  } catch (error) {
    const msg = error.response?.data?.message || 'Failed to verify payment';
    throw new AppError(msg, 502);
  }
};

export default { initializeTransaction, verifyTransaction };
