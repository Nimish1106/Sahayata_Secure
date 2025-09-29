import React from 'react';
import { Link } from 'react-router-dom';
import { Folder, Users, FileText, Clock, MoreVertical } from 'lucide-react';
import { Project } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface ProjectCardProps {
  project: Project & {
    member_count?: number;
    recent_activity?: string;
  };
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
            <button className="p-1 text-gray-400 hover:text-gray-600">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-gray-500 mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs">Files</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{project.total_files}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-gray-500 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Members</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">{project.member_count || 0}</p>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">Size</div>
            <p className="text-lg font-semibold text-gray-900">{formatFileSize(project.total_size)}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
          </div>
          
          <Link
            to={`/projects/${project.id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Open Project
          </Link>
        </div>
      </div>
    </div>
  );
};