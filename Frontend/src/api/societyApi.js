import apiClient from "./authApi";

export const getSocieties = async () => {
    return apiClient.get("/societies/all");
};

export const getSocietyById = async (id) => {
    return apiClient.get(`/societies/${id}`);
};

export const createSociety = async (formData) => {
    // Since we are uploading a file and sending JSON data, formData should be passed directly
    return apiClient.post("/societies/add", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};

export const updateSociety = async (id, formData) => {
    return apiClient.put(`/societies/update/${id}`, formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
};

export const deleteSociety = async (id) => {
    return apiClient.delete(`/societies/delete/${id}`);
};
