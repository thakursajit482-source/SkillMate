import axios, { AxiosError } from 'axios';
import {
  User,
  College,
  CollegeVerification,
  Profile,
  PublicProfile,
  Skill,
  UserSkill,
  Availability,
  RequestItem,
  OfferItem,
  TaskItem,
  ChatThreadItem,
  ChatMessageItem,
  ReputationSummary,
  BlockItem,
  ReportItem,
  RequestType,
  SkillLevel,
  ReportCategory,
  TaskStatus,
  HybridMatchQuery,
  HybridMatchResponse,
} from '../types';

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const normalizeApiUrl = (url?: string): string => {
  if (!url) {
    return import.meta.env.DEV ? '/api/v1' : 'http://localhost:3000/api/v1';
  }
  const clean = url.replace(/\/+$/, '');
  return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
};

const API_BASE_URL = normalizeApiUrl(rawApiUrl);

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT access token to every outgoing request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap backend { success: true, statusCode: 200, data: ... }
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success !== undefined && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    const message = error.response?.data?.message;
    const formattedMessage = Array.isArray(message)
      ? message.join(', ')
      : message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(formattedMessage));
  },
);

// -------------------------------------------------------------
// Auth APIs
// -------------------------------------------------------------
export const authApi = {
  register: (data: {
    email: string;
    phone: string;
    password: string;
    name: string;
    collegeId?: string;
    idType?: string;
    enrollmentId?: string;
  }) =>
    apiClient.post<{ accessToken: string; user: User }>('/auth/register', data) as unknown as Promise<{ accessToken: string; user: User }>,

  login: (data: { email?: string; identifier?: string; password: string }) => {
    const payload = {
      email: (data.email || data.identifier || '').trim(),
      password: data.password,
    };
    return apiClient.post<{ accessToken: string; user: User }>('/auth/login', payload) as unknown as Promise<{ accessToken: string; user: User }>;
  },

  getMe: () =>
    apiClient.get<User>('/auth/me') as unknown as Promise<User>,
};

// -------------------------------------------------------------
// Colleges APIs
// -------------------------------------------------------------
export const collegesApi = {
  list: async (q?: string): Promise<College[]> => {
    const res = await (apiClient.get<College[]>('/colleges', { params: { q } }) as unknown as Promise<any>);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) return res.items;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  },

  getById: (id: string) =>
    apiClient.get<College>(`/colleges/${id}`) as unknown as Promise<College>,
};

// -------------------------------------------------------------
// Verification APIs
// -------------------------------------------------------------
export const verificationApi = {
  submit: (data: {
    collegeId: string;
    department?: string;
    yearOfStudy?: number;
    enrollmentId?: string;
    idType?: string;
    collegeEmail?: string;
    idDocumentRef?: string;
    documentUrl?: string;
  }) => {
    const payload = {
      collegeId: data.collegeId,
      department: data.department?.trim() || 'General',
      yearOfStudy: data.yearOfStudy ? Number(data.yearOfStudy) : 1,
      enrollmentId: data.enrollmentId?.trim() || `ENR-${Date.now().toString().slice(-6)}`,
      idType: data.idType,
      collegeEmail: data.collegeEmail?.trim() || undefined,
      idDocumentRef: data.idDocumentRef?.trim() || data.documentUrl?.trim() || undefined,
    };
    return apiClient.post<CollegeVerification>('/verification', payload) as unknown as Promise<CollegeVerification>;
  },

  getMyStatus: () =>
    apiClient.get<CollegeVerification>('/verification/me') as unknown as Promise<CollegeVerification>,
};

// -------------------------------------------------------------
// Profile APIs
// -------------------------------------------------------------
export const profilesApi = {
  getMyProfile: () =>
    apiClient.get<Profile>('/profile/me') as unknown as Promise<Profile>,

  updateProfile: (data: { bio?: string; avatarUrl?: string; major?: string; gradYear?: number; approximateArea?: string }) =>
    apiClient.patch<Profile>('/profile/me', data) as unknown as Promise<Profile>,

  getPublicProfile: (id: string) =>
    apiClient.get<PublicProfile>(`/profile/${id}`) as unknown as Promise<PublicProfile>,

  getMySkills: () =>
    apiClient.get<UserSkill[]>('/profile/me/skills') as unknown as Promise<UserSkill[]>,

  addSkill: (data: { skillId: string; level: SkillLevel }) =>
    apiClient.post<UserSkill>('/profile/me/skills', data) as unknown as Promise<UserSkill>,

  removeSkill: (id: string) =>
    apiClient.delete(`/profile/me/skills/${id}`) as unknown as Promise<void>,

  getMyAvailability: () =>
    apiClient.get<Availability[]>('/profile/me/availability') as unknown as Promise<Availability[]>,

  addAvailability: (data: {
    dayOfWeek?: number;
    specificDate?: string;
    startTime: string;
    endTime: string;
    activity?: string;
    details?: string;
    slotLabel?: string;
  }) =>
    apiClient.post<Availability>('/profile/me/availability', data) as unknown as Promise<Availability>,

  updateAvailability: (
    id: string,
    data: {
      dayOfWeek?: number;
      specificDate?: string;
      startTime?: string;
      endTime?: string;
      activity?: string;
      details?: string;
    },
  ) =>
    apiClient.patch<Availability>(`/profile/me/availability/${id}`, data) as unknown as Promise<Availability>,

  removeAvailability: (id: string) =>
    apiClient.delete(`/profile/me/availability/${id}`) as unknown as Promise<void>,
};

