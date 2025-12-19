import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, Eye, Volume2, LogIn, LogOut } from 'lucide-react';
import type { UserActivity } from '@/types/analytics';

interface ActivitiesListProps {
  activities: UserActivity[];
  onRefresh: () => void;
}

export function ActivitiesList({ activities, onRefresh }: ActivitiesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = 
      activity.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.page_path?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || activity.activity_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'page_view': return <Eye className="h-4 w-4" />;
      case 'audio_generated': return <Volume2 className="h-4 w-4" />;
      case 'login': return <LogIn className="h-4 w-4" />;
      case 'logout': return <LogOut className="h-4 w-4" />;
      default: return null;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'page_view': return 'Visualização';
      case 'audio_generated': return 'Áudio Gerado';
      case 'login': return 'Login';
      case 'logout': return 'Logout';
      default: return type;
    }
  };

  const getActivityVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'login': return 'default';
      case 'logout': return 'secondary';
      case 'audio_generated': return 'outline';
      default: return 'secondary';
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('pt-BR');
  };

  const formatMetadata = (metadata: Record<string, any>) => {
    if (!metadata || Object.keys(metadata).length === 0) return null;
    
    const relevantData = [];
    if (metadata.language) relevantData.push(`Idioma: ${metadata.language}`);
    if (metadata.textLength) relevantData.push(`Texto: ${metadata.textLength} chars`);
    if (metadata.voice) relevantData.push(`Voz: ${metadata.voice}`);
    
    return relevantData.join(' • ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Atividades dos Usuários</CardTitle>
            <CardDescription>Log detalhado de todas as ações realizadas</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="page_view">Visualizações</SelectItem>
                <SelectItem value="audio_generated">Áudio Gerado</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuário ou página..."
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
                <TableHead>Data/Hora</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Página</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell className="font-mono text-xs">
                    {activity.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>{formatDateTime(activity.timestamp)}</TableCell>
                  <TableCell>
                    <Badge variant={getActivityVariant(activity.activity_type)}>
                      <div className="flex items-center gap-1">
                        {getActivityIcon(activity.activity_type)}
                        {getActivityLabel(activity.activity_type)}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">
                      {activity.page_path || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatMetadata(activity.metadata) || '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {filteredActivities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm || typeFilter !== 'all' 
              ? 'Nenhuma atividade encontrada para os filtros aplicados.' 
              : 'Nenhuma atividade registrada.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}