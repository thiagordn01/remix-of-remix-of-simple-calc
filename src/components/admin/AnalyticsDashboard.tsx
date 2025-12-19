import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, Activity, Download, Smartphone, Monitor, Tablet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { AnalyticsOverview, UserSession, UserActivity } from '@/types/analytics';
import { AnalyticsCharts } from './charts/AnalyticsCharts';
import { SessionsList } from './SessionsList';
import { ActivitiesList } from './ActivitiesList';

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Load analytics overview
  const loadOverview = async () => {
    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      
      // Active users (sessions started in last 24h)
      const { count: activeUsers } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', yesterday.toISOString());

      // Total sessions today
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const { count: totalSessions } = await supabase
        .from('user_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', startOfDay.toISOString());

      // Average session duration (last 100 completed sessions)
      const { data: completedSessions } = await supabase
        .from('user_sessions')
        .select('started_at, ended_at')
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(100);

      let avgSessionDuration = 0;
      if (completedSessions?.length) {
        const totalDuration = completedSessions.reduce((sum, session) => {
          const start = new Date(session.started_at).getTime();
          const end = new Date(session.ended_at!).getTime();
          return sum + (end - start);
        }, 0);
        avgSessionDuration = Math.round(totalDuration / completedSessions.length / 1000 / 60); // minutes
      }

      // Total audio generated today
      const { count: totalAudioGenerated } = await supabase
        .from('user_activities')
        .select('*', { count: 'exact', head: true })
        .eq('activity_type', 'audio_generated')
        .gte('timestamp', startOfDay.toISOString());

      // Top pages (last 7 days)
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const { data: pageViews } = await supabase
        .from('user_activities')
        .select('page_path')
        .eq('activity_type', 'page_view')
        .gte('timestamp', weekAgo.toISOString())
        .not('page_path', 'is', null);

      const pageCounts: Record<string, number> = {};
      pageViews?.forEach(view => {
        if (view.page_path) {
          pageCounts[view.page_path] = (pageCounts[view.page_path] || 0) + 1;
        }
      });

      const topPages = Object.entries(pageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([path, views]) => ({ path, views }));

      // Device distribution (last 7 days)
      const { data: deviceData } = await supabase
        .from('user_sessions')
        .select('device_type')
        .gte('started_at', weekAgo.toISOString())
        .not('device_type', 'is', null);

      const deviceCounts: Record<string, number> = {};
      deviceData?.forEach(session => {
        if (session.device_type) {
          deviceCounts[session.device_type] = (deviceCounts[session.device_type] || 0) + 1;
        }
      });

      const deviceDistribution = Object.entries(deviceCounts)
        .map(([type, count]) => ({ type, count }));

      setOverview({
        activeUsers: activeUsers || 0,
        totalSessions: totalSessions || 0,
        avgSessionDuration,
        totalAudioGenerated: totalAudioGenerated || 0,
        topPages,
        deviceDistribution
      });

    } catch (error) {
      console.error('Error loading overview:', error);
    }
  };

  // Load recent sessions
  const loadSessions = async () => {
    try {
      const { data } = await supabase
        .from('user_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50);

      setSessions(data as UserSession[] || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  // Load recent activities
  const loadActivities = async () => {
    try {
      const { data } = await supabase
        .from('user_activities')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      setActivities(data as UserActivity[] || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadOverview(), loadSessions(), loadActivities()]);
      setLoading(false);
    };

    loadData();
  }, []);

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Carregando analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics</h2>
          <p className="text-muted-foreground">Monitoramento de usuários e atividades</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sessões Hoje</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalSessions}</div>
                <p className="text-xs text-muted-foreground">Desde 00:00</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgSessionDuration}min</div>
                <p className="text-xs text-muted-foreground">Por sessão</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Áudios Gerados</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalAudioGenerated}</div>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Pages & Device Distribution */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Páginas Mais Visitadas</CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overview?.topPages.map((page, index) => (
                    <div key={page.path} className="flex items-center justify-between">
                      <span className="text-sm truncate">{page.path}</span>
                      <Badge variant="secondary">{page.views}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Dispositivo</CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overview?.deviceDistribution.map((device) => (
                    <div key={device.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.type)}
                        <span className="text-sm capitalize">{device.type}</span>
                      </div>
                      <Badge variant="secondary">{device.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="charts">
          <AnalyticsCharts />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsList sessions={sessions} onRefresh={loadSessions} />
        </TabsContent>

        <TabsContent value="activities">
          <ActivitiesList activities={activities} onRefresh={loadActivities} />
        </TabsContent>
      </Tabs>
    </div>
  );
}