import { createApiClient } from "./api";

export const scorecardService = {
  get: async (token, bookingId) => {
    const api = createApiClient({ token });
    const { data } = await api.get(`/scorecards/${bookingId}`);
    return data;
  },
  getStats: async (token, bookingId) => {
    const api = createApiClient({ token });
    const { data } = await api.get(`/scorecards/${bookingId}/stats`);
    return data;
  },
  addDelivery: async (token, bookingId, payload) => {
    const api = createApiClient({ token });
    const { data } = await api.post(`/scorecards/${bookingId}/deliveries`, payload);
    return data;
  },
};

