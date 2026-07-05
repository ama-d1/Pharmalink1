import { API } from '@/constants/api';

const BASE_URL = API.auth;

export const loginUser = async (email: string, password: string) => {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error("Network error. Please try again.");
  }
};

export const registerUser = async (
  fullName: string,
  email: string,
  password: string,
  phoneNumber: string,
) => {
  try {
    const response = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fullName, email, password, phoneNumber }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error("Network error. Please try again.");
  }
};