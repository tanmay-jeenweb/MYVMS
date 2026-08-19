import apiClient from "./authApi";

export const getUnits = async () => {
    return apiClient.get("/units/all");
};

export const getUnitById = async (id) => {
    return apiClient.get(`/units/${id}`);
};

export const createUnit = async (data) => {
    return apiClient.post("/units/add", data);
};

export const updateUnit = async (id, data) => {
    return apiClient.put(`/units/update/${id}`, data);
};

export const deleteUnit = async (id) => {
    return apiClient.delete(`/units/delete/${id}`);
};
