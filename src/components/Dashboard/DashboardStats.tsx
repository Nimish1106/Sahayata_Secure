import React from 'react';
import { Folder, FileText, HardDrive, Users } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-1">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

interface DashboardStatsProps {
  stats: {
    totalProjects: number;
    totalFiles: number;
    totalStorage: string;
    activeUsers: number;
  };
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Total Projects"
        value={stats.totalProjects}
        icon={Folder}
        color="bg-blue-500"
        trend="+2 this month"
      />
      <StatsCard
        title="Documents"
        value={stats.totalFiles}
        icon={FileText}
        color="bg-green-500"
        trend="+15 this week"
      />
      <StatsCard
        title="Storage Used"
        value={stats.totalStorage}
        icon={HardDrive}
        color="bg-purple-500"
      />
      <StatsCard
        title="Active Users"
        value={stats.activeUsers}
        icon={Users}
        color="bg-orange-500"
        trend="+3 online now"
      />
    </div>
  );
};