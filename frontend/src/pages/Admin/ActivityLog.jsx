import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Search, RefreshCw, User, Calendar } from 'lucide-react';
import {
  collection, getDocs, query, orderBy, limit
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';

// ── Action category colours ───────────────────────────────────────────────────
const getActionStyle = (action = '') => {
  if (action.startsWith('member.'))        return 'bg-blue-100   text-blue-800';
  if (action.startsWith('leadership.'))    return 'bg-amber-100  text-amber-800';
  if (action.startsWith('event.'))         return 'bg-green-100  text-green-800';
  if (action.startsWith('post.'))          return 'bg-purple-100 text-purple-800';
  if (action.startsWith('announcement.'))  return 'bg-pink-100   text-pink-800';
  return 'bg-gray-100 text-gray-700';
};

const getActionCategory = (action = '') => {
  if (action.startsWith('member.'))        return 'Member';
  if (action.startsWith('leadership.'))    return 'Leadership';
  if (action.startsWith('event.'))         return 'Event';
  if (action.startsWith('post.'))          return 'Article';
  if (action.startsWith('announcement.'))  return 'Announcement';
  return 'Other';
};

// ─────────────────────────────────────────────────────────────────────────────
const ActivityLog = () => {
  const [logs,          setLogs]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [categoryFilter,setCategoryFilter]= useState('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch latest 200 logs — enough for a small club admin
      const snap = await getDocs(
        query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(200))
      );
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      if (err.code === 'permission-denied') {
        toast.error('You do not have permission to view activity logs');
      } else {
        toast.error('Failed to load activity logs');
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── filter ────────────────────────────────────────────────────────────────
  const filtered = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      log.label?.toLowerCase().includes(q) ||
      log.actorName?.toLowerCase().includes(q) ||
      log.action?.toLowerCase().includes(q) ||
      log.recordType?.toLowerCase().includes(q);

    const cat = getActionCategory(log.action);
    const matchesCat = categoryFilter === 'all' || cat === categoryFilter;

    return matchesSearch && matchesCat;
  });

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const categories = ['all', 'Member', 'Leadership', 'Event', 'Article', 'Announcement'];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Activity Log</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Administrative actions audit trail · {logs.length} records (latest 200)
          </p>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors self-start">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Security note */}
      <div className="card p-3 mb-4 bg-green-50 border border-green-200">
        <p className="text-xs text-green-800">
          🔒 Logs are <strong>append-only</strong> — they cannot be edited or deleted.
          Each entry records who performed the action, what was changed, and when.
        </p>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action, actor, or description…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-9 py-2"
            />
          </div>
          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input-field py-2 w-full sm:w-44">
            {categories.map(c => (
              <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          <p className="text-gray-500 mt-4">Loading activity log…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Activity className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity recorded yet</h3>
          <p className="text-gray-500">
            {logs.length === 0
              ? 'Administrative actions will appear here as they happen.'
              : 'No results match your search or filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">When</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actor</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Action Key</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(log.timestamp)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-gray-900 font-medium text-xs">
                          {log.actorName || log.actorId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionStyle(log.action)}`}>
                        {getActionCategory(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-xs truncate">
                      {log.label}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <code className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                        {log.action}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              Showing {filtered.length} of {logs.length} records
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map(log => (
              <div key={log.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getActionStyle(log.action)}`}>
                    {getActionCategory(log.action)}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(log.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-900 mb-1">{log.label}</p>
                <p className="text-xs text-gray-500">by {log.actorName || log.actorId}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ActivityLog;
