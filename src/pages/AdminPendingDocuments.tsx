import React, { useEffect, useState } from 'react';
import { apiGetPendingDocuments, apiVerifyDocument } from '../lib/api';
import { resolveFileUrl } from '../lib/utils';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export const AdminPendingDocuments: React.FC = () => {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPending = async () => {
    setLoading(true);
    try {
      const data = await apiGetPendingDocuments();
      setDocs(data || []);
    } catch (err) {
      console.error('Failed to load pending docs', err);
      toast.error('Failed to load pending documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      await apiVerifyDocument(id);
      toast.success('Document verified');
      fetchPending();
    } catch (err) {
      console.error('verify failed', err);
      toast.error('Verification failed');
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pending Documents</h1>
        <button onClick={() => navigate('/admin')} className="text-sm text-blue-600">Back</button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        {loading ? (
          <div>Loading...</div>
        ) : docs.length === 0 ? (
          <div className="text-center p-8 text-gray-600">No pending documents</div>
        ) : (
          <div className="divide-y">
            {docs.map((d: any) => (
              <div key={d.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.filename}</div>
                  <div className="text-xs text-gray-500">Project: {d.project_name} — Uploaded by: {d.uploaded_by_email || d.uploaded_by_name || 'Unknown'}</div>
                </div>
                <div className="flex items-center space-x-2">
                  {(() => {
                    const fileUrl = resolveFileUrl(d.url);
                    if (fileUrl) {
                      return (
                        <a href={fileUrl} target="_blank" rel="noreferrer" className="text-blue-600">Open</a>
                      );
                    }
                    return <span className="text-sm text-gray-500">Local file (not served)</span>;
                  })()}
                  <button onClick={() => handleVerify(String(d.id))} className="px-3 py-1 bg-green-600 text-white rounded">Verify</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPendingDocuments;
