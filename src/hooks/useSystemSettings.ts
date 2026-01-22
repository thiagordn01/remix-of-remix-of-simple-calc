import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MaintenanceSettings {
    enabled: boolean;
    message?: string;
}

export function useSystemSettings() {
    const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceSettings>({
        enabled: false,
        message: "Sistema em manutenção"
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMaintenanceStatus();

        // Subscribe to realtime changes
        const channel = supabase
            .channel('system_settings_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'system_settings',
                    filter: 'key=eq.maintenance_mode'
                },
                (payload) => {
                    console.log('🔄 Maintenance status changed:', payload);
                    if (payload.new && (payload.new as any).value) {
                        setMaintenanceMode((payload.new as any).value);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchMaintenanceStatus = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'maintenance_mode')
                .single();

            if (error) {
                // If table doesn't exist or RLS block, just assume false to avoid lockout
                console.warn('Error fetching maintenance mode:', error);
                setLoading(false);
                return;
            }

            if (data && data.value) {
                setMaintenanceMode(data.value as MaintenanceSettings);
            }
        } catch (error) {
            console.error('Error in fetchMaintenanceStatus:', error);
        } finally {
            setLoading(false);
        }
    };

    const setMaintenanceStatus = async (enabled: boolean, message: string) => {
        const newValue = { enabled, message };

        // Optimistic update
        setMaintenanceMode(newValue);

        const { error } = await supabase
            .from('system_settings')
            .upsert({
                key: 'maintenance_mode',
                value: newValue,
                description: 'Controls system-wide maintenance mode'
            });

        if (error) {
            console.error('Error updating maintenance mode:', error);
            // Revert on error would be ideal, but for now just log
            throw error;
        }
    };

    return { maintenanceMode, loading, setMaintenanceStatus };
}
