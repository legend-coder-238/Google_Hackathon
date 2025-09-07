// API configuration and base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

// Types for API responses
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Clerk types
export interface ClerkAuthResponse {
  user: User;
  token: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  clerkId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  name: string;
  password: string;
}

export interface Document {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  processed: boolean;
  classification?: string;
  summary?: string;
}

export interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: string;
  mode: 'qna' | 'summarize' | 'explain';
  sources?: string[];
}

export interface UploadResponse {
  documentId: string;
  filename: string;
  size: number;
  processed: boolean;
  summary?: string;
  classification?: string;
}

export interface ChatResponse {
  response: string;
  sources: string[];
  mode: string;
  timestamp: string;
  sessionId?: string;
}

export interface ClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string | null;
}

export interface ChatSession {
  id: string;
  title?: string;
  documentId?: string;
  documentName?: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

// API client class
class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private clerkToken: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Try to get token from localStorage on initialization
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('authToken');
    }
  }

  setAuthToken(token: string) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
    }
  }

  clearAuthToken() {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
    }
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  setClerkToken(token: string) {
    this.clerkToken = token;
  }

  async authenticateWithClerk(user: ClerkUser, getToken: () => Promise<string | null>): Promise<void> {
    try {
      const clerkToken = await getToken();
      if (!clerkToken) {
        throw new Error('No Clerk token available');
      }

      this.setClerkToken(clerkToken);

      // Exchange Clerk token for our JWT token
      const response = await this.request<ClerkAuthResponse>('/auth/clerk', {
        method: 'POST',
        headers: {
          'X-Clerk-User-Id': user.id,
          'X-Clerk-User-Email': user.emailAddresses[0]?.emailAddress,
          'X-Clerk-User-Name': user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User',
          'Authorization': `Bearer ${clerkToken}`,
        },
      });

      if (response.success && response.data?.token) {
        this.setAuthToken(response.data.token);
      }
    } catch (error) {
      console.error('Clerk authentication failed:', error);
      throw error;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Don't set Content-Type for FormData uploads - let browser handle it
    const defaultHeaders: HeadersInit = {};
    if (!(options.body instanceof FormData)) {
      defaultHeaders['Content-Type'] = 'application/json';
    }

    // Add auth token if available
    if (this.authToken) {
      defaultHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    // Create timeout signal with fallback for older browsers
    let timeoutId: NodeJS.Timeout | undefined;
    let abortController: AbortController | undefined;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
    
    // Use AbortController for timeout if AbortSignal.timeout is not available
    if (typeof AbortSignal.timeout === 'function') {
      // Modern approach - use longer timeout for AI operations
      const timeout = endpoint.includes('/chat/') ? 120000 : 30000; // 2 minutes for chat, 30s for others
      config.signal = AbortSignal.timeout(timeout);
    } else {
      // Fallback for older browsers
      abortController = new AbortController();
      config.signal = abortController.signal;
      const timeout = endpoint.includes('/chat/') ? 120000 : 30000; // 2 minutes for chat, 30s for others
      timeoutId = setTimeout(() => {
        abortController?.abort();
      }, timeout);
    }

    try {
      const response = await fetch(url, config);
      
      // Clear timeout if request completed
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }
      
      // Parse JSON response with error handling
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid response format: Expected JSON but received invalid data');
      }
      
      return data;
    } catch (error) {
      // Clear timeout if request failed
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.error('API request failed:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout: The server took too long to respond. Please try again.');
        }
        if (error.message.includes('fetch')) {
          throw new Error('Network error: Unable to connect to the server. Please check your connection and try again.');
        }
      }
      
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.request('/health');
  }

  // Authentication
  async register(userData: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.success && response.data?.token) {
      this.setAuthToken(response.data.token);
    }
    
    return response;
  }

  async login(credentials: LoginData): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data?.token) {
      this.setAuthToken(response.data.token);
    }
    
    return response;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    
    this.clearAuthToken();
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/me');
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return this.request<{ user: User }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  isAuthenticated(): boolean {
    return !!this.authToken;
  }

  // Phone authentication
  async sendOTP(
    phone: string, 
    purpose: 'login' | 'registration' | 'verification' = 'verification'
  ): Promise<ApiResponse<{ phone: string; purpose: string; otp?: string }>> {
    return this.request('/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
    });
  }

  async verifyOTP(
    phone: string, 
    otp: string
  ): Promise<ApiResponse<{ phone: string; verified: boolean }>> {
    return this.request('/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
  }

  async registerWithPhone(
    phone: string,
    name: string,
    email: string,
    password: string,
    otp: string
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/phone/register', {
      method: 'POST',
      body: JSON.stringify({ phone, name, email, password, otp }),
    });
    
    if (response.success && response.data?.token) {
      this.setAuthToken(response.data.token);
    }
    
    return response;
  }

  async loginWithPhone(
    phone: string,
    otp: string
  ): Promise<ApiResponse<AuthResponse>> {
    const response = await this.request<AuthResponse>('/phone/login', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });
    
    if (response.success && response.data?.token) {
      this.setAuthToken(response.data.token);
    }
    
    return response;
  }

  // Document management
  async uploadDocument(
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('document', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
      
  // Handle completion
      xhr.addEventListener('load', () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response);
          } else {
            reject(new Error(response.message || `HTTP error! status: ${xhr.status}`));
          }
        } catch {
          reject(new Error('Failed to parse response'));
        }
      });
      
      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      
      // Handle abort
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload aborted'));
      });
      
      // Set up request
      xhr.open('POST', `${this.baseUrl}/upload`);
      
      // Add auth token if available
      if (this.authToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
      }
      
      // Send request
      xhr.send(formData);
    });
  }

  async getDocuments(): Promise<ApiResponse<Document[]>> {
    return this.request<Document[]>('/documents');
  }

  async getDocument(documentId: string): Promise<ApiResponse<Document>> {
    return this.request<Document>(`/documents/${documentId}`);
  }

  async deleteDocument(documentId: string): Promise<ApiResponse> {
    return this.request(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  async getUploadStatus(documentId: string): Promise<ApiResponse<Document>> {
    return this.request<Document>(`/upload/status/${documentId}`);
  }

  // Chat functionality
  async sendChatMessage(
    message: string,
    documentId?: string,
    mode: 'qna' | 'summarize' | 'explain' = 'qna',
    sessionId?: string
  ): Promise<ApiResponse<ChatResponse & { sessionId: string }>> {
    return this.request<ChatResponse & { sessionId: string }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        message,
        documentId,
        mode,
        sessionId,
      }),
    });
  }

  async getChatHistory(documentId: string): Promise<ApiResponse<{ documentId: string; history: ChatMessage[] }>> {
    return this.request<{ documentId: string; history: ChatMessage[] }>(`/chat/history/${documentId}`);
  }

  async getChatSessions(): Promise<ApiResponse<ChatSession[]>> {
    return this.request<ChatSession[]>('/chat/sessions');
  }

  async getSessionMessages(sessionId: string): Promise<ApiResponse<{ sessionId: string; messages: ChatMessage[] }>> {
    return this.request<{ sessionId: string; messages: ChatMessage[] }>(`/chat/sessions/${sessionId}/messages`);
  }

  async clearChatHistory(documentId: string): Promise<ApiResponse> {
    return this.request(`/chat/history/${documentId}`, {
      method: 'DELETE',
    });
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export additional utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const isValidFileType = (file: File): boolean => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];
  return allowedTypes.includes(file.type);
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Error handling utilities
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};