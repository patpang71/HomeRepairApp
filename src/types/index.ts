export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
  timestamp: Date;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  imageKey: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
}
