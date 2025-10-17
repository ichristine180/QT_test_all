import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 40 * 60 * 1000, // 40 minutes
  max: 100, 
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, 
  legacyHeaders: false, 
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});


export const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: {
    error: 'Too many accounts created',
    message: 'Too many accounts created from this IP, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
