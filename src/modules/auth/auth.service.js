
  const authRepository = require('./auth.repository');

  function createAppError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  async function registerUser(data) {
    const existingMobile = await authRepository.findUserByMobile(data.mobile);

    if (existingMobile) {
      throw createAppError('Mobile number is already registered', 409);
    }

    const existingEmail = await authRepository.findUserByEmail(data.email);

    if (existingEmail) {
      throw createAppError('Email is already registered', 409);
    }

    if (!['GUEST', 'HOST'].includes(data.role)) {
      throw createAppError('Only GUEST or HOST can register', 400);
    }

    return authRepository.createUser(data);
  }

  module.exports = {
    registerUser,
  };

//   Why both Zod and this service check role? Zod protects the HTTP endpoint; the service protects the business rule even if another part of the backend calls
//   it directly later.