import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('geo_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

export const USE_CASES = ['restaurant', 'retail', 'office', 'school'];

export const RETAIL_TYPES = [
  { id: 'grocery', label: 'Supermarket / Grocery' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'appliances', label: 'Home Appliances' },
  { id: 'fashion', label: 'Clothing & Fashion' },
  { id: 'footwear', label: 'Footwear' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'beauty', label: 'Beauty & Cosmetics' },
  { id: 'jewellery', label: 'Jewellery' },
  { id: 'furniture', label: 'Furniture & Home' },
  { id: 'general', label: 'General Retail' },
];

export const RESTAURANT_TYPES = [
  { id: 'fast_food', label: 'Fast Food & QSR' },
  { id: 'cafe', label: 'Cafes & Coffee Shops' },
  { id: 'pizza', label: 'Pizza & Italian' },
  { id: 'burger', label: 'Burgers & Sandwiches' },
  { id: 'gujarati', label: 'Gujarati & Kathiyawadi' },
  { id: 'punjabi', label: 'North Indian & Punjabi / Dhaba' },
  { id: 'south_indian', label: 'South Indian' },
  { id: 'chinese', label: 'Chinese & Asian' },
  { id: 'fine_dining', label: 'Fine Dining & Family Restaurant' },
  { id: 'dessert', label: 'Desserts & Ice Cream' },
  { id: 'bakery', label: 'Bakery & Snacks' },
  { id: 'street_food', label: 'Street Food & Food Court' },
];

export const OFFICE_TYPES = [
  { id: 'auto', label: 'Auto Detect / All Office' },
  { id: 'it_software', label: 'IT / Software Office' },
  { id: 'corporate', label: 'Corporate Office' },
  { id: 'coworking', label: 'Coworking Space' },
  { id: 'financial', label: 'Financial / Professional Office' },
  { id: 'bpo', label: 'BPO / Back Office' },
  { id: 'general', label: 'General Office' },
];

export const SCHOOL_TYPES = [
  { id: 'primary_preschool', label: 'Primary & Pre-School / Kindergarten' },
  { id: 'secondary_highschool', label: 'Secondary & High School (CBSE/ICSE/GSEB)' },
  { id: 'international', label: 'International School (IB/Cambridge)' },
  { id: 'coaching', label: 'Coaching & Entrance Institute (JEE/NEET)' },
  { id: 'college_university', label: 'College & University Campus' },
  { id: 'general', label: 'General Educational School' },
];

export const analyzeLocation = async (latitude, longitude, useCase = 'restaurant', retailType = 'auto', restaurantType = 'auto', officeType = 'auto', schoolType = 'primary_preschool') => {
  const response = await api.post('/analyze/', { latitude, longitude, use_case: useCase, retail_type: retailType, restaurant_type: restaurantType, office_type: officeType, school_type: schoolType });
  return response.data;
};

export const predictLocation = async (latitude, longitude, useCase = 'restaurant', retailType = 'auto', restaurantType = 'auto', officeType = 'auto', schoolType = 'primary_preschool') => {
  const response = await api.post('/predict/', { latitude, longitude, use_case: useCase, retail_type: retailType, restaurant_type: restaurantType, office_type: officeType, school_type: schoolType });
  return response.data;
};

export const compareLocations = async (locationA, locationB, useCase = 'restaurant', retailType = 'auto', restaurantType = 'auto', officeType = 'auto', schoolType = 'primary_preschool') => {
  const response = await api.post('/compare/', { location_a: locationA, location_b: locationB, use_case: useCase, retail_type: retailType, restaurant_type: restaurantType, office_type: officeType, school_type: schoolType });
  return response.data;
};

export const getHistory = async () => {
  const response = await api.get('/history/');
  return response.data;
};

export const saveReport = async (reportData) => {
  const response = await api.post('/history/', reportData);
  return response.data;
};

export const getRecommendedLocations = async (payloadOrUseCase = 'restaurant', signal = null) => {
  const body = typeof payloadOrUseCase === 'object'
    ? payloadOrUseCase
    : {
        use_case: payloadOrUseCase,
        limit: 5,
      };
  const response = await api.post('/recommendations/', body, { signal });
  return response.data;
};

export const sendOTP = async (email) => {
  const response = await api.post('/send-otp/', { email });
  return response.data;
};

export const checkAvailability = async (username, email) => {
  const response = await api.get('/check-availability/', {
    params: { username, email },
  });
  return response.data;
};

export const loginUser = async (email, password) => {
  const response = await api.post('/login-user/', { email, password });
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/register-user/', userData);
  return response.data;
};

export const verifyMe = async () => {
  const response = await api.get('/auth/me/');
  return response.data;
};

export const logoutUser = async () => {
  try {
    await api.post('/auth/logout/');
  } catch (e) {
    // Ignore error on logout
  }
};

export const requestPasswordReset = async (email) => {
  const response = await api.post('/request-password-reset/', { email });
  return response.data;
};

export const confirmResetPassword = async (payload) => {
  const response = await api.post('/reset-password/', payload);
  return response.data;
};

export const deleteReport = async (id) => {
  const response = await api.delete(`/history/${id}/`);
  return response.data;
};

export default api;
