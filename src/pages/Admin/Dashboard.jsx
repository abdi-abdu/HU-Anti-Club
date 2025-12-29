import React, { useState, useEffect } from 'react';
import { Users, Calendar, FileText, MessageCircle, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { collection, query, getDocs, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingUsers: 0,
    totalEvents: 0,
    totalPosts: 0,
    anonymousMessages: 0
  });
  const [pendingUsers, setPendingUsers] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch users statistics
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const pendingUsersData = users.filter(user => user.status === 'pending');

      // Fetch other collections
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const postsSnapshot = await getDocs(collection(db, 'posts'));
      const messagesSnapshot = await getDocs(collection(db, 'anonymousMessages'));

      setStats({
        totalUsers: users.length,
        pendingUsers: pendingUsersData.length,
        totalEvents: eventsSnapshot.size,
        totalPosts: postsSnapshot.size,
        anonymousMessages: messagesSnapshot.size
      });

      setPendingUsers(pendingUsersData.slice(0, 5)); // Show first 5 pending users

      // Fetch recent anonymous messages
      const recentMessagesQuery = query(
        collection(db, 'anonymousMessages'),
        orderBy('createdAt', 'desc')
      );
      const recentMessagesSnapshot = await getDocs(recentMessagesQuery);
      setRecentMessages(recentMessagesSnapshot.docs.slice(0, 5).map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'active'
      });
      toast.success('User approved successfully!');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Failed to approve user');
    }
  };

  const rejectUser = async (userId) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'rejected'
      });
      toast.success('User rejected');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast.error('Failed to reject user');
    }
  };

  const markMessageAsReplied = async (messageId) => {
    try {
      await updateDoc(doc(db, 'anonymousMessages', messageId), {
        isReplied: true
      });
      toast.success('Message marked as replied');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('Failed to update message');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage club members, content, and activities</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-3 mr-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="bg-yellow-100 rounded-lg p-3 mr-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingUsers}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-3 mr-4">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-3 mr-4">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Blog Posts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPosts}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="bg-red-100 rounded-lg p-3 mr-4">
                <MessageCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Help Messages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.anonymousMessages}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending User Approvals */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {stats.pendingUsers} pending
              </span>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-gray-600">No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-sm text-gray-600">
                          {user.universityId} • {user.department}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Applied: {formatDate(user.createdAt)}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => approveUser(user.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectUser(user.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Anonymous Messages */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Recent Help Messages</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {recentMessages.filter(m => !m.isReplied).length} unread
              </span>
            </div>

            {recentMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No messages yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMessages.map((message) => (
                  <div key={message.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-grow">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{message.subject}</h3>
                          {message.isReplied ? (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              Replied
                            </span>
                          ) : (
                            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{message.message}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                      {!message.isReplied && (
                        <button
                          onClick={() => markMessageAsReplied(message.id)}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded text-sm ml-4"
                        >
                          Mark Replied
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="card p-4 hover:shadow-lg transition-shadow text-left">
              <Calendar className="h-8 w-8 text-primary-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Create Event</h3>
              <p className="text-sm text-gray-600">Add a new awareness campaign or event</p>
            </button>

            <button className="card p-4 hover:shadow-lg transition-shadow text-left">
              <FileText className="h-8 w-8 text-secondary-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Write Article</h3>
              <p className="text-sm text-gray-600">Publish a new blog post or article</p>
            </button>

            <button className="card p-4 hover:shadow-lg transition-shadow text-left">
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Manage Members</h3>
              <p className="text-sm text-gray-600">View and manage club members</p>
            </button>

            <button className="card p-4 hover:shadow-lg transition-shadow text-left">
              <MessageCircle className="h-8 w-8 text-red-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Help Messages</h3>
              <p className="text-sm text-gray-600">Review anonymous help requests</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;