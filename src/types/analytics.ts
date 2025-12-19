export interface UserSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  device_type?: string | null;
  os_name?: string | null;
  browser_name?: string | null;
  screen_resolution?: string | null;
  timezone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  session_id?: string | null;
  activity_type: string;
  page_path?: string | null;
  timestamp: string;
  metadata: any;
}

export interface AnalyticsOverview {
  activeUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalAudioGenerated: number;
  topPages: Array<{ path: string; views: number }>;
  deviceDistribution: Array<{ type: string; count: number }>;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  resolution: string;
}