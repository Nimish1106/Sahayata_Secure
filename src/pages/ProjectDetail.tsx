import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, Filter, Search } from 'lucide-react';
import { FileUpload } from '../components/Documents/FileUpload';
import { apiGetProjectById, apiVerifyDocument, apiGetProjectMembers, apiAddProjectMember, apiRemoveProjectMember } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { DocumentFile } from '../types';
import toast from 'react-hot-toast';
import { resolveFileUrl } from '../lib/utils';

export const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [addingEmail, setAddingEmail] = useState('');

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const fetchMembers = async () => {
    if (!projectId) return;
    try {
      const data = await apiGetProjectMembers(projectId);
      setMembers(data || []);
    } catch (err) {
      console.error('Failed to fetch members', err);
    }
  };

  useEffect(() => {
    if (showMembers) fetchMembers();
  }, [showMembers]);

  const fetchProjectDetails = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      const data = await apiGetProjectById(projectId);
      setProject(data);
      // backend will already filter documents for non-admins, but keep defensive fallback
      setDocuments(data.documents || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('Failed to load project details');
      setLoading(false);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchProjectDetails(); // Refresh the documents list
  };

  const handleAddMember = async () => {
    if (!projectId || !addingEmail) return;
    try {
      await apiAddProjectMember(projectId, addingEmail, 'viewer');
      setAddingEmail('');
      fetchMembers();
      toast.success('Member added');
    } catch (err) {
      console.error('add member failed', err);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!projectId) return;
    try {
      await apiRemoveProjectMember(projectId, userId);
      fetchMembers();
      toast.success('Member removed');
    } catch (err) {
      console.error('remove member failed', err);
      toast.error('Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project?.name}</h1>
          <p className="text-gray-600 mt-2">{project?.description}</p>
        </div>
        
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="h-5 w-5 mr-2" />
          Upload Files
        </button>
        {/* Admin controls: manage members */}
        {(user?.role === 'admin' || user?.role === 'project_manager') && (
          <button
            onClick={() => setShowMembers(true)}
            className="ml-4 inline-flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Manage Members
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search documents"
            />
          </div>
          
          <div>
            <label htmlFor="documentType" className="sr-only">Filter by document type</label>
            <select
              id="documentType"
              name="documentType"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter by document type"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="doc">Word</option>
              <option value="xls">Excel</option>
            </select>
          </div>

          <div className="flex items-center justify-end">
            <button className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
              <Filter className="h-5 w-5 mr-2" />
              More Filters
            </button>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-md divide-y divide-gray-200">
        {documents.length > 0 ? (
          documents.map((doc) => (
            <div key={doc.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{doc.filename}</h3>
                  <p className="text-sm text-gray-500">{doc.description}</p>
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 text-xs rounded ${doc.status === 'verified' ? 'bg-green-100 text-green-800' : doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {doc.status ? doc.status.toUpperCase() : 'UNKNOWN'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}</span>
                  <div className="flex items-center space-x-2">
                    {(user?.role === 'admin' || user?.role === 'project_manager') && doc.status !== 'verified' && (
                      <button
                        onClick={async () => {
                          try {
                            await apiVerifyDocument(String(doc.id));
                            toast.success('Document verified');
                            fetchProjectDetails();
                          } catch (err) {
                            console.error('Failed to verify document', err);
                            toast.error('Verification failed');
                          }
                        }}
                        className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        Verify
                      </button>
                    )}

                    {(() => {
                      const fileUrl = resolveFileUrl(doc.url);
                      const disabled = !fileUrl;
                      return (
                        <button
                          className={`text-blue-600 ${disabled ? 'text-gray-400 cursor-not-allowed' : 'hover:text-blue-700'} transition-colors px-3 py-1 rounded-md ${!disabled ? 'hover:bg-blue-50' : ''}`}
                          onClick={() => { if (fileUrl) window.open(fileUrl, '_blank'); }}
                          title={disabled ? 'Local file not served' : 'Download'}
                          disabled={disabled}
                        >
                          Download
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Upload className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-600 mb-6">Upload documents to this project to get started</p>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Your First Document
            </button>
          </div>
        )}
      </div>

      {showUpload && (
        <FileUpload 
          projectId={projectId as string} 
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
        />
      )}
      {showMembers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Manage Members</h2>
              <button onClick={() => setShowMembers(false)} className="text-gray-500">Close</button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Add member by email</label>
              <div className="flex space-x-2">
                <input placeholder="user@example.org" value={addingEmail} onChange={(e) => setAddingEmail(e.target.value)} className="flex-1 px-3 py-2 border rounded" />
                <button onClick={handleAddMember} className="px-3 py-2 bg-blue-600 text-white rounded">Add</button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Members</h3>
              <div className="divide-y">
                {members.map(m => (
                  <div key={m.user_id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium">{m.full_name || m.email}</div>
                      <div className="text-xs text-gray-500">{m.email} · {m.role}</div>
                    </div>
                    <div>
                      <button onClick={() => handleRemoveMember(m.user_id)} className="px-3 py-1 bg-red-600 text-white rounded">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};