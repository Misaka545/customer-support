const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');

/**
 * Middleware xác thực JWT token
 * Gắn agent info vào req.agent
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không có token xác thực. Vui lòng đăng nhập.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const agent = await Agent.findById(decoded.id);
    if (!agent) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ. Tài khoản không tồn tại.',
      });
    }

    req.agent = agent;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn. Vui lòng đăng nhập lại.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ.',
    });
  }
};

/**
 * Middleware kiểm tra quyền Admin
 */
const adminOnly = (req, res, next) => {
  if (req.agent.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện thao tác này. Yêu cầu quyền Admin.',
    });
  }
  next();
};

module.exports = { auth, adminOnly };
