import React, { useState, useEffect, useCallback } from 'react';
import {
  Award, Plus, Edit2, X, Save, AlertTriangle,
  Calendar, User, CheckCircle, Clock, History,
  ChevronDown, ChevronUp
} from 'lucide-react';
import {
  collection, getDocs, doc, addDoc, updateDoc,
  query, orderBy, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// ── Available positions — easy to extend later ────────────────────────────────
export const POSITIONS = [
  { id: 'president',      label: 'President'      },
  { id: 'vice_president', label: 'Vice President'  },
  { id: 'secretary',      label: 'Secretary'       },
];

// ── Modal wrapper ─────────────────────────────────────────────────────────────
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
    active:  'bg-green-100 text-green-800',
    ended:   'bg-gray-100  text-gray-600',
    pending: 'bg-yellow-100 text-yellow-800',
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
  const [members,      setMembers]      = useState([]);   // active members for the picker
  const [loading,      setLoading]      = useState(true);
  const [showHistory,  setShowHistory]  = useState(false);

  // modals
  const [assignModal,  setAssignModal]  = useState(false);
  const [editModal,    setEditModal]    = useState(false);
  const [endModal,     setEndModal]     = useState(null);  // appointment to end
  const [selected,     setSelected]     = useState(null);  // appointment being edited

  // form state
  const emptyForm = {
    memberId:  '',
    position:  'president',
    startDate: '',
    endDate:   '',
    notes:     '',
  };
  const [form,    setForm]    = useState(emptyForm);
  const [saving,  setSaving]  = useState(false);

  // ── fetch ────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [apptSnap, membersSnap] = await Promise.all([
        getDocs(query(collection(db, 'leadership'), orderBy('startDate', 'desc'))),
        getDocs(query(collection(db, 'users'), where('status', '==', 'active'), orderBy('fullName', 'asc'))),
      ]);
      setAppointments(apptSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMembers(membersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leadership data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── derived data ─────────────────────────────────────────────────────────
  const current = appointments.filter(a => a.status === 'active');
  const history = appointments.filter(a => a.status !== 'active');

  // check if a position already has an active holder
  const activeForPosition = (positionId) =>
    current.find(a => a.position === positionId);

  // ── helpers ──────────────────────────────────────────────────────────────
  const memberName = (id) =>
    members.find(m => m.id === id)?.fullName || id;

  const positionLabel = (id) =>
    POSITIONS.find(p => p.id === id)?.label || id;

  const formatDate = (val) => {
    if (!val) return '—';
    const d = val.toDate ? val.toDate() : new Date(val);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const toDate = (str) => str ? new Date(str) : null;

  // Is term ending within 30 days?
  const endingSoon = (appt) => {
    if (!appt.endDate || appt.status !== 'active') return false;
    const end = appt.endDate.toDate ? appt.endDate.toDate() : new Date(appt.endDate);
    const diff = (end - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  // ── assign new appointment ────────────────────────────────────────────────
  const openAssign = () => { setForm(emptyForm); setAssignModal(true); };

  const saveAssign = async (e) => {
    e.preventDefault();
    if (!form.memberId) { toast.error('Please select a member'); return; }
    if (!form.startDate) { toast.error('Start date is required'); return; }
    if (form.endDate && form.endDate < form.startDate) {
      toast.error('End date must be after start date'); return;
    }

    // conflict check — is this position already active?
    const conflict = activeForPosition(form.position);
    if (conflict) {
      toast.error(
        `${positionLabel(form.position)} is already held by ${memberName(conflict.memberId)}. End their appointment first.`
      );
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, 'leadership'), {
        memberId:    form.memberId,
        position:    form.position,
        startDate:   toDate(form.startDate),
        endDate:     form.endDate ? toDate(form.endDate) : null,
        status:      'active',
        notes:       form.notes.trim(),
        createdBy:   currentUser.uid,
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      });
      toast.success(`${positionLabel(form.position)} assigned successfully ✓`);
      setAssignModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save appointment');
    } finally { setSaving(false); }
  };

  // ── edit appointment ──────────────────────────────────────────────────────
  const openEdit = (appt) => {
    setSelected(appt);
    const toStr = (val) => {
      if (!val) return '';
      const d = val.toDate ? val.toDate() : new Date(val);
      return d.toISOString().split('T')[0];
    };
    setForm({
      memberId:  appt.memberId,
      position:  appt.position,
      startDate: toStr(appt.startDate),
      endDate:   toStr(appt.endDate),
      notes:     appt.notes || '',
    });
    setEditModal(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!form.startDate) { toast.error('Start date is required'); return; }
    if (form.endDate && form.endDate < form.startDate) {
      toast.error('End date must be after start date'); return;
    }

    // conflict check — only relevant if position or member changed
    if (form.position !== selected.position) {
      const conflict = activeForPosition(form.position);
      if (conflict && conflict.id !== selected.id) {
        toast.error(
          `${positionLabel(form.position)} is already held by ${memberName(conflict.memberId)}.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'leadership', selected.id), {
        memberId:  form.memberId,
        position:  form.position,
        startDate: toDate(form.startDate),
        endDate:   form.endDate ? toDate(form.endDate) : null,
        notes:     form.notes.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
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
        endDate:   new Date(),   // record actual end date
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

  // ── shared appointment form ───────────────────────────────────────────────
  const AppointmentForm = ({ onSubmit, isEdit = false }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Club Member *
        </label>
        <select
          required
          value={form.memberId}
          onChange={e => setForm({ ...form, memberId: e.target.value })}
          className="input-field"
        >
          <option value="">Select an active member…</option>
          {members.map(m => (
            <option key={m.id} value={m.id}>
              {m.fullName} — {m.universityId || m.email}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">
          Only active members are listed. Approve pending members first.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Official Position *
        </label>
        <select
          required
          value={form.position}
          onChange={e => setForm({ ...form, position: e.target.value })}
          className="input-field"
        >
          {POSITIONS.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
        {!isEdit && activeForPosition(form.position) && (
          <p className="text-xs text-red-500 mt-1">
            ⚠ {positionLabel(form.position)} is currently held by{' '}
            <strong>{memberName(activeForPosition(form.position).memberId)}</strong>.
            End their appointment first.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date *
          </label>
          <input
            type="date" required
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="date"
            min={form.startDate}
            value={form.endDate}
            onChange={e => setForm({ ...form, endDate: e.target.value })}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          className="input-field resize-none"
          placeholder="Any relevant notes about this appointment…"
        />
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
            Manage official position appointments · {current.length} active, {history.length} historical
          </p>
        </div>
        <button onClick={openAssign} className="btn-primary flex items-center gap-2 self-start">
          <Plus className="h-4 w-4" /> Assign Position
        </button>
      </div>

      {/* Available positions overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {POSITIONS.map(pos => {
          const appt = activeForPosition(pos.id);
          const soon = appt && endingSoon(appt);
          return (
            <div key={pos.id} className={`card p-5 ${soon ? 'border-2 border-yellow-400' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {pos.label}
                </span>
                {appt
                  ? <ApptBadge status="active" />
                  : <span className="text-xs text-gray-400 italic">Vacant</span>
                }
              </div>

              {appt ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary-600 text-sm">
                        {memberName(appt.memberId).charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{memberName(appt.memberId)}</p>
                      <p className="text-xs text-gray-500">Since {formatDate(appt.startDate)}</p>
                    </div>
                  </div>
                  {appt.endDate && (
                    <p className={`text-xs mb-3 ${soon ? 'text-yellow-600 font-medium' : 'text-gray-500'}`}>
                      {soon ? '⚠ Term ending: ' : 'Term until: '}
                      {formatDate(appt.endDate)}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(appt)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1.5 rounded text-xs transition-colors">
                      <Edit2 className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => setEndModal(appt)}
                      className="flex-1 flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded text-xs transition-colors">
                      <X className="h-3 w-3" /> End Term
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => { setForm({ ...emptyForm, position: pos.id }); setAssignModal(true); }}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-primary-400 text-gray-500 hover:text-primary-600 py-3 rounded-lg text-sm transition-colors">
                  <Plus className="h-4 w-4" /> Assign
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* History toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowHistory(h => !h)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <History className="h-4 w-4" />
          {showHistory ? 'Hide' : 'Show'} appointment history ({history.length})
          {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* History table */}
      {showHistory && (
        history.length === 0 ? (
          <div className="card p-8 text-center text-gray-500 text-sm">
            No historical appointments yet.
          </div>
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
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {memberName(appt.memberId)}
                    </td>
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

      {/* ── ASSIGN MODAL ── */}
      {assignModal && (
        <Modal title="Assign Official Position" onClose={() => setAssignModal(false)}>
          <AppointmentForm onSubmit={saveAssign} isEdit={false} />
        </Modal>
      )}

      {/* ── EDIT MODAL ── */}
      {editModal && selected && (
        <Modal title={`Edit — ${positionLabel(selected.position)}`} onClose={() => setEditModal(false)}>
          <AppointmentForm onSubmit={saveEdit} isEdit={true} />
        </Modal>
      )}

      {/* ── END APPOINTMENT CONFIRM ── */}
      {endModal && (
        <Modal title="End Appointment" onClose={() => setEndModal(null)} size="sm">
          <div className="flex items-start gap-3 mb-6">
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">
                End {positionLabel(endModal.position)} appointment for{' '}
                <strong>{memberName(endModal.memberId)}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Their historical record will be preserved. This position will become
                vacant and can be assigned to another member.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={confirmEnd} className="btn-primary flex-1 bg-red-600 hover:bg-red-700">
              Yes, End Appointment
            </button>
            <button onClick={() => setEndModal(null)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex-1">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Leadership;
