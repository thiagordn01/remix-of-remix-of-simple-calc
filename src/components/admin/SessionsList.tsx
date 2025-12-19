import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { UserSession } from '@/types/analytics';

interface SessionsListProps {
  sessions: UserSession[];
  onRefresh: () => void;
}

export function SessionsList({ sessions, onRefresh }: SessionsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  };

  const filteredSessions = sessions.filter(session => 
    session.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.ip_address?.includes(searchTerm) ||
    session.device_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDeviceIcon = (type: string | null | undefined) => {
    switch (type) {
      case 'mobile': return <Smartphone className="h-4 w-4" />;
      case 'tablet': return <Tablet className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatDuration = (started: string, ended?: string) => {
    if (!ended) return 'Em andamento';
    
    const start = new Date(started).getTime();
    const end = new Date(ended).getTime();
    const duration = Math.round((end - start) / 1000 / 60); // minutes
    
    if (duration < 60) return `${duration}min`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}min`;
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('pt-BR');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sessões de Usuários</CardTitle>
            <CardDescription>Histórico de sessões e informações de dispositivo</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário, IP ou dispositivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-mono text-xs">
                    {session.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{formatDateTime(session.started_at)}</TableCell>
                  <TableCell>{formatDuration(session.started_at, session.ended_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeviceIcon(session.device_type)}
                      <span className="capitalize">{session.device_type || 'Desconhecido'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{session.os_name || 'N/A'}</div>
                      <div className="text-muted-foreground">{session.browser_name || 'N/A'}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {session.ip_address || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.ended_at ? 'secondary' : 'default'}>
                      {session.ended_at ? 'Finalizada' : 'Ativa'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredSessions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'Nenhuma sessão encontrada para o termo de busca.' : 'Nenhuma sessão registrada.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}