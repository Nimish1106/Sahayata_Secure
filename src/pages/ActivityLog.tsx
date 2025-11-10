import React, { useEffect, useState } from 'react';
import { request } from '../lib/api';
import toast from 'react-hot-toast';

interface ActivityLog {
  id: number;
  action: string;
  details: any;
  created_at: string;
  user: {
    email: string;
    full_name: string | null;
  };
}

export const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await request('/audit_logs', { method: 'GET' });
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'file_uploaded':
        return '📄';
      case 'document_verified':
        return '✅';
      case 'user_approved':
        return '👤';
      case 'project_created':
        return '📁';
      case 'member_added':
        return '➕';
      case 'member_removed':
        return '➖';
      default:
        return '🔵';
    }
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Activity Log</h1>

      {logs.length === 0 ? (
        <div className="text-center py-12">
          <p className="mt-1 text-sm text-gray-500">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="flow-root">
          <ul role="list" className="-mb-8">
            {logs.map((log, idx) => (
              <li key={log.id}>
                <div className="relative pb-8">
                  {idx !== logs.length - 1 && (
                    <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                  )}
                  <div className="relative flex items-start space-x-3">
                    <div className="relative">
                      <span className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white text-xl">
                        {getActivityIcon(log.action)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">
                            {log.user.full_name || log.user.email}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                      <div className="mt-2 text-sm text-gray-700">
                        <p>
                          <span className="font-medium">{formatAction(log.action)}</span>
                          {log.details && typeof log.details === 'object' && (
                            <span className="ml-1 text-gray-500">
                              {log.details.filename 
                                ? `- ${log.details.filename}`
                                : log.details.name
                                ? `- ${log.details.name}`
                                : ''}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;