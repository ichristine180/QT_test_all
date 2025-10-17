import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export const setAuthCredentials = (email: string, password: string) => {
  const authHeader = "Basic " + btoa(`${email}:${password}`);
  api.defaults.headers.common["Authorization"] = authHeader;
};

export const clearAuthCredentials = () => {
  delete api.defaults.headers.common["Authorization"];
};
export const authAPI = {
  login: async (email: string, password: string) => {
    const authHeader = "Basic " + btoa(`${email}:${password}`);
    const response = await api.get("/users/me", {
      headers: {
        Authorization: authHeader,
      },
    });
    return response.data;
  },
};
export const userAPI = {
  create: async (userData: {
    email: string;
    password: string;
    role?: string;
  }) => {
    const response = await api.post("/users", userData);
    return response.data;
  },

  update: async (id: number, userData: { email?: string; role?: string }) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  activate: async (id: number) => {
    const response = await api.patch(`/users/${id}/activate`);
    return response.data;
  },

  deactivate: async (id: number) => {
    const response = await api.patch(`/users/${id}/deactivate`);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get("/users/stats");
    return response.data;
  },

  exportUsers: async () => {
    const response = await api.get("/users/export", {
      responseType: "arraybuffer",
    });
    return response.data;
  },

  getPublicKey: async () => {
    const response = await api.get("/users/public-key");
    return response.data;
  },
};
