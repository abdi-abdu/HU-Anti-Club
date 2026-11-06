import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Edit2, X, Save,
  ChevronDown, ChevronUp,
  GraduationCap, Calendar, AlertTriangle, Eye, Award, Download
} from 'lucide-react';
import {
  collection, getDocs, doc,
  serverTimestamp, query, orderBy, where, writeBatch
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { POSITIONS } from './Leadership';
import { logAction, LOG } from '../../services/activityLog';
import { updateStats } from '../../services/stats';
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

// ── Badges ────────────────────────────────────────────────────────────────────
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

// Website access role (admin / student) — purple / blue
const RoleBadge = ({ role }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
    role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
  }`}>
    {role === 'admin' ? '⚙ Admin' : 'Student'}
  </span>
);

// Club position badge (President / VP / Secretary) — amber
const PositionBadge = ({ positionId }) => {
  if (!positionId) return <span className="text-xs text-gray-400">—</span>;
  const label = POSITIONS.find(p => p.id === positionId)?.label || positionId;
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
      {label}
    </span>
  );
};

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── CSV Export Utility ────────────────────────────────────────────────────────
/**
 * Escapes a field value for CSV format.
 * Handles quotes, commas, newlines, ensures UTF-8 compatibility,
 * and prevents CSV formula injection.
 */
const escapeCsvField = (value) => {
  if (value === null || value === undefined || value === '') return '';
  let str = String(value);

  // Prevent CSV formula injection: escape values starting with =, +, -, @
  const dangerousChars = ['=', '+', '-', '@'];
  if (dangerousChars.includes(str.charAt(0))) {
    str = "'" + str; // Prefix with single quote to neutralize formula
  }

  // If the field contains comma, double quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Converts an array of objects to CSV string.
 */
const convertToCSV = (data, columns) => {
  const headers = columns.map(col => escapeCsvField(col.header)).join(',');
  const rows = data.map(row =>
    columns.map(col => escapeCsvField(col.accessor(row))).join(',')
  );
  return [headers, ...rows].join('\n');
};

/**
 * Triggers browser download of CSV file.
 */
const downloadCSV = (csvContent, filename) => {
  // Add UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────────────────────────
const Members = () => {
  const { currentUser } = useAuth();
  const perms = usePermissions();

  const [members,        setMembers]        = useState([]);
  // map: memberId → current active position id
  const [positionMap,    setPositionMap]    = useState({});
  const [loading,        setLoading]        = useState(true);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [roleFilter,     setRoleFilter]     = useState('all');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortField,      setSortField]      = useState('fullName');
  const [sortDir,        setSortDir]        = useState('asc');

  // modals
  const [viewModal,      setViewModal]      = useState(false);
  const [editModal,      setEditModal]      = useState(false);
  const [confirmModal,   setConfirmModal]   = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  // edit form
  const emptyEdit = { fullName: '', phone: '', department: '', yearOfStudy: '', college: '' };
  const [editForm,   setEditForm]   = useState(emptyEdit);
  const [editSaving, setEditSaving] = useState(false);

  // CSV export state
  const [exportDepartment, setExportDepartment] = useState('all');
  const [exporting, setExporting] = useState(false);

  // ── fetch members + active leadership ────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Admin uses users (full data, includes admin accounts)
      // Officers use memberProfiles filtered to club members only (excludes admin accounts)
      const baseQuery = perms.isAdmin
        ? query(collection(db, 'users'), orderBy('createdAt', 'desc'))
        : query(
            collection(db, 'memberProfiles'),
            where('role', '==', 'student'),
            orderBy('createdAt', 'desc')
          );

      // Fetch members first (primary query)
      let membersSnap;
      try {
        membersSnap = await getDocs(baseQuery);
      } catch (memberErr) {
        console.error('Members query error:', memberErr.code, memberErr.message);
        // Fallback without orderBy
        if (perms.isAdmin) {
          membersSnap = await getDocs(collection(db, 'users'));
        } else {
          membersSnap = await getDocs(
            query(collection(db, 'memberProfiles'), where('role', '==', 'student'))
          );
        }
        // Sort in JavaScript since orderBy failed
        const membersList = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        membersList.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
          return bTime - aTime;
        });
        setMembers(membersList);
      }

      if (membersSnap && !membersSnap.empty) {
        const membersList = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMembers(membersList);
      }

      // Fetch leadership data independently (position map is optional)
      try {
        const leadershipSnap = await getDocs(
          query(collection(db, 'leadership'), where('status', '==', 'active'))
        );
        const pMap = {};
        leadershipSnap.docs.forEach(d => {
          const { memberId, position } = d.data();
          if (memberId && position) pMap[memberId] = position;
        });
        setPositionMap(pMap);
      } catch (leaderErr) {
        console.error('Leadership query error:', leaderErr.code, leaderErr.message);
        // Leadership query failed, but members already loaded
        // Position badges will show '—' which is acceptable
        setPositionMap({});
      }
    } catch (err) {
      console.error('Fatal members fetch error:', err.code, err.message);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [perms.isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── CSV Export Function ───────────────────────────────────────────────────
  const handleExportCSV = async () => {
    // Enforce permission check
    if (!perms.canViewMembers) {
      toast.error('You do not have permission to export members');
      return;
    }

    setExporting(true);
    try {
      // Fetch active members from memberProfiles collection (non-private data)
      // Filter to club members only (excludes admin accounts)
      const q = query(
        collection(db, 'memberProfiles'),
        where('role', '==', 'student'),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error('No active members to export');
        setExporting(false);
        return;
      }

      // Convert Firestore documents to array
      let profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter by department if selected
      if (exportDepartment !== 'all') {
        profiles = profiles.filter(p => p.department === exportDepartment);
      }

      if (profiles.length === 0) {
        toast.error(`No active members found${exportDepartment !== 'all' ? ' in selected department' : ''}`);
        setExporting(false);
        return;
      }

      // Sort alphabetically by full name in JavaScript
      profiles.sort((a, b) => {
        const nameA = (a.fullName || '').toLowerCase();
        const nameB = (b.fullName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      // Define CSV columns (excluding email, phone, Firebase UID, website role)
      const columns = [
        { header: 'Full Name', accessor: (row) => row.fullName || '' },
        { header: 'University ID', accessor: (row) => row.universityId || '' },
        { header: 'College', accessor: (row) => row.college || '' },
        { header: 'Department', accessor: (row) => row.department || '' },
        { header: 'Year of Study', accessor: (row) => row.yearOfStudy || '' },
        {
          header: 'Registration Date',
          accessor: (row) => {
            if (!row.createdAt) return '';
            const date = row.createdAt.toDate ? row.createdAt.toDate() : new Date(row.createdAt);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          }
        },
      ];

      // Generate CSV content
      const csvContent = convertToCSV(profiles, columns);

      // Generate filename with current date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `active-members-${today}.csv`;

      // Trigger download
      downloadCSV(csvContent, filename);

      toast.success(`Exported ${profiles.length} active member${profiles.length !== 1 ? 's' : ''} ✓`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export members. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Get unique departments from active members for the export filter
  const activeDepartments = [...new Set(
    members
      .filter(m => m.status === 'active' && m.department)
      .map(m => m.department)
  )].sort();

  // ── filter + sort ─────────────────────────────────────────────────────────
  const filtered = members
    .filter(m => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        m.fullName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.universityId?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q);
      const matchesStatus   = statusFilter   === 'all' || m.status === statusFilter;
      const matchesRole     = roleFilter     === 'all' || m.role   === roleFilter;
      const memberPosition  = positionMap[m.id] || null;
      const matchesPosition = positionFilter === 'all'
        ? true
        : positionFilter === 'none'
          ? !memberPosition
          : memberPosition === positionFilter;
      return matchesSearch && matchesStatus && matchesRole && matchesPosition;
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
      ? sortDir === 'asc'
        ? <ChevronUp className="h-3 w-3 inline ml-1" />
        : <ChevronDown className="h-3 w-3 inline ml-1" />
      : null;

  // ── Firestore actions ─────────────────────────────────────────────────────
  const doUpdate = async (userId, data, successMsg) => {
    try {
      // Update both users and memberProfiles atomically
      const batch = writeBatch(db);

      batch.update(doc(db, 'users', userId), {
        ...data,
        updatedAt: serverTimestamp()
      });

      // Sync non-private fields to memberProfiles
      const profileData = {};
      if (data.status !== undefined) profileData.status = data.status;
      if (data.role !== undefined) profileData.role = data.role;
      if (Object.keys(profileData).length > 0) {
        profileData.updatedAt = serverTimestamp();
        batch.set(doc(db, 'memberProfiles', userId), profileData, { merge: true });
      }

      await batch.commit();
      toast.success(successMsg);

      // Update stats if status changed to/from active
      if (data.status !== undefined) {
        const activeCount = members.filter(m =>
          m.id === userId ? data.status === 'active' : m.status === 'active'
        ).length;
        await updateStats({ activeMemberCount: activeCount });
      }

      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Action failed. Please try again.');
    }
  };

  const handleConfirmedAction = async () => {
    if (!confirmModal) return;
    const { action, userId } = confirmModal;
    const targetName = confirmModal.memberName;
    setConfirmModal(null);

    const actionMap = {
      approve:     [{ status: 'active' },      'Member approved ✓',          LOG.MEMBER_APPROVED,    `Approved member: ${targetName}`],
      reject:      [{ status: 'rejected' },    'Member rejected',            LOG.MEMBER_REJECTED,    `Rejected member: ${targetName}`],
      deactivate:  [{ status: 'deactivated' }, 'Member deactivated',         LOG.MEMBER_DEACTIVATED, `Deactivated member: ${targetName}`],
      reactivate:  [{ status: 'active' },      'Member reactivated ✓',       LOG.MEMBER_REACTIVATED, `Reactivated member: ${targetName}`],
      makeAdmin:   [{ role: 'admin', status: 'active' }, 'Promoted to admin ✓', LOG.MEMBER_MAKE_ADMIN,  `Granted admin access to: ${targetName}`],
      removeAdmin: [{ role: 'student' },       'Admin access removed',       LOG.MEMBER_REMOVE_ADMIN,`Removed admin access from: ${targetName}`],
    };

    const entry = actionMap[action];
    if (!entry) return;
    const [data, msg, logKey, logLabel] = entry;

    await doUpdate(userId, data, msg);
    await logAction(currentUser, logKey, 'user', userId, logLabel);
  };

  const confirm = (action, member, label) =>
    setConfirmModal({ action, userId: member.id, memberName: member.fullName, label });

  // ── modals ────────────────────────────────────────────────────────────────
  const openView = (member) => { setSelectedMember(member); setViewModal(true); };

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
      // Update both users (with phone) and memberProfiles (without phone) atomically
      const batch = writeBatch(db);

      batch.update(doc(db, 'users', selectedMember.id), {
        fullName:    editForm.fullName.trim(),
        phone:       editForm.phone.trim(),
        department:  editForm.department.trim(),
        yearOfStudy: editForm.yearOfStudy,
        college:     editForm.college,
        updatedAt:   serverTimestamp(),
      });

      // Sync non-private fields to memberProfiles (phone excluded)
      batch.set(doc(db, 'memberProfiles', selectedMember.id), {
        fullName:    editForm.fullName.trim(),
        department:  editForm.department.trim(),
        yearOfStudy: editForm.yearOfStudy,
        college:     editForm.college,
        updatedAt:   serverTimestamp(),
      }, { merge: true });

      await batch.commit();
      toast.success('Member information updated ✓');
      await logAction(currentUser, LOG.MEMBER_EDITED, 'user', selectedMember.id,
        `Edited profile of: ${selectedMember.fullName}`);
      setEditModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save changes');
    } finally { setEditSaving(false); }
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
    officials:   Object.keys(positionMap).length,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Member Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.total} total · {counts.active} active · {counts.pending} pending · {counts.officials} officials
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 max-w-xs">
          💡 New members register via <strong>/register</strong>. Assign club positions via <strong>Leadership</strong>.
        </div>
      </div>

      {/* Concept clarification banner */}
      <div className="card p-4 mb-4 bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-3">
          <Award className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900">Two separate concepts</p>
            <p className="text-amber-700 mt-0.5">
              <strong>Website Role</strong> (Admin / Student) controls dashboard access. &nbsp;|&nbsp;
              <strong>Club Position</strong> (Supervisor / President / VP / Secretary) is the official club appointment —
              managed in the <strong>Leadership</strong> section.
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Members',    value: counts.total,       color: 'blue'   },
          { label: 'Active',           value: counts.active,      color: 'green'  },
          { label: 'Pending Approval', value: counts.pending,     color: 'yellow' },
          { label: 'Club Officials',   value: counts.officials,   color: 'amber'  },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
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
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input-field py-2 w-full sm:w-40">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="deactivated">Deactivated</option>
          </select>
          {/* Website role filter */}
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="input-field py-2 w-full sm:w-40">
            <option value="all">All Web Roles</option>
            <option value="admin">Admin (website)</option>
            <option value="student">Student (website)</option>
          </select>
          {/* Club position filter */}
          <select value={positionFilter} onChange={e => setPositionFilter(e.target.value)}
            className="input-field py-2 w-full sm:w-44">
            <option value="all">All Club Positions</option>
            {POSITIONS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
            <option value="none">No position</option>
          </select>
        </div>
      </div>

      {/* Export Active Members */}
      {perms.canViewMembers && (
        <div className="card p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary-600" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Export Active Members</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Download CSV with {counts.active} active member{counts.active !== 1 ? 's' : ''} (name, ID, college, department, year, registration date)
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={exportDepartment}
                onChange={e => setExportDepartment(e.target.value)}
                className="input-field py-2 w-full sm:w-56"
                disabled={exporting}
              >
                <option value="all">All Departments ({counts.active})</option>
                {activeDepartments.map(dept => {
                  const count = members.filter(m => m.status === 'active' && m.department === dept).length;
                  return (
                    <option key={dept} value={dept}>
                      {dept} ({count})
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleExportCSV}
                disabled={exporting || counts.active === 0}
                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting…' : 'Download CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {searchQuery || statusFilter !== 'all' || roleFilter !== 'all' || positionFilter !== 'all'
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Web Role
                    <span className="ml-1 text-gray-400 font-normal text-xs">(access)</span>
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Club Position
                    <span className="ml-1 text-gray-400 font-normal text-xs">(appointment)</span>
                  </th>
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
                    <td className="px-4 py-3">
                      <PositionBadge positionId={positionMap[member.id]} />
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
                        perms={perms}
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
                    {positionMap[member.id] && (
                      <PositionBadge positionId={positionMap[member.id]} />
                    )}
                  </div>
                </div>
                <ActionButtons
                  member={member}
                  currentUid={currentUser?.uid}
                  onView={openView}
                  onEdit={openEdit}
                  onConfirm={confirm}
                  perms={perms}
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
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-primary-600">
                  {selectedMember.fullName?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedMember.fullName}</h3>
                <p className="text-gray-500 text-sm">{selectedMember.email}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <StatusBadge status={selectedMember.status} />
                  <RoleBadge role={selectedMember.role} />
                  {positionMap[selectedMember.id] && (
                    <PositionBadge positionId={positionMap[selectedMember.id]} />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: GraduationCap, label: 'University ID',  value: selectedMember.universityId },
                { icon: GraduationCap, label: 'Phone',          value: selectedMember.phone         },
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

            {/* Club position note */}
            {positionMap[selectedMember.id] && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Award className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Currently serving as <strong>
                    {POSITIONS.find(p => p.id === positionMap[selectedMember.id])?.label}
                  </strong>.
                  Manage this in the <strong>Leadership</strong> section.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => { setViewModal(false); openEdit(selectedMember); }}
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
              <select value={editForm.college}
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
              <select value={editForm.yearOfStudy}
                onChange={e => setEditForm({ ...editForm, yearOfStudy: e.target.value })}
                className="input-field">
                <option value="">Select year</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-400 bg-gray-50 rounded p-2">
              Email and University ID cannot be changed. To assign a club position (President/VP/Secretary),
              use the <strong>Leadership</strong> section.
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
            <button onClick={handleConfirmedAction} className="btn-primary flex-1">Confirm</button>
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

// ── Action buttons ────────────────────────────────────────────────────────────
const ActionButtons = ({ member, currentUid, onView, onEdit, onConfirm, perms }) => {
  const isSelf = member.id === currentUid;
  return (
    <div className="flex flex-wrap gap-1">
      <button onClick={() => onView(member)}
        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs transition-colors">
        <Eye className="h-3 w-3" /> View
      </button>
      {perms.canEditMembers && (
      <button onClick={() => onEdit(member)}
        className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs transition-colors">
        <Edit2 className="h-3 w-3" /> Edit
      </button>
      )}
      {perms.canEditMembers && member.status === 'pending' && (
        <button onClick={() => onConfirm('approve', member, 'Approve this member and grant access?')}
          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">Approve</button>
      )}
      {perms.canEditMembers && member.status === 'pending' && (
        <button onClick={() => onConfirm('reject', member, 'Reject this membership application?')}
          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">Reject</button>
      )}
      {perms.canDeactivateMembers && member.status === 'active' && !isSelf && (
        <button onClick={() => onConfirm('deactivate', member, 'Deactivate this membership?')}
          className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">Deactivate</button>
      )}
      {perms.canDeactivateMembers && (member.status === 'deactivated' || member.status === 'rejected') && (
        <button onClick={() => onConfirm('reactivate', member, 'Reactivate this membership?')}
          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">Reactivate</button>
      )}
      {perms.canManageAdminRole && member.role !== 'admin' && member.status === 'active' && (
        <button onClick={() => onConfirm('makeAdmin', member, 'Grant full admin access to this member?')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs">Make Admin</button>
      )}
      {perms.canManageAdminRole && member.role === 'admin' && !isSelf && (
        <button onClick={() => onConfirm('removeAdmin', member, 'Remove admin access from this member?')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs">Remove Admin</button>
      )}
      {isSelf && (
        <span className="text-xs text-gray-400 italic px-2 py-1">You</span>
      )}
    </div>
  );
};

export default Members;
