import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Plus, Edit2, X, Save,
  ChevronDown, ChevronUp, Mail, Phone,
  GraduationCap, Calendar, Shield, AlertTriangle, Eye
} from 'lucide-react';
import {
  collection, getDocs, doc, updateDoc,
  serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ── Modal wrapper ─────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, size = 'md' }) => {
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const styles = {
    active:      'bg-green-100 text-green-800',
    pending:     'bg-yellow-100 text-yellow-800',
    rejected:    'bg-red-100 text-red-800',
    deactivated: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || styles.deactivated}`}>
      {status}
    </span>
  );
};

// ── Role badge ────────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
    role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
  }`}>
    {role}
  </span>
);

// ── COLLEGES list (reused from Register) ─────────────────────────────────────
const COLLEGES = [
  'College of Agriculture and Environmental Sciences',
  'College of Business and Economics',
  'College of Computing and Informatics',
  'College of Education and Behavioral Sciences',
  'College of Health and Medical Sciences',
  'College of Law',
  'College of Natural and Computational Sciences',
  'College of Social Sciences and Humanities',
  'College of Veterinary Medicine',
];

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'];

// ─────────────────────────────────────────────────────────────────────────────
const Members = () => {
  const { currentUser } = useAuth();

  const [members,        setMembers]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [roleFilter,     setRoleFilter]     = useState('all');
  const [sortField,      setSortField]      = useState('fullName');
  const [sortDir,        setSortDir]        = useState('asc');

  // modals
  const [viewModal,      setViewModal]      = useState(false);
  const [editModal,      setEditModal]      = useState(false);
  const [confirmModal,   setConfirmModal]   = useState(null); // { action, userId, label }
  const [selectedMember, setSelectedMember] = useState(null);

  // edit form
  const emptyEdit = { fullName: '', phone: '', department: '', yearOfStudy: '', college: '' };
  const [editForm,       setEditForm]       = useState(emptyEdit);
  const [editSaving,     setEditSaving]     = useState(false);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // ── filter + sort ─────────────────────────────────────────────────────────
  const filtered = members
    .filter(m => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        m.fullName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.universityId?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchesRole   = roleFilter   === 'all' || m.role   === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      const av = (a[sortField] || '').toString().toLowerCase();
      const bv = (b[sortField] || '').toString().toLowerCase();
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) =>
    sortField === field
      ? sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />
      : null;

  // ── actions ───────────────────────────────────────────────────────────────
  const doUpdate = async (userId, data, successMsg) => {
    try {
      await updateDoc(doc(db, 'users', userId), { ...data, updatedAt: serverTimestamp() });
      toast.success(successMsg);
      fetchMembers();
    } catch (err) {
      console.error(err);
      toast.error('Action failed. Please try again.');
    }
  };

  const handleConfirmedAction = async () => {
    if (!confirmModal) return;
    const { action, userId } = confirmModal;
    setConfirmModal(null);
    if (action === 'approve')    await doUpdate(userId, { status: 'active' },      'Member approved ✓');
    if (action === 'reject')     await doUpdate(userId, { status: 'rejected' },    'Member rejected');
    if (action === 'deactivate') await doUpdate(userId, { status: 'deactivated' }, 'Member deactivated');
    if (action === 'reactivate') await doUpdate(userId, { status: 'active' },      'Member reactivated ✓');
    if (action === 'makeAdmin')  await doUpdate(userId, { role: 'admin', status: 'active' }, 'Promoted to admin ✓');
    if (action === 'removeAdmin')await doUpdate(userId, { role: 'student' },       'Admin access removed');
  };

  const confirm = (action, member, label) =>
    setConfirmModal({ action, userId: member.id, memberName: member.fullName, label });

  // ── view detail ────────────────────────────────────────────────────────────
  const openView = (member) => { setSelectedMember(member); setViewModal(true); };

  // ── edit ─────────────────────────────────────────────────────────────────
  const openEdit = (member) => {
    setSelectedMember(member);
    setEditForm({
      fullName:    member.fullName    || '',
      phone:       member.phone       || '',
      department:  member.department  || '',
      yearOfStudy: member.yearOfStudy || '',
      college:     member.college     || '',
    });
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.fullName.trim()) { toast.error('Full name is required'); return; }
    setEditSaving(true);
    try {
      await updateDoc(doc(db, 'users', selectedMember.id), {
        fullName:    editForm.fullName.trim(),
        phone:       editForm.phone.trim(),
        department:  editForm.department.trim(),
        yearOfStudy: editForm.yearOfStudy,
        college:     editForm.college,
        updatedAt:   serverTimestamp(),
      });
      toast.success('Member information updated ✓');
      setEditModal(false);
      fetchMembers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes');
    } finally {
      setEditSaving(false);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ── stats ──────────────────────────────────────────────────────────────────
  const counts = {
    total:       members.length,
    active:      members.filter(m => m.status === 'active').length,
    pending:     members.filter(m => m.status === 'pending').length,
    deactivated: members.filter(m => m.status === 'deactivated' || m.status === 'rejected').length,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Member Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.total} total · {counts.active} active · {counts.pending} pending
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          💡 New members register via the public <strong>/register</strong> page
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Members',    value: counts.total,       color: 'blue'   },
          { label: 'Active',           value: counts.active,      color: 'green'  },
          { label: 'Pending Approval', value: counts.pending,     color: 'yellow' },
          { label: 'Deactivated',      value: counts.deactivated, color: 'gray'   },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, ID or department…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-9 py-2"
            />
          </div>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input-field py-2 w-full sm:w-40"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="deactivated">Deactivated</option>
          </select>
          {/* Role filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="input-field py-2 w-full sm:w-36"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="student">Student</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          <p className="text-gray-500 mt-4">Loading members…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-500">
            {searchQuery || statusFilter !== 'all' || roleFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'No members have registered yet.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                    onClick={() => toggleSort('fullName')}>
                    Name <SortIcon field="fullName" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                    onClick={() => toggleSort('universityId')}>
                    ID / Department <SortIcon field="universityId" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                    onClick={() => toggleSort('status')}>
                    Status <SortIcon field="status" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                    onClick={() => toggleSort('createdAt')}>
                    Joined <SortIcon field="createdAt" />
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{member.fullName}</p>
                      <p className="text-gray-500 text-xs">{member.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p className="font-mono text-xs">{member.universityId || '—'}</p>
                      <p className="text-xs text-gray-400">{member.department || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={member.status} />
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={member.role} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <ActionButtons
                        member={member}
                        currentUid={currentUser?.uid}
                        onView={openView}
                        onEdit={openEdit}
                        onConfirm={confirm}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map(member => (
              <div key={member.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{member.fullName}</p>
                    <p className="text-xs text-gray-500">{member.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{member.universityId} · {member.department}</p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <StatusBadge status={member.status} />
                    <RoleBadge role={member.role} />
                  </div>
                </div>
                <ActionButtons
                  member={member}
                  currentUid={currentUser?.uid}
                  onView={openView}
                  onEdit={openEdit}
                  onConfirm={confirm}
                />
              </div>
            ))}
          </div>

          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Showing {filtered.length} of {members.length} members
          </div>
        </div>
      )}

      {/* ── VIEW MEMBER MODAL ── */}
      {viewModal && selectedMember && (
        <Modal title="Member Details" onClose={() => setViewModal(false)} size="md">
          <div className="space-y-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-primary-600">
                  {selectedMember.fullName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedMember.fullName}</h3>
                <p className="text-gray-500 text-sm">{selectedMember.email}</p>
                <div className="flex gap-2 mt-1">
                  <StatusBadge status={selectedMember.status} />
                  <RoleBadge role={selectedMember.role} />
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: GraduationCap, label: 'University ID',  value: selectedMember.universityId },
                { icon: Phone,         label: 'Phone',          value: selectedMember.phone         },
                { icon: GraduationCap, label: 'College',        value: selectedMember.college       },
                { icon: GraduationCap, label: 'Department',     value: selectedMember.department    },
                { icon: Calendar,      label: 'Year of Study',  value: selectedMember.yearOfStudy   },
                { icon: Calendar,      label: 'Member Since',   value: formatDate(selectedMember.createdAt) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setViewModal(false); openEdit(selectedMember); }}
                className="btn-primary flex items-center gap-2 flex-1">
                <Edit2 className="h-4 w-4" /> Edit Member
              </button>
              <button onClick={() => setViewModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── EDIT MEMBER MODAL ── */}
      {editModal && selectedMember && (
        <Modal title={`Edit — ${selectedMember.fullName}`} onClose={() => setEditModal(false)} size="md">
          <form onSubmit={saveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" required
                value={editForm.fullName}
                onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="tel"
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                className="input-field" placeholder="+251-9-12345678" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
              <select
                value={editForm.college}
                onChange={e => setEditForm({ ...editForm, college: e.target.value })}
                className="input-field">
                <option value="">Select college</option>
                {COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text"
                value={editForm.department}
                onChange={e => setEditForm({ ...editForm, department: e.target.value })}
                className="input-field" placeholder="e.g. Computer Science" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study</label>
              <select
                value={editForm.yearOfStudy}
                onChange={e => setEditForm({ ...editForm, yearOfStudy: e.target.value })}
                className="input-field">
                <option value="">Select year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Read-only fields notice */}
            <p className="text-xs text-gray-400 bg-gray-50 rounded p-2">
              Email and University ID cannot be changed here. University ID is set at registration.
            </p>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={editSaving}
                className="btn-primary flex items-center gap-2 flex-1 disabled:opacity-50">
                <Save className="h-4 w-4" />
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setEditModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── CONFIRM ACTION MODAL ── */}
      {confirmModal && (
        <Modal title="Confirm Action" onClose={() => setConfirmModal(null)} size="sm">
          <div className="flex items-start gap-3 mb-6">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-900 font-medium">{confirmModal.label}</p>
              <p className="text-gray-500 text-sm mt-1">
                Applies to: <strong>{confirmModal.memberName}</strong>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleConfirmedAction}
              className="btn-primary flex-1">
              Confirm
            </button>
            <button onClick={() => setConfirmModal(null)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex-1">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ── Action buttons component ──────────────────────────────────────────────────
const ActionButtons = ({ member, currentUid, onView, onEdit, onConfirm }) => {
  const isSelf = member.id === currentUid;

  return (
    <div className="flex flex-wrap gap-1">
      {/* View */}
      <button onClick={() => onView(member)}
        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs transition-colors">
        <Eye className="h-3 w-3" /> View
      </button>

      {/* Edit */}
      <button onClick={() => onEdit(member)}
        className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs transition-colors">
        <Edit2 className="h-3 w-3" /> Edit
      </button>

      {/* Approve */}
      {member.status === 'pending' && (
        <button
          onClick={() => onConfirm('approve', member, 'Approve this member and grant access?')}
          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors">
          Approve
        </button>
      )}

      {/* Reject */}
      {member.status === 'pending' && (
        <button
          onClick={() => onConfirm('reject', member, 'Reject this membership application?')}
          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs transition-colors">
          Reject
        </button>
      )}

      {/* Deactivate active members */}
      {member.status === 'active' && !isSelf && (
        <button
          onClick={() => onConfirm('deactivate', member, 'Deactivate this membership? The member will lose access.')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors">
          Deactivate
        </button>
      )}

      {/* Reactivate deactivated/rejected members */}
      {(member.status === 'deactivated' || member.status === 'rejected') && (
        <button
          onClick={() => onConfirm('reactivate', member, 'Reactivate this membership and restore access?')}
          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs transition-colors">
          Reactivate
        </button>
      )}

      {/* Make admin */}
      {member.role !== 'admin' && member.status === 'active' && (
        <button
          onClick={() => onConfirm('makeAdmin', member, 'Grant full admin access to this member?')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs transition-colors">
          Make Admin
        </button>
      )}

      {/* Remove admin */}
      {member.role === 'admin' && !isSelf && (
        <button
          onClick={() => onConfirm('removeAdmin', member, 'Remove admin access from this member?')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs transition-colors">
          Remove Admin
        </button>
      )}

      {/* Self indicator */}
      {isSelf && (
        <span className="text-xs text-gray-400 italic px-2 py-1">You</span>
      )}
    </div>
  );
};

export default Members;
