import { createApiClient } from "./api";

export const turfService = {
  list: async () => {
    const api = createApiClient();
    const { data } = await api.get("/turfs");
    return data;
  },
  create: async (token, { name, location, pricePerHour, facilities }) => {
    const api = createApiClient({ token });
    const { data } = await api.post("/turfs", { name, location, pricePerHour, facilities });
    return data;
  },
  listMine: async (token) => {
    const api = createApiClient({ token });
    const { data } = await api.get("/turfs/mine/list");
    return data;
  },
};

