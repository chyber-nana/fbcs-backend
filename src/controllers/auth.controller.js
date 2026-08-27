import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import env from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';

const generateToken = (userId) => {
  return jwt.sign({ userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
};

const sanitizeUser = (user) => {
  const { password_hash, ...safe } = user;
  return safe;
};

export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;
    const existing = await db('users').where({ email: email.toLowerCase() }).first();
    if (existing) throw new AppError('Email already registered', 409);

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await db('users')
      .insert({
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        password_hash,
        role: 'attendee',
      })
      .returning('*');

    const token = generateToken(user.id);
    res.status(201).json({ success: true, data: { user: sanitizeUser(user), token } });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await db('users').where({ email: email.toLowerCase() }).first();
    if (!user) throw new AppError('Invalid email or password', 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError('Invalid email or password', 401);

    const token = generateToken(user.id);
    res.json({ success: true, data: { user: sanitizeUser(user), token } });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (userId) => {
  const user = await db('users').where({ id: userId }).first();
  if (!user) throw new AppError('User not found', 404);
  return sanitizeUser(user);
};

export default { register, login, getProfile };
