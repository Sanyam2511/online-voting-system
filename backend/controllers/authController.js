import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const DEFAULT_ADMIN_NAME = process.env.ADMIN_NAME || 'Platform Admin';
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@securevote.com').toLowerCase();
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@12345';

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const buildAuthResponse = (user) => ({
  _id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  hasVoted: user.hasVoted,
  token: generateToken(user._id)
});

export const ensureDefaultAdmin = async () => {
  const existingAdmin = await User.findOne({ role: 'Admin' });

  if (existingAdmin) {
    return;
  }

  const userByEmail = await User.findOne({ email: DEFAULT_ADMIN_EMAIL });

  if (userByEmail) {
    userByEmail.role = 'Admin';
    userByEmail.isVerified = true;
    await userByEmail.save();
    console.log(`[AdminSeed] Existing user promoted to admin: ${DEFAULT_ADMIN_EMAIL}`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, salt);

  await User.create({
    name: DEFAULT_ADMIN_NAME,
    email: DEFAULT_ADMIN_EMAIL,
    password: hashedPassword,
    role: 'Admin',
    isVerified: true
  });

  console.log(`[AdminSeed] Default admin created: ${DEFAULT_ADMIN_EMAIL}`);
};

// @desc Register new voter
export const registerVoter = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword });
    if (user) {
      res.status(201).json(buildAuthResponse(user));
      return;
    }

    res.status(400).json({ message: 'Invalid voter data' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Authenticate a voter
export const loginVoter = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json(buildAuthResponse(user));
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Get currently authenticated voter
export const getCurrentVoter = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hasVoted: user.hasVoted,
      isVerified: user.isVerified
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};