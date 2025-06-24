import { Order, OrderStatus, Product, User } from './types';

// API URL setup
// Use environment variable or fallback to localhost
const API_URL = "https://backend-fov9.onrender.com/api";
// const API_URL = "http://localhost:5000/api";

console.log('API URL configured as:', API_URL);

// Debug helper
const debug = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[API] ${message}`, data || '');
  }
};

// Helper function to get auth token
const getAuthToken = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    debug('No authentication token found in localStorage');
    return '';
  }
  debug('Token found in localStorage', { tokenLength: token.length });
  return token;
};

// Helper function to create headers with authentication
const createAuthHeaders = (contentType = 'application/json') => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`
  };
  
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  
  return headers;
};

// Auth functions
export const loginStaff = async (phone: string, password: string) => {
  try {
    // Validate phone number format
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      throw new Error('Please enter a valid 10-digit phone number');
    }
    
    const response = await fetch(`${API_URL}/staff/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, password }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      } else {
        throw new Error(`Login failed: ${response.status} ${response.statusText}`);
      }
    }

    const data = await response.json();
    
    if (data && data.token) {
      localStorage.setItem('token', data.token);
      return data;
    } else {
      throw new Error('Invalid response format from server');
    }
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logoutStaff = () => {
  localStorage.removeItem('token');
};

// Staff management functions
export const fetchStaff = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  try {
    console.log('Fetching staff members...');
    const response = await fetch(`${API_URL}/staff`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Fetch staff error response:', errorData);
      throw new Error(errorData.message || 'Failed to fetch staff members');
    }

    const data = await response.json();
    console.log(`Retrieved ${data.length} staff members`);
    
    // Ensure each staff member has an id property for client-side operations
    const normalizedStaff = data.map((staff: any) => {
      if (staff._id && !staff.id) {
        staff.id = staff._id;
      }
      return staff;
    });
    
    return normalizedStaff;
  } catch (error) {
    console.error('Fetch staff error:', error);
    throw error;
  }
};

export const createStaff = async (staffData: Omit<User, 'id' | 'createdAt'>) => {
  const token = localStorage.getItem('token');
  console.log('Creating staff with data:', staffData);
  console.log('Authorization token present:', !!token);
  
  try {
    // Validate phone number format
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(staffData.phone)) {
      throw new Error('Please enter a valid 10-digit phone number');
    }
    
    const response = await fetch(`${API_URL}/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(staffData),
    });

    const responseData = await response.json();
    console.log('Create staff response:', {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      console.error('Create staff error response:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Handle specific error cases
      if (response.status === 403) {
        throw new Error('You do not have permission to create staff members');
      }
      
      if (responseData.message === 'Missing required fields') {
        throw new Error(`Missing required fields: ${Object.entries(responseData.details)
          .filter(([_, present]) => !present)
          .map(([field]) => field)
          .join(', ')}`);
      }
      
      if (responseData.message === 'Invalid role specified') {
        throw new Error(`Invalid role: ${responseData.receivedRole}. Valid roles are: ${responseData.validRoles.join(', ')}`);
      }
      
      if (responseData.message === 'Validation error') {
        const validationErrors = Object.entries(responseData.details)
          .map(([field, error]: [string, any]) => `${field}: ${error.message}`)
          .join(', ');
        throw new Error(`Validation error: ${validationErrors}`);
      }
      
      if (responseData.message === 'Duplicate key error') {
        throw new Error(`A staff member with this ${responseData.field} already exists`);
      }
      
      throw new Error(responseData.message || responseData.error || 'Failed to create staff member');
    }

    return responseData;
  } catch (error) {
    console.error('Create staff error:', error);
    throw error;
  }
};

export const updateStaff = async (id: string, staffData: Partial<User>) => {
  const token = localStorage.getItem('token');
  console.log('Updating staff with ID:', id);
  console.log('Update data:', staffData);
  
  try {
    // Validate phone number format if provided
    if (staffData.phone) {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(staffData.phone)) {
        throw new Error('Please enter a valid 10-digit phone number');
      }
    }
    
    const response = await fetch(`${API_URL}/staff/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(staffData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Update staff error response:', errorData);
      throw new Error(errorData.message || 'Failed to update staff member');
    }

    return response.json();
  } catch (error) {
    console.error('Update staff error:', error);
    throw error;
  }
};

export const deleteStaff = async (id: string) => {
  const token = localStorage.getItem('token');
  console.log('Deleting staff with ID:', id);
  
  try {
    const response = await fetch(`${API_URL}/staff/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Delete staff error response:', errorData);
      throw new Error(errorData.message || 'Failed to delete staff member');
    }

    return response.json();
  } catch (error) {
    console.error('Delete staff error:', error);
    throw error;
  }
};

