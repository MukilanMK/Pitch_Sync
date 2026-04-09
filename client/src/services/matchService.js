import { createApiClient } from "./api";

export const matchService = {
  create: async (token, payload) => {
    const api = createApiClient({ token });
    const { data } = await api.post("/matches", payload);
    return data;
  },
  listMine: async (token) => {
    const api = createApiClient({ token });
    const { data } = await api.get("/matches/mine");
    return data;
  },
  get: async (token, id) => {
    const api = createApiClient({ token });
    const { data } = await api.get(`/matches/${id}`);
    return data;
  },
  setToss: async (token, id, payload) => {
    const api = createApiClient({ token });
    const { data } = await api.post(`/matches/${id}/toss`, payload);
    return data;
  },
  setupInnings: async (token, id, payload) => {
    const api = createApiClient({ token });
    const { data } = await api.post(`/matches/${id}/innings/setup`, payload);
    return data;
  },
  addDelivery: async (token, id, payload) => {
    const api = createApiClient({ token });
    const { data } = await api.post(`/matches/${id}/deliveries`, payload);
    return data;
  },
};

