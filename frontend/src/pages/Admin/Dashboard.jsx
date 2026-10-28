import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, FileText, MessageCircle,
  CheckCircle, Clock, Plus, X, Save, Trash2,
  Edit2, Eye, ChevronDown
} from 'lucide-react';
import {
  collection, query, getDocs, orderBy,
  updateDoc, doc, addDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
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

// ─── tab list ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview',       icon: ChevronDown  },
  { id: 'events',    label: 'Events',          icon: Calendar     },
  { id: 'posts',     label: 'Blog Posts',      icon: FileText     },
  { id: 'members',   label: 'Members',         icon: Users        },
  { id: 'messages',  label: 'Help Messages',   icon: MessageCircle },
];

// ─── main component ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // data
  const [stats, setStats]               = useState({ totalUsers: 0, pendingUsers: 0, totalEvents: 0, totalPosts: 0, anonymousMessages: 0 });
  const [pendingUsers, setPendingUsers]  = useState([]);
  const [allUsers, setAllUsers]          = useState([]);
  const [events, setEvents]              = useState([]);
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
  const fetchAll = async () => {
    try {
      const [usersSnap, eventsSnap, postsSnap, msgsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(query(collection(db, 'events'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'posts'),  orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'anonymousMessages'), orderBy('createdAt', 'desc'))),
      ]);

      const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pending = users.filter(u => u.status === 'pending');

      setAllUsers(users);
      setPendingUsers(pending);
      setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMessages(msgsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setStats({
        totalUsers:        users.length,
        pendingUsers:      pending.length,
        totalEvents:       eventsSnap.size,
        totalPosts:        postsSnap.size,
        anonymousMessages: msgsSnap.size,
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const formatDate = (ts) => {
    if (!ts) return 'Unknown';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // ── user actions ─────────────────────────────────────────────────────────────
  const updateUser = async (userId, data, msg) => {
    try {
      await updateDoc(doc(db, 'users', userId), data);
      toast.success(msg);
      fetchAll();
    } catch { toast.error('Action failed'); }
  };

  // ── event actions ────────────────────────────────────────────────────────────
  const openCreateEvent = () => { setEditingEvent(null); setEventForm(emptyEvent); setEventModal(true); };
  const openEditEvent   = (ev) => {
    const d = ev.date?.toDate ? ev.date.toDate() : new Date(ev.date);
    setEditingEvent(ev);
    setEventForm({
      title:       ev.title,
      description: ev.description,
      date:        d.toISOString().split('T')[0],
      time:        d.toTimeString().slice(0, 5),
      location:    ev.location,
    });
    setEventModal(true);
  };

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

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Event deleted');
      fetchAll();
    } catch { toast.error('Failed to delete event'); }
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
      } else {
        await addDoc(collection(db, 'posts'), {
          title:    postForm.title,
          content:  postForm.content,
          category: postForm.category,
          authorId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        toast.success('Article published!');
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
    try {
      await deleteDoc(doc(db, 'posts', id));
      toast.success('Article deleted');
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

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-1 bg-white rounded-xl p-1 shadow-sm mb-8 border border-gray-200">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow'
                  : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'members'  && stats.pendingUsers > 0  && (
                <span className="bg-yellow-400 text-yellow-900 text-xs px-1.5 py-0.5 rounded-full">{stats.pendingUsers}</span>
              )}
              {tab.id === 'messages' && messages.filter(m => !m.isReplied).length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{messages.filter(m => !m.isReplied).length}</span>
              )}
            </button>
          ))}
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
                { label: 'Help Messages',    value: stats.anonymousMessages, color: 'red',    icon: MessageCircle },
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

            {/* Quick Actions */}
            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onClick={() => { setActiveTab('events'); openCreateEvent(); }}
                className="card p-5 hover:shadow-lg transition-shadow text-left">
                <Calendar className="h-8 w-8 text-primary-600 mb-2" />
                <h3 className="font-semibold text-gray-900">Create Event</h3>
                <p className="text-sm text-gray-500">Add a new awareness event</p>
              </button>
              <button onClick={() => { setActiveTab('posts'); openCreatePost(); }}
                className="card p-5 hover:shadow-lg transition-shadow text-left">
                <FileText className="h-8 w-8 text-secondary-600 mb-2" />
                <h3 className="font-semibold text-gray-900">Write Article</h3>
                <p className="text-sm text-gray-500">Publish a new blog post</p>
              </button>
              <button onClick={() => setActiveTab('members')}
                className="card p-5 hover:shadow-lg transition-shadow text-left">
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-semibold text-gray-900">Manage Members</h3>
                <p className="text-sm text-gray-500">{stats.pendingUsers} pending approval</p>
              </button>
              <button onClick={() => setActiveTab('messages')}
                className="card p-5 hover:shadow-lg transition-shadow text-left">
                <MessageCircle className="h-8 w-8 text-red-600 mb-2" />
                <h3 className="font-semibold text-gray-900">Help Messages</h3>
                <p className="text-sm text-gray-500">{messages.filter(m => !m.isReplied).length} unread</p>
              </button>
            </div>
          </>
        )}

        {/* ── EVENTS TAB ── */}
        {activeTab === 'events' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Events ({events.length})</h2>
              <button onClick={openCreateEvent} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> Create Event
              </button>
            </div>

            {events.length === 0 ? (
              <div className="card p-12 text-center">
                <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No events yet</p>
                <button onClick={openCreateEvent} className="btn-primary">Create First Event</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map(ev => (
                  <div key={ev.id} className="card p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900 text-lg pr-4">{ev.title}</h3>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEditEvent(ev)}
                          className="text-blue-600 hover:text-blue-700 p-1">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deleteEvent(ev.id)}
                          className="text-red-500 hover:text-red-600 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ev.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(ev.date)}
                      </span>
                      <span>📍 {ev.location}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── POSTS TAB ── */}
        {activeTab === 'posts' && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Blog Posts ({posts.length})</h2>
              <button onClick={openCreatePost} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" /> Write Article
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="card p-12 text-center">
                <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No articles yet</p>
                <button onClick={openCreatePost} className="btn-primary">Write First Article</button>
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
                        <button onClick={() => openEditPost(p)}
                          className="text-blue-600 hover:text-blue-700 p-1">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deletePost(p.id)}
                          className="text-red-500 hover:text-red-600 p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
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
        )}

        {/* ── MEMBERS TAB ── */}
        {activeTab === 'members' && (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              All Members ({allUsers.length})
              {stats.pendingUsers > 0 && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                  {stats.pendingUsers} pending
                </span>
              )}
            </h2>

            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">ID / Department</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{user.fullName}</p>
                        <p className="text-gray-500 text-xs">{user.email}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                        <p>{user.universityId}</p>
                        <p className="text-xs text-gray-400">{user.department}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active'   ? 'bg-green-100 text-green-800' :
                          user.status === 'pending'  ? 'bg-yellow-100 text-yellow-800' :
                                                       'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {user.status === 'pending' && (
                            <button onClick={() => updateUser(user.id, { status: 'active' }, 'User approved!')}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs">
                              Approve
                            </button>
                          )}
                          {user.status === 'pending' && (
                            <button onClick={() => updateUser(user.id, { status: 'rejected' }, 'User rejected')}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs">
                              Reject
                            </button>
                          )}
                          {user.role !== 'admin' && user.status === 'active' && (
                            <button onClick={() => updateUser(user.id, { role: 'admin' }, 'Promoted to admin!')}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs">
                              Make Admin
                            </button>
                          )}
                          {user.status === 'active' && (
                            <button onClick={() => updateUser(user.id, { status: 'pending' }, 'User suspended')}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs">
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── MESSAGES TAB ── */}
        {activeTab === 'messages' && (
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
