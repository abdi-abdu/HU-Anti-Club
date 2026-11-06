import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users, Calendar, FileText, MessageCircle,
  CheckCircle, Clock, Plus, X, Save, Trash2,
  Edit2, Award, Shield
} from 'lucide-react';
import {
  collection, query, getDocs, orderBy, where,
  updateDoc, doc, addDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import Members from './Members';
import Leadership from './Leadership';
import AdminEvents from './Events';
import Announcements from './Announcements';
import ActivityLog from './ActivityLog';
import { logAction, LOG } from '../../services/activityLog';
import { recalculateStats } from '../../services/stats';
import toast from 'react-hot-toast';

// ─── tiny modal wrapper ───────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);


// ─── main component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const perms = usePermissions();
  const navigate = useNavigate();

  // derive active tab from URL pathname — handles both /admin/:tab and /admin/leadership etc.
  const location = useLocation();
  const pathSegment = location.pathname.replace('/admin', '').replace(/^\//, '');
  const activeTab = pathSegment || 'overview';

  // data
  const [stats, setStats]               = useState({ totalUsers: 0, pendingUsers: 0, totalEvents: 0, totalPosts: 0, anonymousMessages: 0 });
  const [posts, setPosts]                = useState([]);
  const [messages, setMessages]          = useState([]);
  const [loading, setLoading]            = useState(true);

  // modal state
  const [eventModal,   setEventModal]   = useState(false);
  const [postModal,    setPostModal]    = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingPost,  setEditingPost]  = useState(null);

  // forms
  const emptyEvent = { title: '', description: '', date: '', time: '', location: '' };
  const emptyPost  = { title: '', content: '', category: 'Drug Awareness' };
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [postForm,  setPostForm]  = useState(emptyPost);
  const [saving, setSaving]       = useState(false);

  const POST_CATEGORIES = ['Drug Awareness', 'Health', 'News', 'Prevention', 'Recovery'];

  // ── fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      // Admin uses users (full data, includes admin accounts)
      // Officers use memberProfiles filtered to club members only (excludes admin accounts)
      const memberCollection = perms.isAdmin ? 'users' : 'memberProfiles';
      const membersQuery = perms.isAdmin
        ? collection(db, 'users')
        : query(collection(db, 'memberProfiles'), where('role', '==', 'student'));

      const fetchPromises = [
        getDocs(membersQuery),
        getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'))),
      ];

      if (perms.canViewMessages) {
        fetchPromises.push(
          getDocs(query(collection(db, 'anonymousMessages'), orderBy('createdAt', 'desc')))
        );
      }

      const results = await Promise.all(fetchPromises);
      const [membersSnap, eventsSnap, postsSnap, msgsSnap] = results;

      const members = membersSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));

      setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (msgsSnap) {
        setMessages(msgsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      setStats({
        totalUsers: members.filter(m => m.status !== 'deactivated').length,
        pendingUsers: members.filter(m => m.status === 'pending').length,
        totalEvents: eventsSnap.size,
        totalPosts: postsSnap.size,
        anonymousMessages: msgsSnap ? msgsSnap.size : 0,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [perms.canViewMessages, perms.isAdmin]);

  useEffect(() => {
    // Wait for permissions to load before fetching data
    if (!perms.loading) {
      fetchAll();
    }
  }, [perms.loading, fetchAll]);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const formatDate = (ts) => {
    if (!ts) return 'Unknown';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── event actions ────────────────────────────────────────────────────────────
  const openCreateEvent = () => { setEditingEvent(null); setEventForm(emptyEvent); setEventModal(true); };

  const saveEvent = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const dateTime = new Date(`${eventForm.date}T${eventForm.time || '00:00'}`);
      const payload = {
        title:       eventForm.title,
        description: eventForm.description,
        date:        dateTime,
        location:    eventForm.location,
      };
      if (editingEvent) {
        await updateDoc(doc(db, 'events', editingEvent.id), payload);
        toast.success('Event updated!');
      } else {
        await addDoc(collection(db, 'events'), {
          ...payload,
          createdBy: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        toast.success('Event created!');
      }
      setEventModal(false);
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save event');
    } finally { setSaving(false); }
  };


  // ── post actions ─────────────────────────────────────────────────────────────
  const openCreatePost = () => { setEditingPost(null); setPostForm(emptyPost); setPostModal(true); };
  const openEditPost   = (p) => { setEditingPost(p); setPostForm({ title: p.title, content: p.content, category: p.category }); setPostModal(true); };

  const savePost = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPost) {
        await updateDoc(doc(db, 'posts', editingPost.id), {
          title:    postForm.title,
          content:  postForm.content,
          category: postForm.category,
        });
        toast.success('Article updated!');
        await logAction(currentUser, LOG.POST_UPDATED, 'post', editingPost.id,
          `Updated article: "${postForm.title}"`);
      } else {
        const docRef = await addDoc(collection(db, 'posts'), {
          title:    postForm.title,
          content:  postForm.content,
          category: postForm.category,
          authorId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        toast.success('Article published!');
        await logAction(currentUser, LOG.POST_CREATED, 'post', docRef.id,
          `Published article: "${postForm.title}"`);
      }
      setPostModal(false);
      fetchAll();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save article');
    } finally { setSaving(false); }
  };

  const deletePost = async (id) => {
    if (!window.confirm('Delete this article?')) return;
    const post = posts.find(p => p.id === id);
    try {
      await deleteDoc(doc(db, 'posts', id));
      toast.success('Article deleted');
      await logAction(currentUser, LOG.POST_DELETED, 'post', id,
        `Deleted article: "${post?.title || id}"`);
      fetchAll();
    } catch { toast.error('Failed to delete article'); }
  };

  // ── message actions ───────────────────────────────────────────────────────────
  const markReplied = async (id) => {
    try {
      await updateDoc(doc(db, 'anonymousMessages', id), { isReplied: true });
      toast.success('Marked as replied');
      fetchAll();
    } catch { toast.error('Failed to update message'); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage club members, events, articles, and help messages</p>
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: 'Total Members',    value: stats.totalUsers,        color: 'blue',   icon: Users         },
                { label: 'Pending Approval', value: stats.pendingUsers,      color: 'yellow', icon: Clock         },
                { label: 'Events',           value: stats.totalEvents,       color: 'green',  icon: Calendar      },
                { label: 'Blog Posts',       value: stats.totalPosts,        color: 'purple', icon: FileText      },
                { label: 'Help Messages',
                  value: perms.canViewMessages ? stats.anonymousMessages : 'N/A',
                  color: 'red',    icon: MessageCircle },
              ].map((s, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-3">
                    <div className={`bg-${s.color}-100 rounded-lg p-2`}>
                      <s.icon className={`h-5 w-5 text-${s.color}-600`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions — only actions the current role can perform */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
              {perms.isAdmin && (
            <button
              onClick={() => recalculateStats(currentUser)}
              className="btn-secondary flex items-center gap-2 text-sm"
              title="Recalculate homepage statistics from database">
              <Edit2 className="h-4 w-4" /> Recalculate Homepage Stats
            </button>
          )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {perms.canManageEvents && (
                <button onClick={() => { navigate('/admin/events'); openCreateEvent(); }}
                  className="card p-5 hover:shadow-lg transition-shadow text-left">
                  <Calendar className="h-8 w-8 text-primary-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">Create Event</h3>
                  <p className="text-sm text-gray-500">Add a new awareness event</p>
                </button>
              )}
              {perms.canManagePosts && (
                <button onClick={() => { navigate('/admin/posts'); openCreatePost(); }}
                  className="card p-5 hover:shadow-lg transition-shadow text-left">
                  <FileText className="h-8 w-8 text-secondary-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">
                    {perms.canPublishPosts ? 'Write Article' : 'Draft Article'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {perms.canPublishPosts ? 'Publish a new blog post' : 'Create a draft for approval'}
                  </p>
                </button>
              )}
              {perms.canEditMembers && (
                <button onClick={() => navigate('/admin/members')}
                  className="card p-5 hover:shadow-lg transition-shadow text-left">
                  <Users className="h-8 w-8 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">Manage Members</h3>
                  <p className="text-sm text-gray-500">{stats.pendingUsers} pending approval</p>
                </button>
              )}
              {!perms.canEditMembers && perms.canViewMembers && (
                <button onClick={() => navigate('/admin/members')}
                  className="card p-5 hover:shadow-lg transition-shadow text-left">
                  <Users className="h-8 w-8 text-blue-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">View Members</h3>
                  <p className="text-sm text-gray-500">Browse member list</p>
                </button>
              )}
              {perms.canManageLeadership && (
                <button onClick={() => navigate('/admin/leadership')}
                  className="card p-5 hover:shadow-lg transition-shadow text-left">
                  <Award className="h-8 w-8 text-purple-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">Leadership</h3>
                  <p className="text-sm text-gray-500">Manage official positions</p>
                </button>
              )}
              {perms.canViewMessages && (
                <button onClick={() => navigate('/admin/messages')}
                  className="card p-5 hover:shadow-lg transition-shadow text-left">
                  <MessageCircle className="h-8 w-8 text-red-600 mb-2" />
                  <h3 className="font-semibold text-gray-900">Help Messages</h3>
                  <p className="text-sm text-gray-500">{messages.filter(m => !m.isReplied).length} unread</p>
                </button>
              )}
            </div>
          </>
        )}

        {/* ── EVENTS TAB ── */}
        {activeTab === 'events' && <AdminEvents />}

        {/* ── POSTS TAB ── */}
        {activeTab === 'posts' && (
          !perms.canViewPosts ? (
            <div className="card p-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">You do not have access to this section.</p>
            </div>
          ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Blog Posts ({posts.length})</h2>
              {perms.canManagePosts && (
              <button onClick={openCreatePost} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> {perms.canPublishPosts ? 'Write Article' : 'Draft Article'}
              </button>
              )}
            </div>

            {posts.length === 0 ? (
              <div className="card p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No articles yet</p>
                {perms.canManagePosts && <button onClick={openCreatePost} className="btn-primary">Write First Article</button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map(p => (
                  <div key={p.id} className="card p-5">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-1 rounded-full">
                        {p.category}
                      </span>
                      <div className="flex gap-2">
                        {perms.canManagePosts && (
                          <button onClick={() => openEditPost(p)}
                            className="text-blue-600 hover:text-blue-700 p-1">
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {perms.canDeletePosts && (
                        <button onClick={() => deletePost(p.id)}
                          className="text-red-500 hover:text-red-600 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg mb-2">{p.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-3">{p.content}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
          )
        )}

        {/* ── MEMBERS TAB ── */}
        {activeTab === 'members' && <Members />}

        {/* ── LEADERSHIP TAB ── */}
        {activeTab === 'leadership' && <Leadership />}

        {/* ── ANNOUNCEMENTS TAB ── */}
        {activeTab === 'announcements' && <Announcements />}

        {/* ── ACTIVITY LOG TAB ── */}
        {activeTab === 'activity' && <ActivityLog />}

        {/* ── MESSAGES TAB — only admins/president/vp/secretary ── */}
        {activeTab === 'messages' && (
          !perms.canViewMessages ? (
            <div className="card p-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {perms.canViewMessageStats
                  ? `${stats.anonymousMessages} help messages received. Contact the club administrator for details.`
                  : 'You do not have access to this section.'}
              </p>
            </div>
          ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Help Messages ({messages.length})</h2>
              <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                {messages.filter(m => !m.isReplied).length} unread
              </span>
            </div>

            {messages.length === 0 ? (
              <div className="card p-12 text-center">
                <MessageCircle className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No help messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <div key={msg.id} className={`card p-5 border-l-4 ${
                    msg.isReplied ? 'border-green-400' : 'border-red-400'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{msg.subject}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            msg.isReplied
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {msg.isReplied ? 'Replied' : 'New'}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-3">{msg.message}</p>
                        <p className="text-xs text-gray-400">{formatDate(msg.createdAt)}</p>
                      </div>
                      {!msg.isReplied && (
                        <button onClick={() => markReplied(msg.id)}
                          className="ml-4 flex-shrink-0 bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Mark Replied
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
          )
        )}
      </div>

      {/* ── CREATE / EDIT EVENT MODAL ── */}
      {eventModal && (
        <Modal
          title={editingEvent ? 'Edit Event' : 'Create New Event'}
          onClose={() => setEventModal(false)}
        >
          <form onSubmit={saveEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
              <input
                type="text" required
                value={eventForm.title}
                onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                className="input-field"
                placeholder="e.g. Drug Awareness Workshop"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea
                required rows={4}
                value={eventForm.description}
                onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                className="input-field resize-none"
                placeholder="Describe the event..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date" required
                  value={eventForm.date}
                  onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={eventForm.time}
                  onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <input
                type="text" required
                value={eventForm.location}
                onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                className="input-field"
                placeholder="e.g. Hall 42, Main Campus"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
              </button>
              <button type="button" onClick={() => setEventModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── CREATE / EDIT POST MODAL ── */}
      {postModal && (
        <Modal
          title={editingPost ? 'Edit Article' : 'Write New Article'}
          onClose={() => setPostModal(false)}
        >
          <form onSubmit={savePost} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text" required
                value={postForm.title}
                onChange={e => setPostForm({ ...postForm, title: e.target.value })}
                className="input-field"
                placeholder="Article title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={postForm.category}
                onChange={e => setPostForm({ ...postForm, category: e.target.value })}
                className="input-field"
              >
                {POST_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
              <textarea
                required rows={8}
                value={postForm.content}
                onChange={e => setPostForm({ ...postForm, content: e.target.value })}
                className="input-field resize-none"
                placeholder="Write your article content here..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="btn-primary flex items-center gap-2 disabled:opacity-50">
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : editingPost ? 'Update Article' : 'Publish Article'}
              </button>
              <button type="button" onClick={() => setPostModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;
