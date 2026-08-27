import * as ticketService from '../services/ticket.service.js';
import { generateQrCodeDataUrl, generateQrCodeBuffer } from '../services/qr.service.js';
import { AppError } from '../middleware/errorHandler.js';

export const getEvent = async (req, res, next) => {
  try {
    const event = await ticketService.getPublishedEvent();
    if (!event) return res.json({ success: true, data: null });
    const ticketTypes = await ticketService.getTicketTypesForEvent(event.id);
    res.json({ success: true, data: { event, ticketTypes } });
  } catch (err) {
    next(err);
  }
};

export const getMyTickets = async (req, res, next) => {
  try {
    const tickets = await ticketService.getUserTickets(req.user.id);
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
};

export const getTicket = async (req, res, next) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user.id);
    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

export const getTicketQr = async (req, res, next) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user.id);
    const format = req.query.format;

    if (format === 'png') {
      const buffer = await generateQrCodeBuffer(ticket.qr_token);
      res.set('Content-Type', 'image/png');
      res.set('Content-Disposition', `attachment; filename="ticket-${ticket.ticket_number}.png"`);
      return res.send(buffer);
    }

    const qrDataUrl = await generateQrCodeDataUrl(ticket.qr_token);
    res.json({ success: true, data: { qrDataUrl, ticket_number: ticket.ticket_number } });
  } catch (err) {
    next(err);
  }
};

export default { getEvent, getMyTickets, getTicket, getTicketQr };
