import User from '../models/User.js';
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide Basic Auth credentials (email:password)'
      });
    }

    // Decode Basic Auth credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [email, password] = credentials.split(':');

    if (!email || !password) {
      return res.status(401).json({
        error: 'Invalid credentials format',
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = User.findByEmailWithPassword(email);

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        error: 'Account inactive',
        message: 'Your account has been deactivated'
      });
    }

    // Verify password
    const isValidPassword = User.verifyPassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Middleware to check if authenticated user is an admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate first'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required'
    });
  }

  next();
};

/**
 * Middleware to check if user can access their own data or is admin
 */
export const requireOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please authenticate first'
    });
  }

  const userId = parseInt(req.params.id);

  if (req.user.role === 'admin' || req.user.id === userId) {
    next();
  } else {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own data'
    });
  }
};
