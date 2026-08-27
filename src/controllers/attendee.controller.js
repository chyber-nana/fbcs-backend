import * as ticketService from '../services/ticket.service.js';

export const getDashboard = async (req, res, next) => {
  try {
    const tickets = await ticketService.getUserTickets(req.user.id);
    const orders = tickets.reduce((acc, t) => {
      if (!acc.find((o) => o.order_reference === t.order_reference)) {
        acc.push({
          order_reference: t.order_reference,
          order_status: t.order_status,
          event_name: t.event_name,
        });
      }
      return acc;
    }, []);

    res.json({
      success: true,
      data: {
        user: req.user,
        tickets,
        orders,
        stats: {
          total_tickets: tickets.length,
          active_tickets: tickets.filter((t) => t.status === 'active').length,
          used_tickets: tickets.filter((t) => t.status === 'used').length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export default { getDashboard };
