import { createApiClient } from "./api";

export const authService = {
  register: async ({ name, userId, email, password, role }) => {
    const api = createApiClient();
    const { data } = await api.post("/auth/register", { name, userId, email, password, role });
    return data;
  },
  login: async ({ email, password }) => {
    const api = createApiClient();
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  },
  me: async (token) => {
    const api = createApiClient({ token });
    const { data } = await api.get("/auth/me");
    return data;
  },
};

