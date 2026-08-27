import db from '../config/db.js';
import * as ticketService from '../services/ticket.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const createOrder = async (req, res, next) => {
  try {
    const { event_id, items } = req.body;
    if (!event_id || !items?.length) throw new AppError('Event and items are required', 400);

    const event = await db('events').where({ id: event_id, status: 'published' }).first();
    if (!event) throw new AppError('Event not found or not available', 404);

    const result = await ticketService.createOrder(req.user.id, event_id, items);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await db('orders as o')
      .join('events as e', 'o.event_id', 'e.id')
      .where('o.user_id', req.user.id)
      .select('o.*', 'e.name as event_name')
      .orderBy('o.created_at', 'desc');

    for (const order of orders) {
      order.items = await db('order_items as oi')
        .join('ticket_types as tt', 'oi.ticket_type_id', 'tt.id')
        .where('oi.order_id', order.id)
        .select('oi.*', 'tt.name as ticket_type_name');
    }

    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

export const getOrder = async (req, res, next) => {
  try {
    const order = await db('orders as o')
      .join('events as e', 'o.event_id', 'e.id')
      .where('o.id', req.params.id)
      .where('o.user_id', req.user.id)
      .select('o.*', 'e.name as event_name')
      .first();

    if (!order) throw new AppError('Order not found', 404);

    order.items = await db('order_items as oi')
      .join('ticket_types as tt', 'oi.ticket_type_id', 'tt.id')
      .where('oi.order_id', order.id)
      .select('oi.*', 'tt.name as ticket_type_name');

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

export default { createOrder, getMyOrders, getOrder };
