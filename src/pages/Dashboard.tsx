import React, { useState, useEffect } from 'react';
import { DashboardStats } from '../components/Dashboard/DashboardStats';
import { ProjectCard } from '../components/Projects/ProjectCard';
import { Activity, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Project, AuditLog } from '../types';
import { formatDistanceToNow } from 'date-fns';

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

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch user's project memberships
      const { data: memberships } = await supabase
        .from('project_members')
        .select(`
          project_id,
          projects (
            id,
            name,
            description,
            status,
            created_at,
            updated_at,
            total_files,
            total_size
          )
        `)
        .eq('user_id', user.id);

      const projects = memberships?.map(m => m.projects).filter(Boolean) || [];
      
      // Calculate stats
      const totalFiles = projects.reduce((sum, p) => sum + (p.total_files || 0), 0);
      const totalSize = projects.reduce((sum, p) => sum + (p.total_size || 0), 0);
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
      setRecentProjects(projects.slice(0, 3));

      // Fetch recent activities
      const { data: activities } = await supabase
        .from('audit_logs')
        .select(`
          *,
          users (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

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
                You haven't been assigned to any projects yet. Contact your administrator to get access.
              </p>
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
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
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