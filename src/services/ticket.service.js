import db from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateQrToken } from './qr.service.js';
import { sendPaymentConfirmation } from './email.service.js';

const generateOrderReference = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `FBCS-${ts}-${rand}`;
};

const generateTicketNumber = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${ts}-${rand}`;
};

export const getPublishedEvent = async () => {
  return db('events').where({ status: 'published' }).orderBy('event_date', 'asc').first();
};

export const getTicketTypesForEvent = async (eventId) => {
  return db('ticket_types').where({ event_id: eventId }).orderBy('price', 'asc');
};

export const createOrder = async (userId, eventId, items) => {
  return db.transaction(async (trx) => {
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const ticketType = await trx('ticket_types')
        .where({ id: item.ticket_type_id, event_id: eventId })
        .forUpdate()
        .first();

      if (!ticketType) {
        throw new AppError('Invalid ticket type', 400);
      }

      if (ticketType.quantity_available < item.quantity) {
        throw new AppError(`Not enough ${ticketType.name} tickets available`, 400);
      }

      const subtotal = parseFloat(ticketType.price) * item.quantity;
      totalAmount += subtotal;
      orderItems.push({
        ticket_type_id: ticketType.id,
        quantity: item.quantity,
        unit_price: ticketType.price,
        subtotal,
        ticketType,
      });
    }

    const [order] = await trx('orders')
      .insert({
        user_id: userId,
        event_id: eventId,
        order_reference: generateOrderReference(),
        total_amount: totalAmount,
        currency: 'GHS',
        status: 'pending',
      })
      .returning('*');

    for (const item of orderItems) {
      await trx('order_items').insert({
        order_id: order.id,
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
      });

      await trx('ticket_types')
        .where({ id: item.ticket_type_id })
        .decrement('quantity_available', item.quantity);
    }

    return { order, items: orderItems };
  });
};

export const processSuccessfulPayment = async (orderId, paymentData) => {
  return db.transaction(async (trx) => {
    const order = await trx('orders').where({ id: orderId }).forUpdate().first();
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'paid') {
      return { order, tickets: await getTicketsForOrder(orderId, trx), alreadyProcessed: true };
    }

    const existingPayment = await trx('payments')
      .where({ payment_reference: paymentData.reference })
      .forUpdate()
      .first();
    if (existingPayment) {
      if (existingPayment.status === 'success') {
        return { order, tickets: await getTicketsForOrder(orderId, trx), alreadyProcessed: true };
      }

      await trx('payments').where({ id: existingPayment.id }).update({
        amount: paymentData.amount / 100,
        currency: paymentData.currency || 'GHS',
        status: 'success',
        paid_at: paymentData.paid_at ? new Date(paymentData.paid_at) : new Date(),
        raw_response: JSON.stringify(paymentData),
        updated_at: trx.fn.now(),
      });
    }

    await trx('orders').where({ id: orderId }).update({ status: 'paid', updated_at: trx.fn.now() });

    if (!existingPayment) {
      await trx('payments').insert({
        order_id: orderId,
        payment_reference: paymentData.reference,
        provider: 'paystack',
        amount: paymentData.amount / 100,
        currency: paymentData.currency || 'GHS',
        status: 'success',
        paid_at: paymentData.paid_at ? new Date(paymentData.paid_at) : new Date(),
        raw_response: JSON.stringify(paymentData),
      });
    }

    const orderItems = await trx('order_items').where({ order_id: orderId });
    const tickets = [];

    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        const [ticket] = await trx('tickets')
          .insert({
            order_id: orderId,
            user_id: order.user_id,
            ticket_type_id: item.ticket_type_id,
            ticket_number: generateTicketNumber(),
            qr_token: generateQrToken(),
            status: 'active',
          })
          .returning('*');
        tickets.push(ticket);
      }
    }

    const user = await trx('users').where({ id: order.user_id }).first();
    const ticketsWithDetails = await getTicketsForOrder(orderId, trx);

    try {
      await sendPaymentConfirmation(user, order, ticketsWithDetails);
    } catch (emailErr) {
      console.error('[EMAIL] Failed to send confirmation:', emailErr.message);
    }

    return { order: { ...order, status: 'paid' }, tickets: ticketsWithDetails, alreadyProcessed: false };
  });
};

const getTicketsForOrder = async (orderId, trx = db) => {
  return trx('tickets as t')
    .join('ticket_types as tt', 't.ticket_type_id', 'tt.id')
    .join('events as e', 'tt.event_id', 'e.id')
    .where('t.order_id', orderId)
    .select(
      't.*',
      'tt.name as ticket_type_name',
      'tt.price as ticket_type_price',
      'e.name as event_name',
      'e.venue',
      'e.event_date'
    );
};

export const getUserTickets = async (userId) => {
  return db('tickets as t')
    .join('ticket_types as tt', 't.ticket_type_id', 'tt.id')
    .join('events as e', 'tt.event_id', 'e.id')
    .join('orders as o', 't.order_id', 'o.id')
    .where('t.user_id', userId)
    .select(
      't.*',
      'tt.name as ticket_type_name',
      'tt.price as ticket_type_price',
      'e.name as event_name',
      'e.venue',
      'e.event_date',
      'e.description as event_description',
      'o.status as order_status',
      'o.order_reference'
    )
    .orderBy('t.created_at', 'desc');
};

export const getTicketById = async (ticketId, userId) => {
  const ticket = await db('tickets as t')
    .join('ticket_types as tt', 't.ticket_type_id', 'tt.id')
    .join('events as e', 'tt.event_id', 'e.id')
    .join('orders as o', 't.order_id', 'o.id')
    .join('users as u', 't.user_id', 'u.id')
    .where('t.id', ticketId)
    .select(
      't.*',
      'tt.name as ticket_type_name',
      'tt.price as ticket_type_price',
      'e.name as event_name',
      'e.venue',
      'e.event_date',
      'e.description as event_description',
      'o.status as order_status',
      'o.order_reference',
      'u.name as attendee_name',
      'u.email as attendee_email'
    )
    .first();

  if (!ticket) throw new AppError('Ticket not found', 404);
  if (ticket.user_id !== userId) throw new AppError('Access denied', 403);
  return ticket;
};

export const verifyTicketByToken = async (qrToken) => {
  const ticket = await db('tickets as t')
    .join('ticket_types as tt', 't.ticket_type_id', 'tt.id')
    .join('events as e', 'tt.event_id', 'e.id')
    .join('orders as o', 't.order_id', 'o.id')
    .join('users as u', 't.user_id', 'u.id')
    .leftJoin('check_ins as ci', 't.id', 'ci.ticket_id')
    .where('t.qr_token', qrToken)
    .select(
      't.*',
      'tt.name as ticket_type_name',
      'e.name as event_name',
      'e.id as event_id',
      'o.status as order_status',
      'u.name as attendee_name',
      'ci.checked_in_at',
      'ci.id as check_in_id'
    )
    .first();

  if (!ticket) return { valid: false, reason: 'invalid' };
  if (ticket.order_status !== 'paid') return { valid: false, reason: 'payment_pending' };
  if (ticket.status === 'cancelled') return { valid: false, reason: 'cancelled' };
  if (ticket.status === 'refunded') return { valid: false, reason: 'refunded' };
  if (ticket.status === 'used' || ticket.check_in_id) {
    return { valid: false, reason: 'already_checked_in', ticket, checked_in_at: ticket.checked_in_at };
  }
  if (ticket.status !== 'active') return { valid: false, reason: 'invalid' };

  return { valid: true, ticket };
};

export const checkInTicket = async (qrToken, staffUserId, deviceInfo) => {
  return db.transaction(async (trx) => {
    const result = await verifyTicketByToken(qrToken);
    if (!result.valid) return result;

    const ticket = await trx('tickets').where({ qr_token: qrToken }).forUpdate().first();
    if (ticket.status === 'used') {
      const checkIn = await trx('check_ins').where({ ticket_id: ticket.id }).first();
      return { valid: false, reason: 'already_checked_in', ticket: result.ticket, checked_in_at: checkIn?.checked_in_at };
    }

    await trx('tickets').where({ id: ticket.id }).update({ status: 'used', updated_at: trx.fn.now() });

    const [checkIn] = await trx('check_ins')
      .insert({
        ticket_id: ticket.id,
        checked_in_by: staffUserId,
        device_info: deviceInfo || null,
      })
      .returning('*');

    return {
      valid: true,
      checkedIn: true,
      ticket: result.ticket,
      check_in: checkIn,
    };
  });
};

export const cancelTicket = async (ticketId) => {
  const ticket = await db('tickets').where({ id: ticketId }).first();
  if (!ticket) throw new AppError('Ticket not found', 404);
  if (ticket.status === 'used') throw new AppError('Cannot cancel a used ticket', 400);

  await db('tickets').where({ id: ticketId }).update({ status: 'cancelled', updated_at: db.fn.now() });
  return db('tickets').where({ id: ticketId }).first();
};

export const refundTicket = async (ticketId) => {
  const ticket = await db('tickets').where({ id: ticketId }).first();
  if (!ticket) throw new AppError('Ticket not found', 404);

  await db('tickets').where({ id: ticketId }).update({ status: 'refunded', updated_at: db.fn.now() });
  return db('tickets').where({ id: ticketId }).first();
};

export default {
  getPublishedEvent,
  getTicketTypesForEvent,
  createOrder,
  processSuccessfulPayment,
  getUserTickets,
  getTicketById,
  verifyTicketByToken,
  checkInTicket,
  cancelTicket,
  refundTicket,
};
