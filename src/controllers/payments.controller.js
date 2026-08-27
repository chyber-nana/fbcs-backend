import db from '../config/db.js';
import env from '../config/env.js';
import * as paystackService from '../services/paystack.service.js';
import * as ticketService from '../services/ticket.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const initializePayment = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    const order = await db('orders').where({ id: order_id, user_id: req.user.id }).first();
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'paid') throw new AppError('Order already paid', 400);
    if (order.status === 'cancelled') throw new AppError('Order is cancelled', 400);

    const paymentRef = `PAY-${order.order_reference}`;

    const existingPending = await db('payments')
      .where({ order_id: order.id, status: 'pending' })
      .first();

    if (!existingPending) {
      await db('payments').insert({
        order_id: order.id,
        payment_reference: paymentRef,
        provider: 'paystack',
        amount: order.total_amount,
        currency: order.currency,
        status: 'pending',
      });
    }

    const callbackUrl = `${env.frontendUrl}/payment/callback`;

    const paystackData = await paystackService.initializeTransaction({
      email: req.user.email,
      amount: parseFloat(order.total_amount),
      reference: paymentRef,
      metadata: { order_id: order.id, user_id: req.user.id },
      callbackUrl,
    });

    res.json({
      success: true,
      data: {
        authorization_url: paystackData.authorization_url,
        access_code: paystackData.access_code,
        reference: paymentRef,
        public_key: env.paystack.publicKey,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.query;
    if (!reference) throw new AppError('Payment reference required', 400);

    const payment = await db('payments').where({ payment_reference: reference }).first();
    if (!payment) throw new AppError('Payment not found', 404);

    const order = await db('orders').where({ id: payment.order_id }).first();
    if (order.user_id !== req.user.id && req.user.role === 'attendee') {
      throw new AppError('Access denied', 403);
    }

    if (payment.status === 'success' && order.status === 'paid') {
      const tickets = await ticketService.getUserTickets(order.user_id);
      const orderTickets = tickets.filter((t) => t.order_id === order.id);
      return res.json({ success: true, data: { order, tickets: orderTickets, alreadyProcessed: true } });
    }

    const paystackData = await paystackService.verifyTransaction(reference);

    if (paystackData.status !== 'success') {
      await db('payments').where({ id: payment.id }).update({ status: 'failed', raw_response: JSON.stringify(paystackData) });
      await db('orders').where({ id: order.id }).update({ status: 'failed' });
      throw new AppError('Payment was not successful', 402);
    }

    const result = await ticketService.processSuccessfulPayment(order.id, paystackData);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const payment = await db('payments').where({ payment_reference: reference }).first();

      if (payment && payment.status !== 'success') {
        const paystackData = await paystackService.verifyTransaction(reference);
        if (paystackData.status === 'success') {
          await ticketService.processSuccessfulPayment(payment.order_id, paystackData);
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[WEBHOOK ERROR]', err.message);
    res.sendStatus(200);
  }
};

export const getPublicKey = async (_req, res) => {
  res.json({ success: true, data: { public_key: env.paystack.publicKey } });
};

export default { initializePayment, verifyPayment, handleWebhook, getPublicKey };
