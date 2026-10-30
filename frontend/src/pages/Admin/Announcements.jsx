import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Plus, Edit2, Trash2, X, Save,
  Eye, EyeOff, AlertTriangle, Calendar
} from 'lucide-react';
import {
  collection, getDocs, doc, addDoc, updateDoc,
  deleteDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ── Announcement types ────────────────────────────────────────────────────────
const ANNOUNCEMENT_TYPES = [
  { id: 'general',   label: 'General',         color: 'bg-blue-100   text-blue-800'   },
  { id: 'urgent',    label: 'Urgent',           color: 'bg-red-100    text-red-800'    },
  { id: 'event',     label: 'Event Notice',     color: 'bg-green-100  text-green-800'  },
  { id: 'academic',  label: 'Academic',         color: 'bg-purple-100 text-purple-800' },
  { id: 'community', label: 'Community',        color: 'bg-amber-100  text-amber-800'  },
];

export const getTypeConfig = (typeId) =>
  ANNOUNCEMENT_TYPES.find(t => t.id === typeId) || ANNOUNCEMENT_TYPES[0];

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, size = 'md' }) => {
  const widths = { sm: 'max-w-md', md: 'max-w-2xl' };
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
const Announcements = () => {
  const { currentUser } = useAuth();

  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [modal,        setModal]        = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [confirmDel,   setConfirmDel]   = useState(null);
  const [saving,       setSaving]       = useState(false);

  const emptyForm = {
    title:     '',
    message:   '',
    type:      'general',
    published: false,
  };
  const [form, setForm] = useState(emptyForm);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'announcements'), orderBy('createdAt', 'desc'))
      );
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load announcements');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // ── filtered ──────────────────────────────────────────────────────────────
  const filtered = filterStatus === 'all'
    ? items
    : items.filter(a => filterStatus === 'published' ? a.published : !a.published);

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── open create / edit ────────────────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(emptyForm); setModal(true); };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      title:     item.title     || '',
      message:   item.message   || '',
      type:      item.type      || 'general',
      published: item.published || false,
    });
    setModal(true);
  };

  // ── save ──────────────────────────────────────────────────────────────────
  const saveItem = async (e) => {
    e.preventDefault();
    if (!form.title.trim())   { toast.error('Title is required');   return; }
    if (!form.message.trim()) { toast.error('Message is required'); return; }

    setSaving(true);
    try {
      const payload = {
        title:     form.title.trim(),
        message:   form.message.trim(),
        type:      form.type,
        published: form.published,
        updatedAt: serverTimestamp(),
      };

      if (editing) {
        // Track publish time if being published for the first time
        if (form.published && !editing.published) {
          payload.publishedAt = serverTimestamp();
        }
        await updateDoc(doc(db, 'announcements', editing.id), payload);
        toast.success('Announcement updated ✓');
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...payload,
          createdBy:   currentUser.uid,
          createdAt:   serverTimestamp(),
          publishedAt: form.published ? serverTimestamp() : null,
        });
        toast.success(form.published ? 'Announcement published ✓' : 'Draft saved ✓');
      }
      setModal(false);
      fetchItems();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save announcement');
    } finally { setSaving(false); }
  };

  // ── quick toggle publish ──────────────────────────────────────────────────
  const togglePublish = async (item) => {
    const newPublished = !item.published;
    try {
      await updateDoc(doc(db, 'announcements', item.id), {
        published:   newPublished,
        publishedAt: newPublished ? serverTimestamp() : item.publishedAt || null,
        updatedAt:   serverTimestamp(),
      });
      toast.success(newPublished ? 'Announcement published ✓' : 'Announcement unpublished');
      fetchItems();
    } catch { toast.error('Failed to update'); }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteDoc(doc(db, 'announcements', confirmDel.id));
      toast.success('Announcement deleted');
      setConfirmDel(null);
      fetchItems();
    } catch { toast.error('Failed to delete'); }
  };

  const counts = {
    total:     items.length,
    published: items.filter(a => a.published).length,
    drafts:    items.filter(a => !a.published).length,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Announcements</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.total} total · {counts.published} published · {counts.drafts} drafts
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total',     value: counts.total,     color: 'blue'  },
          { label: 'Published', value: counts.published, color: 'green' },
          { label: 'Drafts',    value: counts.drafts,    color: 'gray'  },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { value: 'all',       label: 'All'       },
          { value: 'published', label: 'Published' },
          { value: 'drafts',    label: 'Drafts'    },
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

      {/* List */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">
            {filterStatus === 'all' ? 'No announcements yet.' : `No ${filterStatus} announcements.`}
          </p>
          <button onClick={openCreate} className="btn-primary">Create First Announcement</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const typeCfg = getTypeConfig(item.type);
            return (
              <div key={item.id} className={`card p-5 ${!item.published ? 'opacity-75' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Type badge + status */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeCfg.color}`}>
                        {typeCfg.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.published ? '🌐 Published' : '📝 Draft'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {item.published && item.publishedAt
                          ? `Published ${formatDate(item.publishedAt)}`
                          : `Created ${formatDate(item.createdAt)}`
                        }
                      </span>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{item.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{item.message}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(item)}
                      className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1.5 rounded text-xs transition-colors">
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => togglePublish(item)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
                        item.published
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}>
                      {item.published
                        ? <><EyeOff className="h-3 w-3" /> Unpublish</>
                        : <><Eye className="h-3 w-3" /> Publish</>
                      }
                    </button>
                    <button onClick={() => setConfirmDel(item)}
                      className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded text-xs transition-colors">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {modal && (
        <Modal
          title={editing ? 'Edit Announcement' : 'New Announcement'}
          onClose={() => setModal(false)}
        >
          <form onSubmit={saveItem} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" required
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="input-field"
                placeholder="e.g. Important Notice for All Members" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <div className="flex flex-wrap gap-2">
                {ANNOUNCEMENT_TYPES.map(t => (
                  <label key={t.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border-2 transition-colors ${
                      form.type === t.id
                        ? `${t.color} border-current`
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}>
                    <input type="radio" name="type" value={t.id}
                      checked={form.type === t.id}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                      className="hidden" />
                    {t.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea required rows={5}
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                className="input-field resize-none"
                placeholder="Write the full announcement message here…" />
              <p className="text-xs text-gray-400 mt-1">{form.message.length} characters</p>
            </div>

            {/* Publish status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Publish immediately</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    When on, this announcement is visible to all website visitors.
                    When off, it's saved as a draft.
                  </p>
                </div>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, published: !f.published }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${
                    form.published ? 'bg-primary-600' : 'bg-gray-300'
                  }`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.published ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="btn-primary flex items-center gap-2 flex-1 disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : editing ? 'Update' : form.published ? 'Publish' : 'Save Draft'}
              </button>
              <button type="button" onClick={() => setModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── DELETE CONFIRM ── */}
      {confirmDel && (
        <Modal title="Delete Announcement" onClose={() => setConfirmDel(null)} size="sm">
          <div className="flex items-start gap-3 mb-6">
            <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Delete "{confirmDel.title}"?</p>
              <p className="text-sm text-gray-500 mt-1">This cannot be undone.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">
              Delete
            </button>
            <button onClick={() => setConfirmDel(null)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Announcements;
