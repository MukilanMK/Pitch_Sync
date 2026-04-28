import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const championshipService = {
  listAll: async (token) => {
    const res = await axios.get(`${API_URL}/championships`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  getById: async (token, id) => {
    const res = await axios.get(`${API_URL}/championships/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  registerTeam: async (token, id, payload) => {
    const res = await axios.post(`${API_URL}/championships/${id}/register`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  // Owner methods
  listOwner: async (token) => {
    const res = await axios.get(`${API_URL}/championships/owner/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  create: async (token, payload) => {
    const res = await axios.post(`${API_URL}/championships`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  approveTeam: async (token, id, payload) => {
    const res = await axios.patch(`${API_URL}/championships/${id}/approve`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  createMatch: async (token, id, payload) => {
    const res = await axios.post(`${API_URL}/championships/${id}/matches`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  cancelChampionship: async (token, id, payload) => {
    const res = await axios.patch(`${API_URL}/championships/${id}/cancel`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },

  updateSettings: async (token, id, payload) => {
    const res = await axios.patch(`${API_URL}/championships/${id}/settings`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  },
};
