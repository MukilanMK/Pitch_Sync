import { createApiClient } from "./api";

export const userService = {
  resolve: async (token, userIds) => {
    const api = createApiClient({ token });
    const { data } = await api.post("/users/resolve", { userIds });
    return data;
  },
};

