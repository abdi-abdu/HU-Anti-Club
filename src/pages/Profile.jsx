import React, { useState } from 'react';
import { User, Mail, Phone, GraduationCap, Calendar, Shield, Edit2, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import toast from 'react-hot-toast';

const Profile = () => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: userProfile?.fullName || '',
    phone: userProfile?.phone || '',
    department: userProfile?.department || '',
    yearOfStudy: userProfile?.yearOfStudy || ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        fullName: formData.fullName,
        phone: formData.phone,
        department: formData.department,
        yearOfStudy: formData.yearOfStudy
      });

      await fetchUserProfile(currentUser.uid);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: userProfile?.fullName || '',
      phone: userProfile?.phone || '',
      department: userProfile?.department || '',
      yearOfStudy: userProfile?.yearOfStudy || ''
    });
    setIsEditing(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'student':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-primary-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <User className="h-10 w-10 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{userProfile.fullName}</h1>
          <p className="text-gray-600">{userProfile.email}</p>
          <div className="flex justify-center space-x-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(userProfile.role)}`}>
              {userProfile.role?.charAt(0).toUpperCase() + userProfile.role?.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(userProfile.status)}`}>
              {userProfile.status?.charAt(0).toUpperCase() + userProfile.status?.slice(1)}
            </span>
          </div>
        </div>

        {/* Status Message */}
        {userProfile.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Account Pending Approval</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Your membership application is being reviewed by club administrators. 
                  You'll receive full access once your account is approved.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="card p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-primary flex items-center"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="input-field"
                />
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <span>{userProfile.fullName}</span>
                </div>
              )}
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <span>{userProfile.email}</span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field"
                />
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <span>{userProfile.phone}</span>
                </div>
              )}
            </div>

            {/* University ID (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                University ID
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <GraduationCap className="h-5 w-5 text-gray-400 mr-3" />
                <span>{userProfile.universityId}</span>
              </div>
            </div>

            {/* College (Read-only) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                College
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <GraduationCap className="h-5 w-5 text-gray-400 mr-3" />
                <span>{userProfile.college}</span>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="input-field"
                />
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-gray-400 mr-3" />
                  <span>{userProfile.department}</span>
                </div>
              )}
            </div>

            {/* Year of Study */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year of Study
              </label>
              {isEditing ? (
                <select
                  name="yearOfStudy"
                  value={formData.yearOfStudy}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="5th Year">5th Year</option>
                  <option value="Graduate">Graduate</option>
                </select>
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                  <span>{userProfile.yearOfStudy}</span>
                </div>
              )}
            </div>

            {/* Member Since */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Member Since
              </label>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <span>
                  {userProfile.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h3>
            <p className="text-gray-600 mb-4">
              Keep your account secure by using a strong password and enabling two-factor authentication.
            </p>
            <button className="btn-primary">
              Change Password
            </button>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Settings</h3>
            <p className="text-gray-600 mb-4">
              Control how your information is shared within the club community.
            </p>
            <button className="btn-primary">
              Privacy Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;