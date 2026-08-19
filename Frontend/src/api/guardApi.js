import apiClient from "./authApi";

export const getGuards = async () => {
    return apiClient.get("/guards/all");
};

export const getGuardById = async (id) => {
    return apiClient.get(`/guards/${id}`);
};

export const createGuard = async (formData) => {
    return apiClient.post("/guards/add", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const updateGuard = async (id, formData) => {
    return apiClient.put(`/guards/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const deleteGuard = async (id) => {
    return apiClient.delete(`/guards/delete/${id}`);
};

export const assignGuardGate = async (id, gateId) => {
    return apiClient.put(`/guards/assign/${id}`, { gate_id: gateId });
};
