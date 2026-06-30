const BASE_URL = 'http://10.132.83.9:8082/api/medications';

export const addMedication = async (
  userId: string,
  name: string,
  dosage: string,
  frequency: string,
  reminderTime: string,
  startDate: string,
  instructions?: string
) => {
  try {
    const response = await fetch(`${BASE_URL}/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        name,
        dosage,
        frequency,
        reminderTime,
        startDate,
        instructions,
      }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error('Network error. Please try again.');
  }
};

export const getUserMedications = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error('Network error. Please try again.');
  }
};

export const updateDoseStatus = async (medicationId: string, status: string) => {
  try {
    const response = await fetch(`${BASE_URL}/${medicationId}/dose-status?status=${status}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error('Network error. Please try again.');
  }
};

export const countActiveMedications = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/user/${userId}/count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error('Network error. Please try again.');
  }
};

export const getActiveMedicationCount = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/user/${userId}/count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error('Network error. Please try again.');
  }
};

export const getPendingMedications = async (userId: string) => {
  try {
    const response = await fetch(`${BASE_URL}/user/${userId}/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error('Network error. Please try again.');
  }
};
