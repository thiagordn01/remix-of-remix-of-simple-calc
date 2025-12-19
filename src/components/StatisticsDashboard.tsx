import React from 'react';
import { useScriptHistory } from '../hooks/useScriptHistory';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { FileText, Star, Globe, TrendingUp } from 'lucide-react';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

export const StatisticsDashboard: React.FC = () => {
  const { getStatistics } = useScriptHistory();
  const stats = getStatistics();

  // Preparar dados para os gráficos
  const agentChartData = Object.entries(stats.byAgent).map(([name, data]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    roteiros: data.count,
    palavras: data.totalWords
  }));

  const languageChartData = Object.entries(stats.byLanguage).map(([language, count]) => ({
    name: language,
    value: count
  }));

  const monthChartData = Object.entries(stats.byMonth)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([month, count]) => ({
      month,
      roteiros: count
    }));

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtitle?: string;
    color?: string;
  }> = ({ title, value, icon, subtitle, color = 'blue' }) => (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className={`text-2xl font-bold text-${color}-400`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`text-${color}-400`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-6">
        <span className="text-2xl">📊</span>
        <h2 className="text-2xl font-bold text-white">Estatísticas de Uso</h2>
      </div>

      {/* Cards de estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Roteiros"
          value={stats.totalScripts}
          icon={<FileText size={24} />}
          color="blue"
        />
        <StatCard
          title="Palavras Geradas"
          value={stats.totalWords.toLocaleString('pt-BR')}
          icon={<TrendingUp size={24} />}
          subtitle={`Média: ${stats.avgWords} palavras/roteiro`}
          color="green"
        />
        <StatCard
          title="Favoritos"
          value={stats.favorites}
          icon={<Star size={24} />}
          subtitle={`${stats.totalScripts > 0 ? Math.round((stats.favorites / stats.totalScripts) * 100) : 0}% dos roteiros`}
          color="yellow"
        />
        <StatCard
          title="Idiomas Usados"
          value={Object.keys(stats.byLanguage).length}
          icon={<Globe size={24} />}
          color="purple"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de roteiros por agente */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Roteiros por Agente</h3>
          {agentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="roteiros" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Nenhum dado disponível
            </div>
          )}
        </div>

        {/* Gráfico de distribuição por idioma */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Distribuição por Idioma</h3>
          {languageChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={languageChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {languageChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de evolução temporal */}
      {monthChartData.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Evolução nos Últimos Meses</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '6px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="roteiros" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detalhes por agente */}
      {Object.keys(stats.byAgent).length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Detalhes por Agente</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-gray-300">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2">Agente</th>
                  <th className="text-right py-2">Roteiros</th>
                  <th className="text-right py-2">Total de Palavras</th>
                  <th className="text-right py-2">Média de Palavras</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.byAgent).map(([agent, data]) => (
                  <tr key={agent} className="border-b border-gray-700/50">
                    <td className="py-2">{agent}</td>
                    <td className="text-right py-2">{data.count}</td>
                    <td className="text-right py-2">{data.totalWords.toLocaleString('pt-BR')}</td>
                    <td className="text-right py-2">
                      {Math.round(data.totalWords / data.count).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
