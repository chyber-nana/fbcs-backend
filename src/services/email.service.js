import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

const isEmailConfigured = () => {
  return !!(env.email.host && env.email.user && env.email.password);
};

const getTransporter = () => {
  if (!transporter && isEmailConfigured()) {
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.port === 465,
      auth: {
        user: env.email.user,
        pass: env.email.password,
      },
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    console.log('[EMAIL MOCK]', { to, subject });
    console.log('[EMAIL MOCK BODY]', text || html?.slice(0, 200));
    return { mock: true, to, subject };
  }

  const transport = getTransporter();
  const info = await transport.sendMail({
    from: env.email.from,
    to,
    subject,
    html,
    text,
  });
  return info;
};

export const sendPaymentConfirmation = async (user, order, tickets) => {
  const ticketList = tickets
    .map((t) => `<li>${t.ticket_number} - ${t.ticket_type_name}</li>`)
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e3a8a; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0;">Payment Confirmed</h1>
        <p style="margin: 8px 0 0;">FBCS 2023 Alumni Reunion</p>
      </div>
      <div style="padding: 24px; background: #f8fafc;">
        <p>Dear ${user.name},</p>
        <p>Thank you for your payment! Your tickets are ready.</p>
        <p><strong>Order Reference:</strong> ${order.order_reference}</p>
        <p><strong>Amount Paid:</strong> ${order.currency} ${order.total_amount}</p>
        <h3>Your Tickets:</h3>
        <ul>${ticketList}</ul>
        <p>View your tickets in your dashboard at any time.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: 'Payment Confirmed - FBCS 2023 Alumni Reunion',
    html,
    text: `Payment confirmed for order ${order.order_reference}. Amount: ${order.currency} ${order.total_amount}`,
  });
};

export const sendTicketEmail = async (user, ticket, event) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1e3a8a; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0;">Your Ticket</h1>
      </div>
      <div style="padding: 24px; background: #f8fafc;">
        <p>Dear ${user.name},</p>
        <p><strong>Event:</strong> ${event.name}</p>
        <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
        <p><strong>Type:</strong> ${ticket.ticket_type_name}</p>
        <p>Present your QR code at the venue for check-in.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: `Your Ticket - ${ticket.ticket_number}`,
    html,
    text: `Your ticket ${ticket.ticket_number} for ${event.name} is ready.`,
  });
};

export default { sendPaymentConfirmation, sendTicketEmail };
