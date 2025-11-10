import React, { useEffect, useState } from 'react';
import { apiGetUsers, apiApproveUser } from '../lib/api';
import toast from 'react-hot-toast';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiGetUsers('pending');
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await apiApproveUser(id);
      toast.success('User approved');
      fetchUsers();
    } catch (err) {
      console.error('approve failed', err);
      toast.error('Approve failed');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Approvals</h1>
      <div className="bg-white rounded shadow p-4">
        {loading ? (
          <div>Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-gray-600">No users pending approval</div>
        ) : (
          <div className="divide-y">
            {users.map(u => (
              <div key={u.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.full_name || u.email}</div>
                  <div className="text-xs text-gray-500">{u.email}{u.organization ? ` • ${u.organization}` : ''}</div>
                  {u.profile?.organization && (
                    <div className="text-xs text-gray-500 mt-1">Organization: {u.profile.organization}</div>
                  )}
                </div>
                <div>
                  <button onClick={() => handleApprove(u.id)} className="px-3 py-1 bg-green-600 text-white rounded">Approve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