// -------------------------------------------------------------
// Skills Taxonomy APIs
// -------------------------------------------------------------
export const skillsApi = {
  getAll: async (params?: { search?: string; category?: string; page?: number; limit?: number }): Promise<{ items: Skill[]; total: number }> => {
    const res = await (apiClient.get<any>('/skills', { params }) as unknown as Promise<any>);
    if (res && Array.isArray(res.data)) {
      return { items: res.data, total: res.meta?.total ?? res.data.length };
    }
    if (res && Array.isArray(res.items)) {
      return { items: res.items, total: res.total ?? res.items.length };
    }
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return { items: [], total: 0 };
  },

  getCategories: () =>
    apiClient.get<string[]>('/skills/categories') as unknown as Promise<string[]>,
};

// -------------------------------------------------------------
// Discovery APIs
// -------------------------------------------------------------
export const discoveryApi = {
  discoverStudents: async (params?: {
    skillId?: string;
    collegeId?: string;
    area?: string;
    dayOfWeek?: number;
    page?: number;
    limit?: number;
  }): Promise<{ items: PublicProfile[]; total: number }> => {
    const res = await (apiClient.get<any>('/discovery/students', { params }) as unknown as Promise<any>);
    if (res && Array.isArray(res.data)) {
      return { items: res.data, total: res.meta?.total ?? res.data.length };
    }
    if (res && Array.isArray(res.items)) {
      return { items: res.items, total: res.total ?? res.items.length };
    }
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return { items: [], total: 0 };
  },

  discoverRequests: async (params?: {
    type?: RequestType;
    skillId?: string;
    area?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: RequestItem[]; total: number }> => {
    const res = await (apiClient.get<any>('/discovery/requests', { params }) as unknown as Promise<any>);
    if (res && Array.isArray(res.data)) {
      return { items: res.data, total: res.meta?.total ?? res.data.length };
    }
    if (res && Array.isArray(res.items)) {
      return { items: res.items, total: res.total ?? res.items.length };
    }
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return { items: [], total: 0 };
  },
};

// -------------------------------------------------------------
// Requests APIs
// -------------------------------------------------------------
export const requestsApi = {
  create: (data: {
    title: string;
    description: string;
    category?: string;
    type: RequestType;
    budget?: number;
    skillId?: string;
    desiredSkillId?: string;
    exchangeSkillId?: string;
    activityTag?: string;
    socialVibe?: string;
    targetUserId?: string;
    approximateArea?: string;
    availabilityWindow?: {
      startTime: string;
      endTime: string;
      dayOfWeek?: number;
      specificDate?: string;
      notes?: string;
    };
  }) => {
    const payload = {
      title: data.title,
      description: data.description,
      type: data.type,
      budget: data.type === 'PAID' && data.budget !== undefined && !isNaN(data.budget) ? Number(data.budget) : undefined,
      skillId: data.type !== 'SOCIAL' ? data.skillId : undefined,
      desiredSkillId: data.type === 'SKILL_EXCHANGE' ? (data.desiredSkillId || data.exchangeSkillId) : undefined,
      activityTag: data.type === 'SOCIAL' ? (data.activityTag || data.socialVibe) : undefined,
      targetUserId: data.targetUserId,
      approximateArea: data.approximateArea?.trim() || 'Mumbai',
      availabilityWindow: data.availabilityWindow || {
        startTime: '10:00',
        endTime: '18:00',
        notes: 'Flexible scheduling',
      },
    };
    return apiClient.post<RequestItem>('/requests', payload) as unknown as Promise<RequestItem>;
  },

  findAll: async (params?: { type?: RequestType; status?: string; page?: number; limit?: number }): Promise<{ items: RequestItem[]; total: number }> => {
    const res = await (apiClient.get<any>('/requests', { params }) as unknown as Promise<any>);
    if (res && Array.isArray(res.data)) {
      return { items: res.data, total: res.meta?.total ?? res.data.length };
    }
    if (res && Array.isArray(res.items)) {
      return { items: res.items, total: res.total ?? res.items.length };
    }
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return { items: [], total: 0 };
  },

  findMine: async (params?: { page?: number; limit?: number }): Promise<{ items: RequestItem[]; total: number }> => {
    const res = await (apiClient.get<any>('/requests/mine', { params }) as unknown as Promise<any>);
    if (res && Array.isArray(res.data)) {
      return { items: res.data, total: res.meta?.total ?? res.data.length };
    }
    if (res && Array.isArray(res.items)) {
      return { items: res.items, total: res.total ?? res.items.length };
    }
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return { items: [], total: 0 };
  },

  getById: (id: string) =>
    apiClient.get<RequestItem>(`/requests/${id}`) as unknown as Promise<RequestItem>,

  accept: (id: string) =>
    apiClient.post<{ message: string; request: RequestItem; task?: TaskItem }>(`/requests/${id}/accept`) as unknown as Promise<{ message: string; request: RequestItem; task?: TaskItem }>,

  close: (id: string) =>
    apiClient.post<RequestItem>(`/requests/${id}/close`) as unknown as Promise<RequestItem>,

  cancel: (id: string, reason?: string) =>
    apiClient.post<RequestItem>(`/requests/${id}/cancel`, { reason }) as unknown as Promise<RequestItem>,
};

// -------------------------------------------------------------
// Offers APIs
// -------------------------------------------------------------
export const offersApi = {
  create: (requestId: string, data: { message: string; proposedPrice?: number; proposedSkillId?: string }) =>
    apiClient.post<OfferItem>(`/requests/${requestId}/offers`, data) as unknown as Promise<OfferItem>,

  findMine: async (): Promise<{ items: OfferItem[]; total: number }> => {
    const res = await (apiClient.get<any>('/offers/mine') as unknown as Promise<any>);
    if (res && Array.isArray(res.data)) {
      return { items: res.data, total: res.meta?.total ?? res.data.length };
    }
    if (res && Array.isArray(res.items)) {
      return { items: res.items, total: res.total ?? res.items.length };
    }
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return { items: [], total: 0 };
  },

  getForRequest: (requestId: string) =>
    apiClient.get<{ items: OfferItem[]; total: number }>(`/requests/${requestId}/offers`) as unknown as Promise<{ items: OfferItem[]; total: number }>,

  getById: (id: string) =>
    apiClient.get<OfferItem>(`/offers/${id}`) as unknown as Promise<OfferItem>,

  accept: (id: string) =>
    apiClient.post<{ task: TaskItem }>(`/offers/${id}/accept`) as unknown as Promise<{ task: TaskItem }>,

  decline: (id: string) =>
    apiClient.post<OfferItem>(`/offers/${id}/decline`) as unknown as Promise<OfferItem>,

  withdraw: (id: string) =>
    apiClient.post<OfferItem>(`/offers/${id}/withdraw`) as unknown as Promise<OfferItem>,
};

// -------------------------------------------------------------
// Tasks APIs
// -------------------------------------------------------------
export const tasksApi = {
  findAll: async (params?: { status?: string; role?: string; page?: number; limit?: number }): Promise<{ items: TaskItem[]; total: number }> => {
    const res = await (apiClient.get<any>('/tasks', { params }) as unknown as Promise<any>);
    if (res && Array.isArray(res.data)) {
      return { items: res.data, total: res.meta?.total ?? res.data.length };
    }
    if (res && Array.isArray(res.items)) {
      return { items: res.items, total: res.total ?? res.items.length };
    }
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return { items: [], total: 0 };
  },

  findMine: async (params?: { status?: string; page?: number; limit?: number }): Promise<{ items: TaskItem[]; total: number }> => {
    const res = await (apiClient.get<any>('/tasks/mine', { params }) as unknown as Promise<any>);
    if (res && Array.isArray(res.data)) {
      return { items: res.data, total: res.meta?.total ?? res.data.length };
    }
    if (res && Array.isArray(res.items)) {
      return { items: res.items, total: res.total ?? res.items.length };
    }
    if (Array.isArray(res)) {
      return { items: res, total: res.length };
    }
    return { items: [], total: 0 };
  },

  getById: (id: string) =>
    apiClient.get<TaskItem>(`/tasks/${id}`) as unknown as Promise<TaskItem>,

  updateStatus: async (
    id: string,
    data:
      | { status: TaskStatus; cancelReason?: string }
      | { action: 'accept' | 'start' | 'complete' | 'cancel'; cancellationReason?: string; cancelReason?: string },
  ): Promise<TaskItem> => {
    let payload: { status: TaskStatus; cancelReason?: string };
    if ('status' in data && data.status) {
      payload = {
        status: data.status,
        cancelReason: data.cancelReason,
      };
    } else if ('action' in data) {
      const actionMap: Record<string, TaskStatus> = {
        accept: 'ACCEPTED' as TaskStatus,
        start: 'IN_PROGRESS' as TaskStatus,
        complete: 'COMPLETED' as TaskStatus,
        cancel: 'CANCELLED' as TaskStatus,
      };
      payload = {
        status: actionMap[data.action] || ('IN_PROGRESS' as TaskStatus),
        cancelReason: data.cancellationReason || data.cancelReason,
      };
    } else {
      payload = { status: 'IN_PROGRESS' as TaskStatus };
    }
    const res = await (apiClient.post<any>(`/tasks/${id}/status`, payload) as unknown as Promise<any>);
    if (res && res.task) {
      return res.task;
    }
    return res;
  },
};

// -------------------------------------------------------------
// Chat APIs
// -------------------------------------------------------------
export const chatApi = {
  getThreads: () =>
    apiClient.get<ChatThreadItem[]>('/chat/threads') as unknown as Promise<ChatThreadItem[]>,

  getById: (id: string) =>
    apiClient.get<ChatThreadItem>(`/chat/threads/${id}`) as unknown as Promise<ChatThreadItem>,

  createOrGetThread: (data: { participantBId?: string; participantId?: string; requestId?: string; taskId?: string }) => {
    const payload = {
      participantId: data.participantId || data.participantBId,
      requestId: data.requestId,
    };
    return apiClient.post<ChatThreadItem>('/chat/threads', payload) as unknown as Promise<ChatThreadItem>;
  },

  getMessages: async (
    threadId: string,
    params?: { limit?: number; cursor?: string },
  ): Promise<{ items: ChatMessageItem[]; total: number }> => {
    const res = await (apiClient.get<any>(`/chat/threads/${threadId}/messages`, { params }) as unknown as Promise<any>);
    let rawItems: any[] = [];
    let total = 0;
    if (res && Array.isArray(res.data)) {
      rawItems = res.data;
      total = res.meta?.total ?? res.data.length;
    } else if (res && Array.isArray(res.items)) {
      rawItems = res.items;
      total = res.total ?? res.items.length;
    } else if (Array.isArray(res)) {
      rawItems = res;
      total = res.length;
    }
    const items: ChatMessageItem[] = rawItems.map((m: any) => ({
      id: m.id,
      threadId: m.threadId,
      senderId: m.senderId,
      content: m.content,
      isRead: m.isRead !== undefined ? m.isRead : !!m.readAt,
      createdAt: m.createdAt || m.sentAt || new Date().toISOString(),
      sender: m.sender || (m.senderName ? { id: m.senderId, name: m.senderName } : undefined),
    }));
    return { items, total };
  },

  sendMessage: (threadId: string, content: string) =>
    apiClient.post<ChatMessageItem>(`/chat/threads/${threadId}/messages`, { content }) as unknown as Promise<ChatMessageItem>,
};

// -------------------------------------------------------------
// Reputation APIs
// -------------------------------------------------------------
export const reputationApi = {
  getReputation: (userId: string) =>
    apiClient.get<ReputationSummary>(`/users/${userId}/reputation`) as unknown as Promise<ReputationSummary>,

  rateTask: (taskId: string, data: { score: number; comment?: string }) =>
    apiClient.post(`/tasks/${taskId}/rating`, data) as unknown as Promise<any>,

  endorseSkill: (data: { endorseeId: string; skillId: string }) =>
    apiClient.post('/endorsements', data) as unknown as Promise<any>,

  getEndorsements: (userId: string) =>
    apiClient.get<any[]>(`/users/${userId}/endorsements`) as unknown as Promise<any[]>,
};

// -------------------------------------------------------------
// Safety APIs
// -------------------------------------------------------------
export const safetyApi = {
  getBlockedUsers: () =>
    apiClient.get<BlockItem[]>('/users/blocked') as unknown as Promise<BlockItem[]>,

  blockUser: (userId: string) =>
    apiClient.post(`/users/${userId}/block`) as unknown as Promise<any>,

  unblockUser: (userId: string) =>
    apiClient.delete(`/users/${userId}/block`) as unknown as Promise<any>,

  createReport: (data: { reportedUserId: string; taskId?: string; category: ReportCategory; description: string }) =>
    apiClient.post<ReportItem>('/reports', data) as unknown as Promise<ReportItem>,

  getMyReports: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ items: ReportItem[]; total: number }>('/reports/mine', { params }) as unknown as Promise<{ items: ReportItem[]; total: number }>,
};

// -------------------------------------------------------------
// AI Matching APIs (Stage 7D)
// -------------------------------------------------------------
export const aiApi = {
  match: (data: HybridMatchQuery) =>
    apiClient.post<HybridMatchResponse>('/ai/match', data) as unknown as Promise<HybridMatchResponse>,

  parseQuery: (query: string) =>
    apiClient.post<any>('/ai/parse-query', { query }) as unknown as Promise<any>,
};
