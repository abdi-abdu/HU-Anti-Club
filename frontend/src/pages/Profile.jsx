import React, { useState, useRef } from 'react';
import {
  User, Mail, Phone, GraduationCap, Calendar, Shield,
  Edit2, Save, X, Lock, Eye, EyeOff, Globe, Loader, Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { uploadImage } from '../services/imageUpload';
import toast from 'react-hot-toast';

// ── small modal wrapper ───────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
      <div className="flex items-center justify-between p-5 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Profile = () => {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();

  // ── profile edit state ────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [formData,  setFormData]  = useState({
    fullName:    userProfile?.fullName    || '',
    phone:       userProfile?.phone       || '',
    department:  userProfile?.department  || '',
    yearOfStudy: userProfile?.yearOfStudy || '',
  });

  // ── photo upload state ────────────────────────────────────────────────────
  const [photoUploading, setPhotoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const photoInputRef = useRef(null);

  // ── change password state ─────────────────────────────────────────────────
  const [pwModal,   setPwModal]   = useState(false);
  const [pwSaving,  setPwSaving]  = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });

  // ── privacy settings state ────────────────────────────────────────────────
  const [privModal,  setPrivModal]  = useState(false);
  const [privSaving, setPrivSaving] = useState(false);
  const defaultPrivacy = {
    showProfile:     true,   // profile visible to other members
    showEmail:       false,  // email visible to other members
    showPhone:       false,  // phone visible to other members
    emailNotifications: true,  // receive email notifications
    eventReminders:  true,   // receive event reminder notifications
  };
  const [privacy, setPrivacy] = useState({
    ...defaultPrivacy,
    ...(userProfile?.privacy || {}),
  });

  // ── helpers ───────────────────────────────────────────────────────────────
  const handleFormChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handlePwChange = (e) =>
    setPwForm({ ...pwForm, [e.target.name]: e.target.value });

  const handlePrivacyToggle = (key) =>
    setPrivacy(prev => ({ ...prev, [key]: !prev[key] }));

  // ── upload profile photo ──────────────────────────────────────────────────
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    setUploadProgress(0);

    try {
      const result = await uploadImage(
        file,
        {
          purpose: 'profile',
          memberId: currentUser.uid,
        },
        (percent) => setUploadProgress(percent)
      );

      // Save photoUrl to users collection
      await updateDoc(doc(db, 'users', currentUser.uid), {
        photoUrl: result.url,
        updatedAt: serverTimestamp(),
      });

      await fetchUserProfile(currentUser.uid);
      toast.success('Profile photo updated successfully!');
    } catch (err) {
      console.error('Photo upload error:', err);
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setPhotoUploading(false);
      setUploadProgress(0);
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
    }
  };

  // ── save profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      // Update both users (full data) and memberProfiles (non-private data) atomically
      const batch = writeBatch(db);

      batch.update(doc(db, 'users', currentUser.uid), {
        fullName:    formData.fullName,
        phone:       formData.phone,
        department:  formData.department,
        yearOfStudy: formData.yearOfStudy,
        updatedAt:   serverTimestamp(),
      });

      // Sync non-private fields to memberProfiles (phone excluded)
      batch.set(doc(db, 'memberProfiles', currentUser.uid), {
        fullName:    formData.fullName,
        department:  formData.department,
        yearOfStudy: formData.yearOfStudy,
        updatedAt:   serverTimestamp(),
      }, { merge: true });

      await batch.commit();
      await fetchUserProfile(currentUser.uid);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setFormData({
      fullName:    userProfile?.fullName    || '',
      phone:       userProfile?.phone       || '',
      department:  userProfile?.department  || '',
      yearOfStudy: userProfile?.yearOfStudy || '',
    });
    setIsEditing(false);
  };

  // ── change password ───────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (pwForm.newPassword === pwForm.currentPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setPwSaving(true);
    try {
      // Firebase requires recent authentication before changing password
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        pwForm.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, pwForm.newPassword);

      toast.success('Password changed successfully!');
      setPwModal(false);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect');
      } else if (err.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later');
      } else {
        toast.error('Failed to change password. Please try again');
      }
    } finally { setPwSaving(false); }
  };

  // ── save privacy settings ─────────────────────────────────────────────────
  const handleSavePrivacy = async () => {
    setPrivSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { privacy });
      await fetchUserProfile(currentUser.uid);
      toast.success('Privacy settings saved!');
      setPrivModal(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save privacy settings');
    } finally { setPrivSaving(false); }
  };

  // ── status / role colours ─────────────────────────────────────────────────
  const statusColor = (s) =>
    s === 'active'  ? 'bg-green-100 text-green-800'  :
    s === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800';

  const roleColor = (r) =>
    r === 'admin'   ? 'bg-purple-100 text-purple-800' :
                      'bg-blue-100 text-blue-800';

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600" />
      </div>
    );
  }

  // ── toggle row for privacy modal ──────────────────────────────────────────
  const ToggleRow = ({ label, description, field }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => handlePrivacyToggle(field)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          privacy[field] ? 'bg-primary-600' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          privacy[field] ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            {/* Profile Photo */}
            <div className="bg-primary-100 rounded-full p-1 w-24 h-24 mx-auto mb-4 flex items-center justify-center overflow-hidden">
              {userProfile.photoUrl ? (
                <img
                  src={userProfile.photoUrl}
                  alt={userProfile.fullName}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className={`w-full h-full flex items-center justify-center ${userProfile.photoUrl ? 'hidden' : ''}`}
              >
                <User className="h-12 w-12 text-primary-600" />
              </div>
            </div>

            {/* Upload Button Overlay */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-1/2 bg-white rounded-full p-2 shadow-lg border-2 border-primary-100 hover:border-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Upload profile photo"
            >
              {photoUploading ? (
                <Loader className="h-4 w-4 text-primary-600 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-primary-600" />
              )}
            </button>

            {/* Hidden File Input */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {/* Upload Progress */}
            {photoUploading && uploadProgress > 0 && (
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-32">
                <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-primary-600 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center mt-1">{uploadProgress}%</p>
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mt-6">{userProfile.fullName}</h1>
          <p className="text-gray-600">{userProfile.email}</p>
          <div className="flex justify-center space-x-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColor(userProfile.role)}`}>
              {userProfile.role?.charAt(0).toUpperCase() + userProfile.role?.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor(userProfile.status)}`}>
              {userProfile.status?.charAt(0).toUpperCase() + userProfile.status?.slice(1)}
            </span>
          </div>
        </div>

        {/* Pending notice */}
        {userProfile.status === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 flex items-start">
            <Shield className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Account Pending Approval</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your membership application is being reviewed. You&apos;ll receive full access once approved.
              </p>
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="card p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Profile Information</h2>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} className="btn-primary flex items-center">
                <Edit2 className="h-4 w-4 mr-2" /> Edit Profile
              </button>
            ) : (
              <div className="flex space-x-2">
                <button onClick={handleSave} disabled={saving}
                  className="btn-primary flex items-center disabled:opacity-50">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleCancel}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center">
                  <X className="h-4 w-4 mr-2" /> Cancel
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              {isEditing ? (
                <input type="text" name="fullName" value={formData.fullName}
                  onChange={handleFormChange} className="input-field" />
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <span>{userProfile.fullName}</span>
                </div>
              )}
            </div>

            {/* Email read-only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <span>{userProfile.email}</span>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              {isEditing ? (
                <input type="tel" name="phone" value={formData.phone}
                  onChange={handleFormChange} className="input-field" />
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <span>{userProfile.phone}</span>
                </div>
              )}
            </div>

            {/* University ID read-only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">University ID</label>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <GraduationCap className="h-5 w-5 text-gray-400 mr-3" />
                <span>{userProfile.universityId}</span>
              </div>
            </div>

            {/* College read-only */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">College</label>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <GraduationCap className="h-5 w-5 text-gray-400 mr-3" />
                <span>{userProfile.college}</span>
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              {isEditing ? (
                <input type="text" name="department" value={formData.department}
                  onChange={handleFormChange} className="input-field" />
              ) : (
                <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-gray-400 mr-3" />
                  <span>{userProfile.department}</span>
                </div>
              )}
            </div>

            {/* Year of Study */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year of Study</label>
              {isEditing ? (
                <select name="yearOfStudy" value={formData.yearOfStudy}
                  onChange={handleFormChange} className="input-field">
                  {['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate'].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <span>
                  {userProfile.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  }) || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Change Password */}
          <div className="card p-6">
            <div className="flex items-center mb-3">
              <div className="bg-primary-100 rounded-lg p-2 mr-3">
                <Lock className="h-5 w-5 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Account Security</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Keep your account secure by updating your password regularly.
            </p>
            <button onClick={() => setPwModal(true)} className="btn-primary w-full">
              Change Password
            </button>
          </div>

          {/* Privacy Settings */}
          <div className="card p-6">
            <div className="flex items-center mb-3">
              <div className="bg-secondary-100 rounded-lg p-2 mr-3">
                <Globe className="h-5 w-5 text-secondary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Privacy Settings</h3>
            </div>
            <p className="text-gray-600 mb-4 text-sm">
              Control what information is visible and how you receive notifications.
            </p>
            <button onClick={() => setPrivModal(true)} className="btn-primary w-full">
              Privacy Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── CHANGE PASSWORD MODAL ── */}
      {pwModal && (
        <Modal title="Change Password" onClose={() => { setPwModal(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password *
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  name="currentPassword"
                  required
                  value={pwForm.currentPassword}
                  onChange={handlePwChange}
                  className="input-field pr-10"
                  placeholder="Enter current password"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password *
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  name="newPassword"
                  required
                  minLength={6}
                  value={pwForm.newPassword}
                  onChange={handlePwChange}
                  className="input-field pr-10"
                  placeholder="At least 6 characters"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* strength indicator */}
              {pwForm.newPassword && (
                <div className="mt-1.5 flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${
                      pwForm.newPassword.length >= i * 3
                        ? i <= 1 ? 'bg-red-400'
                        : i <= 2 ? 'bg-yellow-400'
                        : i <= 3 ? 'bg-blue-400'
                        : 'bg-green-500'
                        : 'bg-gray-200'
                    }`} />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm new password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={pwForm.confirmPassword}
                  onChange={handlePwChange}
                  className={`input-field pr-10 ${
                    pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword
                      ? 'border-red-400 focus:ring-red-400'
                      : ''
                  }`}
                  placeholder="Repeat new password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwForm.confirmPassword && pwForm.confirmPassword !== pwForm.newPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={pwSaving}
                className="btn-primary flex-1 disabled:opacity-50">
                {pwSaving ? 'Changing...' : 'Change Password'}
              </button>
              <button type="button"
                onClick={() => { setPwModal(false); setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── PRIVACY SETTINGS MODAL ── */}
      {privModal && (
        <Modal title="Privacy Settings" onClose={() => setPrivModal(false)}>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 mb-4">
              Control your visibility and notification preferences.
            </p>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Profile Visibility
            </p>
            <ToggleRow
              label="Show my profile to members"
              description="Other active members can view your name and department"
              field="showProfile"
            />
            <ToggleRow
              label="Show my email address"
              description="Other members can see your email in the member directory"
              field="showEmail"
            />
            <ToggleRow
              label="Show my phone number"
              description="Other members can see your phone number"
              field="showPhone"
            />

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-2">
              Notifications
            </p>
            <ToggleRow
              label="Email notifications"
              description="Receive updates about club activities via email"
              field="emailNotifications"
            />
            <ToggleRow
              label="Event reminders"
              description="Get reminded about upcoming events you registered for"
              field="eventReminders"
            />
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
            <button onClick={handleSavePrivacy} disabled={privSaving}
              className="btn-primary flex-1 disabled:opacity-50">
              {privSaving ? 'Saving...' : 'Save Settings'}
            </button>
            <button onClick={() => setPrivModal(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Profile;
