import { ReactNode } from 'react';
import { useUserTracking } from '@/hooks/useUserTracking';

interface TrackingProviderProps {
  children: ReactNode;
}

export default function TrackingProvider({ children }: TrackingProviderProps) {
  // Initialize tracking - the hook handles everything automatically
  useUserTracking();
  
  return <>{children}</>;
}