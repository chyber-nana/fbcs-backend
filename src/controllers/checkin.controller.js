import * as ticketService from '../services/ticket.service.js';

export const verifyQr = async (req, res, next) => {
  try {
    const { qr_token } = req.body;
    if (!qr_token) {
      return res.status(400).json({ success: false, message: 'QR token required' });
    }

    const result = await ticketService.verifyTicketByToken(qr_token);

    if (!result.valid) {
      return res.json({
        success: true,
        data: {
          status: result.reason === 'already_checked_in' ? 'already_checked_in' : 'invalid',
          reason: result.reason,
          ticket: result.ticket || null,
          checked_in_at: result.checked_in_at || null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        status: 'valid',
        ticket: {
          id: result.ticket.id,
          ticket_number: result.ticket.ticket_number,
          ticket_type_name: result.ticket.ticket_type_name,
          attendee_name: result.ticket.attendee_name,
          event_name: result.ticket.event_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const performCheckIn = async (req, res, next) => {
  try {
    const { qr_token, device_info } = req.body;
    if (!qr_token) {
      return res.status(400).json({ success: false, message: 'QR token required' });
    }

    const result = await ticketService.checkInTicket(qr_token, req.user.id, device_info);

    if (!result.valid) {
      return res.json({
        success: true,
        data: {
          status: result.reason === 'already_checked_in' ? 'already_checked_in' : 'invalid',
          reason: result.reason,
          ticket: result.ticket || null,
          checked_in_at: result.checked_in_at || null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        status: 'checked_in',
        ticket: {
          ticket_number: result.ticket.ticket_number,
          ticket_type_name: result.ticket.ticket_type_name,
          attendee_name: result.ticket.attendee_name,
        },
        check_in: result.check_in,
      },
    });
  } catch (err) {
    next(err);
  }
};

export default { verifyQr, performCheckIn };
