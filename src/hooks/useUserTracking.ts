import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { DeviceInfo } from '@/types/analytics';

export function useUserTracking() {
  const { user, session } = useAuth();
  const location = useLocation();
  const sessionIdRef = useRef<string | null>(null);
  const lastPageRef = useRef<string>('');

  // Detect device information
  const getDeviceInfo = (): DeviceInfo => {
    const userAgent = navigator.userAgent;
    const resolution = `${screen.width}x${screen.height}`;
    
    // Device type detection
    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (/Mobile|iPhone|Android.*Mobile/.test(userAgent)) {
      type = 'mobile';
    } else if (/iPad|Android(?!.*Mobile)/.test(userAgent)) {
      type = 'tablet';
    }

    // OS detection
    let os = 'Unknown';
    if (/Windows/.test(userAgent)) os = 'Windows';
    else if (/Mac/.test(userAgent)) os = 'macOS';
    else if (/Linux/.test(userAgent)) os = 'Linux';
    else if (/Android/.test(userAgent)) os = 'Android';
    else if (/iPhone|iPad/.test(userAgent)) os = 'iOS';

    // Browser detection
    let browser = 'Unknown';
    if (/Chrome/.test(userAgent) && !/Edge/.test(userAgent)) browser = 'Chrome';
    else if (/Firefox/.test(userAgent)) browser = 'Firefox';
    else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'Safari';
    else if (/Edge/.test(userAgent)) browser = 'Edge';

    return { type, os, browser, resolution };
  };

  // Get user IP (best effort)
  const getUserIP = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  };

  // Start new session
  const startSession = async () => {
    if (!user) return;

    try {
      const deviceInfo = getDeviceInfo();
      const ip = await getUserIP();
      
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          ip_address: ip,
          user_agent: navigator.userAgent,
          device_type: deviceInfo.type,
          os_name: deviceInfo.os,
          browser_name: deviceInfo.browser,
          screen_resolution: deviceInfo.resolution,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
        .select('id')
        .single();

      if (!error && data) {
        sessionIdRef.current = data.id;
        
        // Log login activity
        await logActivity('login', location.pathname);
      }
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // End session
  const endSession = async () => {
    if (!sessionIdRef.current) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionIdRef.current);

      await logActivity('logout');
      sessionIdRef.current = null;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // Log activity
  const logActivity = async (
    type: 'page_view' | 'audio_generated' | 'login' | 'logout',
    pagePath?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    try {
      await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          session_id: sessionIdRef.current,
          activity_type: type,
          page_path: pagePath,
          metadata: metadata || {}
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // Track page views
  useEffect(() => {
    if (!user || !sessionIdRef.current) return;

    const currentPath = location.pathname;
    if (currentPath !== lastPageRef.current) {
      logActivity('page_view', currentPath);
      lastPageRef.current = currentPath;
    }
  }, [location.pathname, user]);

  // Start/end session based on auth state
  useEffect(() => {
    if (session && user && !sessionIdRef.current) {
      startSession();
    } else if (!session && sessionIdRef.current) {
      endSession();
    }
  }, [session, user]);

  // End session on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for reliable tracking on page unload
        navigator.sendBeacon(
          `${window.location.origin}/api/end-session`,
          JSON.stringify({ sessionId: sessionIdRef.current })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return {
    logActivity,
    sessionId: sessionIdRef.current
  };
}