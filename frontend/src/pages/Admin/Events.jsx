import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Plus, Edit2, Trash2, X, Save,
  Eye, EyeOff, MapPin, Clock, Users, AlertTriangle, Ban
} from 'lucide-react';
import {
  collection, getDocs, doc, addDoc, updateDoc,
  deleteDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ── Event types ───────────────────────────────────────────────────────────────
export const EVENT_TYPES = [
  { id: 'awareness',  label: 'Anti-Drug Awareness Campaign' },
  { id: 'seminar',    label: 'Educational Seminar'           },
  { id: 'workshop',   label: 'Drug-Prevention Workshop'      },
  { id: 'outreach',   label: 'Student Awareness Program'     },
  { id: 'meeting',    label: 'Club Meeting'                  },
  { id: 'other',      label: 'Other Activity'                },
];

// ── Event status config ───────────────────────────────────────────────────────
const STATUS_CONFIG = {
  published:   { label: 'Published',   bg: 'bg-green-100',  text: 'text-green-800'  },
  draft:       { label: 'Draft',       bg: 'bg-gray-100',   text: 'text-gray-600'   },
  cancelled:   { label: 'Cancelled',   bg: 'bg-red-100',    text: 'text-red-700'    },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, size = 'md' }) => {
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${widths[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const AdminEvents = () => {
  const { currentUser } = useAuth();

  const [events,      setEvents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterStatus,setFilterStatus]= useState('all');

  const [eventModal,  setEventModal]  = useState(false);
  const [editingEvent,setEditingEvent]= useState(null);
  const [regsModal,   setRegsModal]   = useState(false);
  const [regsEvent,   setRegsEvent]   = useState(null);
  const [regsData,    setRegsData]    = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [confirmModal,setConfirmModal]= useState(null);
  const [saving,      setSaving]      = useState(false);

  const emptyForm = {
    title: '', description: '', date: '', time: '',
    location: '', type: 'awareness', imageUrl: '', status: 'draft',
  };
  const [form, setForm] = useState(emptyForm);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc')));
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load events');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── filtered list ─────────────────────────────────────────────────────────
  const filtered = filterStatus === 'all'
    ? events
    : events.filter(e => (e.status || 'draft') === filterStatus);

  const formatDate = (val) => {
    if (!val) return '—';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const toDateStr = (val) => {
    if (!val) return '';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toISOString().split('T')[0];
  };

  const toTimeStr = (val) => {
    if (!val) return '';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toTimeString().slice(0, 5);
  };

  // ── open create / edit ────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setEventModal(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    setForm({
      title:       ev.title       || '',
      description: ev.description || '',
      date:        toDateStr(ev.date),
      time:        toTimeStr(ev.date),
      location:    ev.location    || '',
      type:        ev.type        || 'awareness',
      imageUrl:    ev.imageUrl    || '',
      status:      ev.status      || 'draft',
    });
    setEventModal(true);
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const saveEvent = async (e) => {
    e.preventDefault();
    if (!form.date) { toast.error('Date is required'); return; }
    setSaving(true);
    try {
      const dateTime = new Date(`${form.date}T${form.time || '00:00'}`);
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim(),
        date:        dateTime,
        location:    form.location.trim(),
        type:        form.type,
        imageUrl:    form.imageUrl.trim() || null,
        status:      form.status,
        updatedAt:   serverTimestamp(),
      };

      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), payload);
        toast.success('Event updated ✓');
      } else {
        await addDoc(collection(db, 'events'), {
          ...payload,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        toast.success(form.status === 'published' ? 'Event published ✓' : 'Event saved as draft ✓');
      }
      setEventModal(false);
      fetchEvents();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save event');
    } finally { setSaving(false); }
  };

  // ── quick status toggle ───────────────────────────────────────────────────
  const togglePublish = async (ev) => {
    const newStatus = (ev.status || 'draft') === 'published' ? 'draft' : 'published';
    try {
      await updateDoc(doc(db, 'events', ev.id), { status: newStatus, updatedAt: serverTimestamp() });
      toast.success(newStatus === 'published' ? 'Event published ✓' : 'Event unpublished');
      fetchEvents();
    } catch { toast.error('Failed to update status'); }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmModal) return;
    try {
      await deleteDoc(doc(db, 'events', confirmModal.id));
      toast.success('Event deleted');
      setConfirmModal(null);
      fetchEvents();
    } catch { toast.error('Failed to delete event'); }
  };

  // ── view registrations ────────────────────────────────────────────────────
  const viewRegistrations = async (ev) => {
    setRegsEvent(ev);
    setRegsModal(true);
    setRegsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'events', ev.id, 'registrations'));
      setRegsData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load registrations');
    } finally { setRegsLoading(false); }
  };

  const counts = {
    total:     events.length,
    published: events.filter(e => e.status === 'published').length,
    drafts:    events.filter(e => !e.status || e.status === 'draft').length,
    cancelled: events.filter(e => e.status === 'cancelled').length,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Events & Activities</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.total} total · {counts.published} published · {counts.drafts} drafts
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> Create Event
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',     value: counts.total,     color: 'blue'  },
          { label: 'Published', value: counts.published, color: 'green' },
          { label: 'Drafts',    value: counts.drafts,    color: 'gray'  },
          { label: 'Cancelled', value: counts.cancelled, color: 'red'   },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: 'all',       label: 'All'       },
          { value: 'published', label: 'Published' },
          { value: 'draft',     label: 'Drafts'    },
          { value: 'cancelled', label: 'Cancelled' },
        ].map(f => (
          <button key={f.value}
            onClick={() => setFilterStatus(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filterStatus === f.value
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:text-primary-600 border border-gray-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">
            {filterStatus === 'all' ? 'No events yet.' : `No ${filterStatus} events.`}
          </p>
          <button onClick={openCreate} className="btn-primary">Create First Event</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(ev => {
            const status = ev.status || 'draft';
            return (
              <div key={ev.id} className={`card p-5 ${status === 'cancelled' ? 'opacity-60' : ''}`}>
                {/* Title row */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusBadge status={status} />
                      {ev.type && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {EVENT_TYPES.find(t => t.id === ev.type)?.label || ev.type}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(ev)}
                      className="text-blue-600 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirmModal(ev)}
                      className="text-red-500 hover:text-red-600 p-1.5 rounded hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ev.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />{formatDate(ev.date)}
                  </span>
                  {ev.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{ev.location}
                    </span>
                  )}
                </div>

                {/* Action bar */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                  {/* Publish / Unpublish toggle */}
                  {status !== 'cancelled' && (
                    <button onClick={() => togglePublish(ev)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        status === 'published'
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}>
                      {status === 'published'
                        ? <><EyeOff className="h-3 w-3" /> Unpublish</>
                        : <><Eye className="h-3 w-3" /> Publish</>
                      }
                    </button>
                  )}

                  {/* Cancel */}
                  {status !== 'cancelled' && (
                    <button
                      onClick={async () => {
                        await updateDoc(doc(db, 'events', ev.id), { status: 'cancelled', updatedAt: serverTimestamp() });
                        toast.success('Event cancelled');
                        fetchEvents();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 transition-colors">
                      <Ban className="h-3 w-3" /> Cancel Event
                    </button>
                  )}

                  {/* Restore cancelled */}
                  {status === 'cancelled' && (
                    <button
                      onClick={async () => {
                        await updateDoc(doc(db, 'events', ev.id), { status: 'draft', updatedAt: serverTimestamp() });
                        toast.success('Event restored to draft');
                        fetchEvents();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors">
                      Restore to Draft
                    </button>
                  )}

                  {/* Registrations */}
                  <button onClick={() => viewRegistrations(ev)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-primary-50 hover:bg-primary-100 text-primary-700 transition-colors">
                    <Users className="h-3 w-3" /> Registrations
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {eventModal && (
        <Modal
          title={editingEvent ? 'Edit Event' : 'Create New Event'}
          onClose={() => setEventModal(false)}
          size="lg"
        >
          <form onSubmit={saveEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="input-field" placeholder="e.g. Drug Awareness Workshop" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type *</label>
              <select value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="input-field">
                {EVENT_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea required rows={4}
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className="input-field resize-none"
                placeholder="Describe the event, its purpose and what attendees can expect…" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" required
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time"
                  value={form.time}
                  onChange={e => setForm({ ...form, time: e.target.value })}
                  className="input-field" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <input type="text" required
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
                className="input-field" placeholder="e.g. Main Hall, Block A" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover Image URL <span className="text-gray-400">(optional)</span>
              </label>
              <input type="url"
                value={form.imageUrl}
                onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                className="input-field" placeholder="https://example.com/image.jpg" />
              <p className="text-xs text-gray-400 mt-1">Paste a public image URL. Leave blank for no image.</p>
              {form.imageUrl && (
                <img src={form.imageUrl} alt="preview"
                  className="mt-2 h-24 w-full object-cover rounded-lg border border-gray-200"
                  onError={e => e.target.style.display = 'none'} />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publication Status</label>
              <div className="flex gap-3">
                {[
                  { value: 'draft',     label: '📝 Save as Draft',   desc: 'Not visible to the public' },
                  { value: 'published', label: '🌐 Publish Now',      desc: 'Visible on the Events page' },
                ].map(opt => (
                  <label key={opt.value}
                    className={`flex-1 flex items-start gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      form.status === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <input type="radio" name="status" value={opt.value}
                      checked={form.status === opt.value}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                      className="mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="btn-primary flex items-center gap-2 flex-1 disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : editingEvent ? 'Update Event' : 'Save Event'}
              </button>
              <button type="button" onClick={() => setEventModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {confirmModal && (
        <Modal title="Delete Event" onClose={() => setConfirmModal(null)} size="sm">
          <div className="flex items-start gap-3 mb-6">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Delete "{confirmModal.title}"?</p>
              <p className="text-sm text-gray-500 mt-1">
                This will permanently delete the event and all its registrations. This cannot be undone.
                Consider cancelling instead to preserve records.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">
              Delete Permanently
            </button>
            <button onClick={() => setConfirmModal(null)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
              Keep Event
            </button>
          </div>
        </Modal>
      )}

      {/* ── REGISTRATIONS MODAL ── */}
      {regsModal && (
        <Modal
          title={`Registrations — ${regsEvent?.title}`}
          onClose={() => { setRegsModal(false); setRegsData([]); }}
          size="md"
        >
          {regsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          ) : regsData.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No registrations yet for this event</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {regsData.length} {regsData.length === 1 ? 'person has' : 'people have'} registered
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">#</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Email</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600 hidden sm:table-cell">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {regsData.map((r, i) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{r.fullName || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.email}</td>
                        <td className="px-3 py-2 text-gray-500 hidden sm:table-cell">{r.department || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default AdminEvents;
