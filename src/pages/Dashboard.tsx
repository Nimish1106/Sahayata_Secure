import React, { useState, useEffect } from 'react';
import { DashboardStats } from '../components/Dashboard/DashboardStats';
import { ProjectCard } from '../components/Projects/ProjectCard';
import { Activity, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import api, { apiGetProjects, apiGetAuditLogs } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Project, AuditLog } from '../types';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalFiles: 0,
    totalStorage: '0 MB',
    activeUsers: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [recentActivities, setRecentActivities] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch user's projects from API
      const projects: Project[] = await apiGetProjects();

      // Calculate stats
      const totalFiles = projects.reduce((sum: number, p: Project) => sum + (p.total_files || 0), 0);
      const totalSize = projects.reduce((sum: number, p: Project) => sum + (p.total_size || 0), 0);
      const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 MB';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      setStats({
        totalProjects: projects.length,
        totalFiles,
        totalStorage: formatSize(totalSize),
        activeUsers: 12, // This would come from a real query
      });

      // Set recent projects (last 3)
  setRecentProjects(projects.slice(0, 3) as Project[]);

      // Fetch recent activities from API
      const activities = await apiGetAuditLogs(5);
      setRecentActivities(activities || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('upload')) return TrendingUp;
    if (action.includes('login')) return Activity;
    return Clock;
  };

  const getActivityColor = (action: string) => {
    if (action.includes('upload')) return 'text-green-600';
    if (action.includes('login')) return 'text-blue-600';
    if (action.includes('delete')) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.full_name}
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your projects at {user?.organization}
        </p>
        {user && !user.is_active && (
          <div className="mt-3 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
            Your account is pending approval. Some features may be disabled.
          </div>
        )}
        {errorMessage && (
          <div className="mt-3 p-3 rounded bg-red-50 border border-red-200 text-red-800">
            {errorMessage}
          </div>
        )}
      </div>

      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              View All
            </button>
          </div>
          
          {recentProjects.length > 0 ? (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Yet</h3>
              <p className="text-gray-600 mb-4">
                You haven't been assigned to any projects yet. Contact your administrator to get access or start a new project.
              </p>

              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => { window.alert('Request access: contact your admin'); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Request Access
                </button>

                <a href="/projects/new" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700">
                  Create Project
                </a>

                <a href="/users" className="px-4 py-2 text-sm text-blue-600">
                  Invite Team Member
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => {
                    const ActivityIcon = getActivityIcon(activity.action);
                    return (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg bg-gray-100 ${getActivityColor(activity.action)}`}>
                          <ActivityIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{activity.user?.full_name || 'Someone'}</span>{' '}
                            {activity.action.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.created_at ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true }) : 'some time ago'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};