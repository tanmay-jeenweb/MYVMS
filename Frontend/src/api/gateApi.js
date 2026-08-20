import apiClient from "./authApi";

export const getGates = async () => {
    return apiClient.get("/gates/all");
};

export const getGateById = async (id) => {
    return apiClient.get(`/gates/${id}`);
};

export const createGate = async (data) => {
    return apiClient.post("/gates/add", data);
};

export const updateGate = async (id, data) => {
    return apiClient.put(`/gates/update/${id}`, data);
};

export const deleteGate = async (id) => {
    return apiClient.delete(`/gates/delete/${id}`);
};
