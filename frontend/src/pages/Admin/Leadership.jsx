import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, Plus, Edit2, X, Save, AlertTriangle,
  History, ChevronDown, ChevronUp, Eye, EyeOff, Image
} from 'lucide-react';
import {
  collection, getDocs, doc, addDoc, updateDoc,
  query, orderBy, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ── Available positions — add more here to extend later ───────────────────────
export const POSITIONS = [
  { id: 'president',      label: 'President'      },
  { id: 'vice_president', label: 'Vice President'  },
  { id: 'secretary',      label: 'Secretary'       },
];

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

// ── Status badge ──────────────────────────────────────────────────────────────
const ApptBadge = ({ status }) => {
  const styles = {
    active: 'bg-green-100 text-green-800',
    ended:  'bg-gray-100  text-gray-600',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${styles[status] || styles.ended}`}>
      {status}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const Leadership = () => {
  const { currentUser } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [members,      setMembers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showHistory,  setShowHistory]  = useState(false);

  const [assignModal,  setAssignModal]  = useState(false);
  const [editModal,    setEditModal]    = useState(false);
  const [endModal,     setEndModal]     = useState(null);
  const [selected,     setSelected]     = useState(null);
  const [saving,       setSaving]       = useState(false);

  // ── form defaults ─────────────────────────────────────────────────────────
  const emptyForm = {
    memberId:     '',
    position:     'president',
    startDate:    '',
    endDate:      '',
    notes:        '',
    photoUrl:     '',   // priority 1: uploaded/pasted URL (overrides local file)
    showPublicly: true, // whether this person appears on the public About page
  };
  const [form, setForm] = useState(emptyForm);

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptSnap, membersSnap] = await Promise.all([
        getDocs(query(collection(db, 'leadership'), orderBy('startDate', 'desc'))),
        getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
      ]);
      setAppointments(apptSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const memberList = membersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
      setMembers(memberList);
    } catch (err) {
      console.error('Leadership fetch error:', err);
      // Fallback without orderBy
      try {
        const [apptSnap, membersSnap] = await Promise.all([
          getDocs(collection(db, 'leadership')),
          getDocs(query(collection(db, 'users'), where('status', '==', 'active'))),
        ]);
        const appts = apptSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ad = a.startDate?.toDate?.() || new Date(0);
            const bd = b.startDate?.toDate?.() || new Date(0);
            return bd - ad;
          });
        setAppointments(appts);
        const memberList = membersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
        setMembers(memberList);
      } catch (fallbackErr) {
        console.error('Fallback failed:', fallbackErr);
        toast.error('Failed to load leadership data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── derived ───────────────────────────────────────────────────────────────
  const current = appointments.filter(a => a.status === 'active');
  const history = appointments.filter(a => a.status !== 'active');

  const activeForPosition = (positionId) =>
    current.find(a => a.position === positionId);

  const memberName    = (id) => members.find(m => m.id === id)?.fullName || id;
  const positionLabel = (id) => POSITIONS.find(p => p.id === id)?.label  || id;

  const formatDate = (val) => {
    if (!val) return '—';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const toDate = (str) => str ? new Date(str) : null;

  const endingSoon = (appt) => {
    if (!appt.endDate || appt.status !== 'active') return false;
    const end = appt.endDate.toDate ? appt.endDate.toDate() : new Date(appt.endDate);
    const diff = (end - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  // ── open assign ───────────────────────────────────────────────────────────
  const openAssign = (prePosition = 'president') => {
    setForm({ ...emptyForm, position: prePosition });
    setAssignModal(true);
  };

  const saveAssign = async (e) => {
    e.preventDefault();
    if (!form.memberId)  { toast.error('Please select a member'); return; }
    if (!form.startDate) { toast.error('Start date is required'); return; }
    if (form.endDate && form.endDate < form.startDate) {
      toast.error('End date must be after start date'); return;
    }
    const conflict = activeForPosition(form.position);
    if (conflict) {
      toast.error(`${positionLabel(form.position)} is already held by ${memberName(conflict.memberId)}. End their appointment first.`);
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'leadership'), {
        memberId:     form.memberId,
        position:     form.position,
        startDate:    toDate(form.startDate),
        endDate:      form.endDate ? toDate(form.endDate) : null,
        status:       'active',
        notes:        form.notes.trim(),
        photoUrl:     form.photoUrl.trim() || null,
        showPublicly: form.showPublicly,
        createdBy:    currentUser.uid,
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp(),
      });
      toast.success(`${positionLabel(form.position)} assigned ✓`);
      setAssignModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save appointment');
    } finally { setSaving(false); }
  };

  // ── open edit ─────────────────────────────────────────────────────────────
  const openEdit = (appt) => {
    setSelected(appt);
    const toStr = (val) => {
      if (!val) return '';
      const d = val.toDate ? val.toDate() : new Date(val);
      return d.toISOString().split('T')[0];
    };
    setForm({
      memberId:     appt.memberId,
      position:     appt.position,
      startDate:    toStr(appt.startDate),
      endDate:      toStr(appt.endDate),
      notes:        appt.notes        || '',
      photoUrl:     appt.photoUrl     || '',
      showPublicly: appt.showPublicly !== false, // default true if not set
    });
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!form.startDate) { toast.error('Start date is required'); return; }
    if (form.endDate && form.endDate < form.startDate) {
      toast.error('End date must be after start date'); return;
    }
    if (form.position !== selected.position) {
      const conflict = activeForPosition(form.position);
      if (conflict && conflict.id !== selected.id) {
        toast.error(`${positionLabel(form.position)} is already held by ${memberName(conflict.memberId)}.`);
        return;
      }
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'leadership', selected.id), {
        memberId:     form.memberId,
        position:     form.position,
        startDate:    toDate(form.startDate),
        endDate:      form.endDate ? toDate(form.endDate) : null,
        notes:        form.notes.trim(),
        photoUrl:     form.photoUrl.trim() || null,
        showPublicly: form.showPublicly,
        updatedAt:    serverTimestamp(),
        updatedBy:    currentUser.uid,
      });
      toast.success('Appointment updated ✓');
      setEditModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update appointment');
    } finally { setSaving(false); }
  };

  // ── end appointment ───────────────────────────────────────────────────────
  const confirmEnd = async () => {
    if (!endModal) return;
    try {
      await updateDoc(doc(db, 'leadership', endModal.id), {
        status:    'ended',
        endDate:   new Date(),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      });
      toast.success('Appointment ended. Historical record preserved ✓');
      setEndModal(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to end appointment');
    }
  };

  // ── quick toggle showPublicly ─────────────────────────────────────────────
  const togglePublic = async (appt) => {
    try {
      await updateDoc(doc(db, 'leadership', appt.id), {
        showPublicly: !(appt.showPublicly !== false),
        updatedAt:    serverTimestamp(),
        updatedBy:    currentUser.uid,
      });
      toast.success(
        appt.showPublicly !== false
          ? 'Hidden from public About page'
          : 'Now visible on public About page ✓'
      );
      fetchData();
    } catch { toast.error('Failed to update visibility'); }
  };

  // ── shared form ───────────────────────────────────────────────────────────
  const AppointmentForm = ({ onSubmit, isEdit = false }) => {
    const memberObj = members.find(m => m.id === form.memberId);
    // Show current photo resolution preview
    const previewPhoto = form.photoUrl || (memberObj ? `/images/team/${memberObj.id}.jpg` : null);

    return (
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Member selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Club Member *</label>
          <select required value={form.memberId}
            onChange={e => setForm({ ...form, memberId: e.target.value })}
            className="input-field">
            <option value="">Select an active member…</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>
                {m.fullName} — {m.universityId || m.email}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">Only active members listed. Approve pending members first.</p>
        </div>

        {/* Position selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Official Position *</label>
          <select required value={form.position}
            onChange={e => setForm({ ...form, position: e.target.value })}
            className="input-field">
            {POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          {!isEdit && activeForPosition(form.position) && (
            <p className="text-xs text-red-500 mt-1">
              ⚠ {positionLabel(form.position)} is currently held by{' '}
              <strong>{memberName(activeForPosition(form.position).memberId)}</strong>.
              End their appointment first.
            </p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
            <input type="date" required value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date <span className="text-gray-400">(optional)</span>
            </label>
            <input type="date" min={form.startDate} value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })}
              className="input-field" />
          </div>
        </div>

        {/* Photo URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <span className="flex items-center gap-1.5">
              <Image className="h-4 w-4" />
              Photo URL <span className="text-gray-400 font-normal">(optional)</span>
            </span>
          </label>
          <input type="url" value={form.photoUrl}
            onChange={e => setForm({ ...form, photoUrl: e.target.value })}
            className="input-field"
            placeholder="https://… or Firebase Storage URL" />
          <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2 space-y-1">
            <p><strong>Photo resolution order (highest priority first):</strong></p>
            <p>1. URL entered here (also accepts Firebase Storage URLs)</p>
            <p>2. Local file: <code>/images/team/{'{'}memberId{'}'}.jpg</code></p>
            <p>3. Initials avatar (automatic fallback)</p>
            <p className="text-gray-400">When Firebase Storage is enabled, upload a photo and paste the Storage URL here.</p>
          </div>
          {/* Live photo preview */}
          {previewPhoto && (
            <div className="mt-3 flex items-center gap-3">
              <img src={previewPhoto} alt="Photo preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-primary-100"
                onError={e => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }} />
              <div className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center hidden">
                <span className="text-xl font-bold text-primary-600">
                  {memberObj?.fullName?.charAt(0) || '?'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {form.photoUrl ? 'Using URL above' : 'Using local file fallback'}
              </p>
            </div>
          )}
        </div>

        {/* Public visibility toggle */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Show on public About page</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When enabled, this person's name, position and photo appear at <strong>/about</strong> for everyone to see.
                Disable for interim, provisional, or unannounced appointments.
              </p>
            </div>
            <button type="button"
              onClick={() => setForm(f => ({ ...f, showPublicly: !f.showPublicly }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-4 ${
                form.showPublicly ? 'bg-primary-600' : 'bg-gray-300'
              }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.showPublicly ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          {!form.showPublicly && (
            <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded p-2">
              ⚠ This appointment will NOT appear on the public About page until you enable visibility.
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes <span className="text-gray-400">(optional, internal only)</span>
          </label>
          <textarea rows={2} value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            className="input-field resize-none"
            placeholder="Internal notes about this appointment…" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="btn-primary flex items-center gap-2 flex-1 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : isEdit ? 'Update Appointment' : 'Assign Position'}
          </button>
          <button type="button"
            onClick={() => isEdit ? setEditModal(false) : setAssignModal(false)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
            Cancel
          </button>
        </div>
      </form>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Club Leadership</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {current.length} active · {history.length} historical ·{' '}
            {current.filter(a => a.showPublicly !== false).length} shown publicly
          </p>
        </div>
        <button onClick={() => openAssign()} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> Assign Position
        </button>
      </div>

      {/* Position cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {POSITIONS.map(pos => {
          const appt = activeForPosition(pos.id);
          const soon = appt && endingSoon(appt);
          const isPublic = appt && appt.showPublicly !== false;

          return (
            <div key={pos.id} className={`card p-5 ${soon ? 'border-2 border-yellow-400' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {pos.label}
                </span>
                <div className="flex items-center gap-1.5">
                  {appt && (
                    <span title={isPublic ? 'Visible on About page' : 'Hidden from About page'}
                      className={`text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                      {isPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {isPublic ? 'Public' : 'Hidden'}
                    </span>
                  )}
                  {appt ? <ApptBadge status="active" /> : (
                    <span className="text-xs text-gray-400 italic">Vacant</span>
                  )}
                </div>
              </div>

              {appt ? (
                <>
                  {/* Photo + name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary-100 bg-primary-50 flex-shrink-0 flex items-center justify-center">
                      <img
                        src={appt.photoUrl || `/images/team/${appt.memberId}.jpg`}
                        alt={memberName(appt.memberId)}
                        className="w-full h-full object-cover"
                        onError={e => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="w-full h-full items-center justify-center hidden">
                        <span className="text-lg font-bold text-primary-600">
                          {memberName(appt.memberId).charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{memberName(appt.memberId)}</p>
                      <p className="text-xs text-gray-500">Since {formatDate(appt.startDate)}</p>
                    </div>
                  </div>

                  {appt.endDate && (
                    <p className={`text-xs mb-3 ${soon ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>
                      {soon ? '⚠ Term ending: ' : 'Term until: '}{formatDate(appt.endDate)}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    <button onClick={() => openEdit(appt)}
                      className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1.5 rounded text-xs transition-colors">
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => togglePublic(appt)}
                      title={isPublic ? 'Hide from About page' : 'Show on About page'}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors ${
                        isPublic
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          : 'bg-green-50 hover:bg-green-100 text-green-700'
                      }`}>
                      {isPublic ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show</>}
                    </button>
                    <button onClick={() => setEndModal(appt)}
                      className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded text-xs transition-colors">
                      <X className="h-3 w-3" /> End Term
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => openAssign(pos.id)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-primary-400 text-gray-500 hover:text-primary-600 py-3 rounded-lg text-sm transition-colors">
                  <Plus className="h-4 w-4" /> Assign
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* History */}
      <div className="mb-4">
        <button onClick={() => setShowHistory(h => !h)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
          <History className="h-4 w-4" />
          {showHistory ? 'Hide' : 'Show'} appointment history ({history.length})
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {showHistory && (
        history.length === 0 ? (
          <div className="card p-8 text-center text-gray-500 text-sm">No historical appointments yet.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Member</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Start</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">End</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(appt => (
                  <tr key={appt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{memberName(appt.memberId)}</td>
                    <td className="px-4 py-3 text-gray-600">{positionLabel(appt.position)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(appt.startDate)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{formatDate(appt.endDate)}</td>
                    <td className="px-4 py-3"><ApptBadge status={appt.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Assign modal */}
      {assignModal && (
        <Modal title="Assign Official Position" onClose={() => setAssignModal(false)} size="lg">
          <AppointmentForm onSubmit={saveAssign} isEdit={false} />
        </Modal>
      )}

      {/* Edit modal */}
      {editModal && selected && (
        <Modal title={`Edit — ${positionLabel(selected.position)}`} onClose={() => setEditModal(false)} size="lg">
          <AppointmentForm onSubmit={saveEdit} isEdit={true} />
        </Modal>
      )}

      {/* End appointment confirm */}
      {endModal && (
        <Modal title="End Appointment" onClose={() => setEndModal(null)} size="sm">
          <div className="flex items-start gap-3 mb-6">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">
                End {positionLabel(endModal.position)} for <strong>{memberName(endModal.memberId)}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Historical record preserved. Position becomes vacant.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={confirmEnd}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium">
              Yes, End Appointment
            </button>
            <button onClick={() => setEndModal(null)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Leadership;
