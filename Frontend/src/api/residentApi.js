import apiClient from "./authApi";

export const getResidents = async () => {
    return apiClient.get("/residents/all");
};

export const getResidentById = async (id) => {
    return apiClient.get(`/residents/${id}`);
};

export const createResident = async (formData) => {
    return apiClient.post("/residents/add", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const updateResident = async (id, formData) => {
    return apiClient.put(`/residents/update/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

export const deleteResident = async (id) => {
    return apiClient.delete(`/residents/delete/${id}`);
};
