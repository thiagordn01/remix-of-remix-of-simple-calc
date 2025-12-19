import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';

interface ChartData {
  hourlyUsers: Array<{ hour: string; users: number }>;
  dailyUsers: Array<{ date: string; users: number; sessions: number }>;
  audioGeneration: Array<{ date: string; count: number }>;
  deviceBreakdown: Array<{ name: string; value: number; color: string }>;
}

export function AnalyticsCharts() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadChartData = async () => {
    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Hourly users (last 24 hours)
      const { data: hourlyData } = await supabase
        .from('user_sessions')
        .select('started_at')
        .gte('started_at', last24Hours.toISOString());

      const hourlyUsers = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(last24Hours.getTime() + i * 60 * 60 * 1000);
        const hourStr = hour.getHours().toString().padStart(2, '0') + ':00';
        const nextHour = new Date(hour.getTime() + 60 * 60 * 1000);
        
        const users = hourlyData?.filter(session => {
          const sessionTime = new Date(session.started_at);
          return sessionTime >= hour && sessionTime < nextHour;
        }).length || 0;

        return { hour: hourStr, users };
      });

      // Daily users and sessions (last 30 days)
      const { data: dailySessionData } = await supabase
        .from('user_sessions')
        .select('started_at, user_id')
        .gte('started_at', last30Days.toISOString());

      const dailyUsers = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(last30Days.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const dayData = dailySessionData?.filter(session => {
          const sessionTime = new Date(session.started_at);
          return sessionTime >= date && sessionTime < nextDay;
        }) || [];

        const uniqueUsers = new Set(dayData.map(s => s.user_id)).size;
        const sessions = dayData.length;

        return { 
          date: date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
          users: uniqueUsers,
          sessions
        };
      });

      // Audio generation trend (last 30 days)
      const { data: audioData } = await supabase
        .from('user_activities')
        .select('timestamp')
        .eq('activity_type', 'audio_generated')
        .gte('timestamp', last30Days.toISOString());

      const audioGeneration = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(last30Days.getTime() + i * 24 * 60 * 60 * 1000);
        const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
        
        const count = audioData?.filter(activity => {
          const activityTime = new Date(activity.timestamp);
          return activityTime >= date && activityTime < nextDay;
        }).length || 0;

        return { 
          date: date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
          count
        };
      });

      // Device breakdown
      const { data: deviceData } = await supabase
        .from('user_sessions')
        .select('device_type')
        .gte('started_at', last30Days.toISOString())
        .not('device_type', 'is', null);

      const deviceCounts: Record<string, number> = {};
      deviceData?.forEach(session => {
        if (session.device_type) {
          deviceCounts[session.device_type] = (deviceCounts[session.device_type] || 0) + 1;
        }
      });

      const colors = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];
      const deviceBreakdown = Object.entries(deviceCounts).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: colors[index % colors.length]
      }));

      setChartData({
        hourlyUsers,
        dailyUsers,
        audioGeneration,
        deviceBreakdown
      });

    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Carregando gráficos...</p>
      </div>
    );
  }

  if (!chartData) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Hourly Users */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários por Hora</CardTitle>
          <CardDescription>Últimas 24 horas</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.hourlyUsers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Users & Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários e Sessões Diárias</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.dailyUsers}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="users" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="sessions" stackId="2" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Audio Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Áudios Gerados</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.audioGeneration}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Device Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Dispositivo</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.deviceBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.deviceBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}