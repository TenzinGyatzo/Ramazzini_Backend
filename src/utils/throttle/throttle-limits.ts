/** Perfiles @Throttle para endpoints públicos de autenticación (H-28). */
export const AUTH_FORGOT_PASSWORD = {
  default: { limit: 5, ttl: 60_000 },
};

export const AUTH_LOGIN = {
  default: { limit: 10, ttl: 60_000 },
};

export const AUTH_REGISTER = {
  default: { limit: 3, ttl: 3_600_000 },
};

export const AUTH_REFRESH = {
  default: { limit: 30, ttl: 60_000 },
};

export const AUTH_TOKEN = {
  default: { limit: 10, ttl: 60_000 },
};
