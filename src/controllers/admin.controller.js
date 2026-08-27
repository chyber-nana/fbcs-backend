import db from '../config/db.js';
import * as ticketService from '../services/ticket.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const getStats = async (_req, res, next) => {
  try {
    const event = await ticketService.getPublishedEvent();

    const totalTicketsSold = await db('tickets')
      .whereIn('status', ['active', 'used'])
      .count('id as count')
      .first();

    const totalAttendees = await db('tickets')
      .whereIn('status', ['active', 'used'])
      .countDistinct('user_id as count')
      .first();

    const totalRevenue = await db('payments')
      .where({ status: 'success' })
      .sum('amount as total')
      .first();

    const paidOrders = await db('orders').where({ status: 'paid' }).count('id as count').first();
    const pendingOrders = await db('orders').where({ status: 'pending' }).count('id as count').first();
    const cancelledTickets = await db('tickets').whereIn('status', ['cancelled', 'refunded']).count('id as count').first();
    const checkedIn = await db('check_ins').count('id as count').first();

    const capacity = event?.capacity || 500;
    const sold = parseInt(totalTicketsSold.count, 10);
    const checkedInCount = parseInt(checkedIn.count, 10);

    res.json({
      success: true,
      data: {
        event,
        total_tickets_sold: sold,
        total_attendees: parseInt(totalAttendees.count, 10),
        total_revenue: parseFloat(totalRevenue.total || 0),
        paid_orders: parseInt(paidOrders.count, 10),
        pending_orders: parseInt(pendingOrders.count, 10),
        cancelled_refunded: parseInt(cancelledTickets.count, 10),
        checked_in: checkedInCount,
        remaining_capacity: Math.max(0, capacity - sold),
        attendance_rate: sold > 0 ? Math.round((checkedInCount / sold) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getRevenueChart = async (_req, res, next) => {
  try {
    const data = await db('payments')
      .where({ status: 'success' })
      .select(db.raw("DATE(paid_at) as date"))
      .sum('amount as revenue')
      .count('id as transactions')
      .groupByRaw('DATE(paid_at)')
      .orderBy('date', 'asc');

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getSalesChart = async (_req, res, next) => {
  try {
    const data = await db('tickets')
      .whereIn('status', ['active', 'used'])
      .select(db.raw("DATE(created_at) as date"))
      .count('id as tickets_sold')
      .groupByRaw('DATE(created_at)')
      .orderBy('date', 'asc');

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getTicketTypeDistribution = async (_req, res, next) => {
  try {
    const data = await db('tickets as t')
      .join('ticket_types as tt', 't.ticket_type_id', 'tt.id')
      .whereIn('t.status', ['active', 'used'])
      .select('tt.name', 'tt.price')
      .count('t.id as count')
      .groupBy('tt.id', 'tt.name', 'tt.price');

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getRecentActivity = async (_req, res, next) => {
  try {
    const recentOrders = await db('orders as o')
      .join('users as u', 'o.user_id', 'u.id')
      .select('o.*', 'u.name as user_name', 'u.email as user_email')
      .orderBy('o.created_at', 'desc')
      .limit(10);

    const recentCheckIns = await db('check_ins as ci')
      .join('tickets as t', 'ci.ticket_id', 't.id')
      .join('users as u', 't.user_id', 'u.id')
      .select('ci.*', 't.ticket_number', 'u.name as attendee_name')
      .orderBy('ci.checked_in_at', 'desc')
      .limit(10);

    res.json({ success: true, data: { recentOrders, recentCheckIns } });
  } catch (err) {
    next(err);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    let query = db('orders as o')
      .join('users as u', 'o.user_id', 'u.id')
      .join('events as e', 'o.event_id', 'e.id')
      .select('o.*', 'u.name as user_name', 'u.email as user_email', 'e.name as event_name');

    if (status) query = query.where('o.status', status);
    if (search) {
      query = query.where(function () {
        this.where('o.order_reference', 'ilike', `%${search}%`)
          .orWhere('u.name', 'ilike', `%${search}%`)
          .orWhere('u.email', 'ilike', `%${search}%`);
      });
    }

    const orders = await query.orderBy('o.created_at', 'desc');
    res.json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

export const getAllTickets = async (req, res, next) => {
  try {
    const { status, ticket_type_id, search } = req.query;
    let query = db('tickets as t')
      .join('users as u', 't.user_id', 'u.id')
      .join('ticket_types as tt', 't.ticket_type_id', 'tt.id')
      .join('orders as o', 't.order_id', 'o.id')
      .select('t.*', 'u.name as attendee_name', 'u.email as attendee_email', 'u.phone', 'tt.name as ticket_type_name', 'o.order_reference', 'o.status as order_status');

    if (status) query = query.where('t.status', status);
    if (ticket_type_id) query = query.where('t.ticket_type_id', ticket_type_id);
    if (search) {
      query = query.where(function () {
        this.where('t.ticket_number', 'ilike', `%${search}%`)
          .orWhere('u.name', 'ilike', `%${search}%`)
          .orWhere('u.email', 'ilike', `%${search}%`);
      });
    }

    const tickets = await query.orderBy('t.created_at', 'desc');
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
};

export const cancelTicket = async (req, res, next) => {
  try {
    const ticket = await ticketService.cancelTicket(req.params.id);
    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

export const refundTicket = async (req, res, next) => {
  try {
    const ticket = await ticketService.refundTicket(req.params.id);
    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

export const exportAttendees = async (_req, res, next) => {
  try {
    const attendees = await db('tickets as t')
      .join('users as u', 't.user_id', 'u.id')
      .join('ticket_types as tt', 't.ticket_type_id', 'tt.id')
      .join('orders as o', 't.order_id', 'o.id')
      .leftJoin('check_ins as ci', 't.id', 'ci.ticket_id')
      .whereIn('t.status', ['active', 'used'])
      .where('o.status', 'paid')
      .select(
        'u.name',
        'u.email',
        'u.phone',
        't.ticket_number',
        'tt.name as ticket_type',
        't.status as ticket_status',
        'o.order_reference',
        'ci.checked_in_at'
      )
      .orderBy('u.name', 'asc');

    const headers = ['Name', 'Email', 'Phone', 'Ticket Number', 'Ticket Type', 'Status', 'Order Reference', 'Checked In At'];
    const rows = attendees.map((a) =>
      [a.name, a.email, a.phone || '', a.ticket_number, a.ticket_type, a.ticket_status, a.order_reference, a.checked_in_at || ''].join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="attendees.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

export default {
  getStats,
  getRevenueChart,
  getSalesChart,
  getTicketTypeDistribution,
  getRecentActivity,
  getAllOrders,
  getAllTickets,
  cancelTicket,
  refundTicket,
  exportAttendees,
};
