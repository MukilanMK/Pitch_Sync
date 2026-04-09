import { createApiClient } from "./api";

export const friendService = {
  list: async (token) => {
    const api = createApiClient({ token });
    const { data } = await api.get("/friends");
    return data;
  },
  addByUserId: async (token, userId) => {
    const api = createApiClient({ token });
    const { data } = await api.post("/friends", { userId });
    return data;
  },
  remove: async (token, friendId) => {
    const api = createApiClient({ token });
    const { data } = await api.delete(`/friends/${friendId}`);
    return data;
  },
};

