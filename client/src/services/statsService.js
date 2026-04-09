import { createApiClient } from "./api";

export const statsService = {
  me: async (token) => {
    const api = createApiClient({ token });
    const { data } = await api.get("/stats/me");
    return data;
  },
};