// Product functions
export const fetchProducts = async () => {
  const token = getAuthToken();
  const url = `${API_URL}/products`;
  
  console.log('Fetching products from URL:', url);
    
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }

  const data = await response.json();
  console.log('Products received from server:', JSON.stringify(data.slice(0, 3), null, 2));
  return data;
};

export const createProduct = async (productData: Omit<Product, 'id' | '_id' | 'createdAt' | 'updatedAt'>) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required');
  }
  
  // Ensure threshold is explicitly set as a number or removed if undefined
  const processedData = { ...productData };
  if (processedData.threshold === undefined || processedData.threshold === null) {
    delete processedData.threshold;
  } else if (typeof processedData.threshold === 'string') {
    processedData.threshold = parseInt(processedData.threshold as unknown as string);
  }
  
  console.log('Sending product data:', JSON.stringify(processedData, null, 2));
  
  const response = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(processedData),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Product creation error response:', error);
    throw new Error(error.message || 'Failed to create product');
  }

  const product = await response.json();
  console.log('Product created:', JSON.stringify(product, null, 2));
  return product;
};

export const updateProduct = async (id: string, productData: Partial<Product>) => {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required');
  }
  
  // Ensure threshold is explicitly set as a number or removed if undefined
  const processedData = { ...productData };
  if (processedData.threshold === undefined || processedData.threshold === null) {
    delete processedData.threshold;
  } else if (typeof processedData.threshold === 'string') {
    processedData.threshold = parseInt(processedData.threshold as unknown as string);
  }
  
  console.log('Updating product with data:', JSON.stringify(processedData, null, 2));
  
  const response = await fetch(`${API_URL}/products/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(processedData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update product');
  }

  const product = await response.json();
  console.log('Product updated:', JSON.stringify(product, null, 2));
  return product;
};

export const deleteProduct = async (id: string) => {
  const token = getAuthToken();
  
  if (!token) {
    console.error('No authentication token available');
    throw new Error('Authentication required');
  }

  if (!id) {
    console.error('No product ID provided for deletion');
    throw new Error('Product ID is required');
  }

  // Log details for debugging
  console.log(`API: Deleting product with ID: "${id}" (${typeof id})`);
  
  try {
    // Make the request
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Log response status
    console.log(`API: Delete response status: ${response.status}`);
    
    if (!response.ok) {
      // Try to parse error JSON if possible
      try {
        const errorData = await response.json();
        console.error('API: Delete error response:', errorData);
        throw new Error(errorData.message || `Failed to delete product (${response.status})`);
      } catch (parseError) {
        // If we can't parse JSON, throw generic error
        throw new Error(`Failed to delete product: Server returned ${response.status}`);
      }
    }
    
    // Try to parse success JSON if possible
    try {
      const result = await response.json();
      console.log('API: Delete success response:', result);
      return result;
    } catch (parseError) {
      // Some endpoints might not return JSON
      console.log('API: No JSON in successful delete response');
      return { success: true };
    }
  } catch (error) {
    console.error('API: Error in deleteProduct:', error);
    throw error;
  }
};

// Order functions
export const fetchOrders = async (status?: string) => {
  const token = localStorage.getItem('token');
  const url = status 
    ? `${API_URL}/orders/status/${status}`
    : `${API_URL}/orders`;
    
  console.log('Fetching orders from URL:', url);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }

  const data = await response.json();
  console.log('Orders received from server:', data);
  return data;
};

export const fetchOrdersByDateRange = async (startDate: Date, endDate: Date) => {
  const token = localStorage.getItem('token');
  
  // Format dates as ISO strings for the URL
  const start = startDate.toISOString().split('T')[0];
  const end = endDate.toISOString().split('T')[0];
  
  const url = `${API_URL}/orders/date-range/${start}/${end}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch orders by date range');
  }

  return response.json();
};

