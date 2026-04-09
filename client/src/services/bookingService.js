import { createApiClient } from "./api";

export const bookingService = {
  create: async (token, { turfId, date, timeSlot }) => {
    const api = createApiClient({ token });
    const { data } = await api.post("/bookings", { turfId, date, timeSlot });
    return data;
  },
  listMine: async (token) => {
    const api = createApiClient({ token });
    const { data } = await api.get("/bookings/mine");
    return data;
  },
  listOwner: async (token) => {
    const api = createApiClient({ token });
    const { data } = await api.get("/bookings/owner");
    return data;
  },
  ownerSetStatus: async (token, bookingId, status) => {
    const api = createApiClient({ token });
    const { data } = await api.patch(`/bookings/${bookingId}/status`, { status });
    return data;
  },
  ownerCreate: async (token, { turfId, date, timeSlot, bookedForName, bookedForPhone }) => {
    const api = createApiClient({ token });
    const { data } = await api.post("/bookings/owner/create", { turfId, date, timeSlot, bookedForName, bookedForPhone });
    return data;
  },
};