export const fetchOrdersByAssignedTo = async (staffId: string) => {
  const token = localStorage.getItem('token');
  
  const url = `${API_URL}/orders/assigned/${staffId}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch assigned orders');
  }

  return response.json();
};

export const fetchOrdersByCreator = async (staffId: string) => {
  const token = localStorage.getItem('token');
  
  const url = `${API_URL}/orders/created/${staffId}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch orders created by staff');
  }

  return response.json();
};

export const createOrder = async (formData: FormData) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type here, let the browser set it with the boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create order');
  }

  return response.json();
};

export const updateOrder = async (id: string, orderData: Partial<Order>) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update order');
  }

  return response.json();
};

export const updateOrderWithImage = async (id: string, formData: FormData) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type here, let the browser set it with the boundary for FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update order');
  }

  return response.json();
};

export const markOrderAsPaid = async (id: string) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/orders/${id}/paid`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ 
      isPaid: true, 
      paidAt: new Date() 
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to mark order as paid');
  }

  return response.json();
};

export const deleteOrder = async (id: string) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/orders/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete order');
  }

  return response.json();
};

// Attendance functions
export const recordAttendance = async (staffId: string, attendanceData: { date: string, isPresent: boolean, remarks?: string }) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/staff/${staffId}/attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(attendanceData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to record attendance');
  }

  return response.json();
};

export const getStaffAttendance = async (staffId: string, startDate?: string, endDate?: string) => {
  const token = localStorage.getItem('token');
  
  let url = `${API_URL}/staff/${staffId}/attendance`;
  
  // Add date range parameters if provided
  if (startDate && endDate) {
    url += `?startDate=${startDate}&endDate=${endDate}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch staff attendance');
  }

  return response.json();
};

export const getAllStaffAttendanceByDate = async (date: string) => {
  const token = localStorage.getItem('token');
  const url = `${API_URL}/staff/attendance/date?date=${date}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch staff attendance by date');
  }

  return response.json();
};

export const loginUser = async (phone: string, password: string) => {
  const response = await fetch(`${API_URL}/staff/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Login failed');
  }

  // Store the token and user in localStorage
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));

  return data;
};

// Special method just for product deletion testing
export const testDeleteProduct = async (id: string) => {
  if (!id) {
    debug('Test delete product called with no ID');
    throw new Error('Product ID is required for deletion');
  }
  
  const token = getAuthToken();
  debug('Test delete product called', { id, tokenLength: token?.length });
  
  if (!token) {
    debug('No auth token available for test delete');
    throw new Error('Authentication required');
  }
  
  try {
    // Ensure we're connecting to the right endpoint
    const url = `${API_URL}/products/${id}`;
    debug('Making test DELETE request to', { url });
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    debug('Test delete response', { 
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    
    if (!response.ok) {
      const statusCode = response.status;
      let errorMessage = `Failed to delete product: ${statusCode}`;
      
      try {
        const errorData = await response.json();
        debug('Error response data', errorData);
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        debug('Could not parse error response as JSON');
      }
      
      throw new Error(errorMessage);
    }
    
    // Try to get the response data
    try {
      const data = await response.json();
      debug('Test delete success', data);
      return data;
    } catch (e) {
      debug('No JSON in success response');
      return { success: true, message: 'Product deleted successfully' };
    }
  } catch (error) {
    console.error('Error in test delete product:', error);
    throw error;
  }
};

// Function to fetch orders created by executive users (for admin analysis)
export const fetchOrdersByExecutives = async () => {
  const token = localStorage.getItem('token');
  
  // First fetch all staff members who are executives
  const executives = await fetchStaff().then(staff => 
    staff.filter(member => member.role === 'executive')
  );
  
  // Early return if no executives found
  if (!executives.length) {
    return { executives: [], orders: [] };
  }
  
  // Get IDs of all executives
  const executiveIds = executives.map(exec => exec._id || exec.id);
  
  // Fetch all orders
  const allOrders = await fetchOrders();
  
  // Filter orders created by executives
  const executiveOrders = allOrders.filter(order => 
    order.createdBy && executiveIds.includes(order.createdBy)
  );
  
  return {
    executives,
    orders: executiveOrders
  };
};

export const assignDeliveryPerson = async (orderId: string, deliveryPersonId: string) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}/orders/${orderId}/delivery-person`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ deliveryPersonId }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed to assign delivery person:', error);
    throw new Error(error.message || 'Failed to assign delivery person');
  }

  return response.json();
}; 