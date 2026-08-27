import React, { useState, useEffect } from 'react';
import { ShieldCheck, Heart, Trash2, Calendar, Check, AlertCircle, Sparkles } from 'lucide-react';
import { CycleProfile, UserProfile } from '../types';
import { saveCycleProfile, deleteCycleProfile, fetchCycleProfile } from '../services/firestoreService';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface CycleSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserProfile;
  profile?: CycleProfile | null;
  onSaveProfile?: (profile: CycleProfile) => Promise<void>;
  onProfileUpdated?: (profile: CycleProfile | null) => void;
}

const COMMON_SYMPTOMS = [
  'Low energy',
  'Emotional sensitivity',
  'Creative surge',
  'Brain fog',
  'Restlessness',
  'Deep focus',
  'Need for quiet solitude',
  'Physical fatigue',
];

export const CycleSettingsModal: React.FC<CycleSettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  profile: initialProfile,
  onSaveProfile,
  onProfileUpdated,
}) => {
  const uid = user?.uid || initialProfile?.userId || '';
  const [profile, setProfile] = useState<CycleProfile>({
    userId: uid,
    optedIn: false,
    genderIdentity: 'Prefer not to say',
    lastPeriodStart: '',
    cycleLengthDays: 28,
    symptoms: [],
    notes: '',
    updatedAt: Date.now(),
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    } else if (isOpen && uid) {
      fetchCycleProfile(uid).then((p) => {
        if (p) {
          setProfile(p);
        }
      });
    }
  }, [isOpen, uid, initialProfile]);

  if (!isOpen) return null;

  const handleToggleSymptom = (sym: string) => {
    const current = profile.symptoms || [];
    const updated = current.includes(sym) ? current.filter((s) => s !== sym) : [...current, sym];
    setProfile({ ...profile, symptoms: updated });
  };

  const handleSave = async () => {
    if (!uid) return;
    setIsSaving(true);
    setSaveSuccess(false);
    const updated: CycleProfile = {
      ...profile,
      userId: uid,
      updatedAt: Date.now(),
    };
    if (onSaveProfile) {
      await onSaveProfile(updated);
    } else {
      await saveCycleProfile(uid, updated);
    }
    if (onProfileUpdated) onProfileUpdated(updated);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  const handleConfirmDelete = async () => {
    if (!uid) return;
    setIsDeleting(true);
    try {
      await deleteCycleProfile(uid);
      const empty: CycleProfile = {
        userId: uid,
        optedIn: false,
        updatedAt: Date.now(),
      };
      setProfile(empty);
      if (onProfileUpdated) onProfileUpdated(null);
      setIsDeleteModalOpen(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Heart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                Cycle-Aware Support (Optional)
              </h3>
              <p className="text-[11px] text-stone-500">
                Private, gentle contextual insights tailored to your rhythm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-base font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Opt-In Switch */}
        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
          <div className="space-y-0.5 max-w-xs">
            <span className="text-xs font-semibold text-stone-900">
              Enable optional cycle awareness
            </span>
            <p className="text-[11px] text-stone-500 leading-tight">
              Allows the AI companion to offer gentle, non-clinical reflections if energy or mood shifts align with cycle phases.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={profile.optedIn}
              onChange={(e) => setProfile({ ...profile, optedIn: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
          </label>
        </div>

        {/* Configuration Fields when Opted In */}
        {profile.optedIn && (
          <div className="space-y-4 pt-1 animate-fade-in">
            
            {/* Gender Identity */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Gender Identity (Inclusive & Non-prescriptive)
              </label>
              <select
                value={profile.genderIdentity || 'Prefer not to say'}
                onChange={(e) => setProfile({ ...profile, genderIdentity: e.target.value })}
                className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
              >
                <option value="Woman">Woman</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Man">Man</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            {/* Last period date & cycle length */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Last Period Start Date
                </label>
                <input
                  type="date"
                  value={profile.lastPeriodStart || ''}
                  onChange={(e) => setProfile({ ...profile, lastPeriodStart: e.target.value })}
                  className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Typical Cycle Length (Days)
                </label>
                <input
                  type="number"
                  min={20}
                  max={45}
                  value={profile.cycleLengthDays || 28}
                  onChange={(e) => setProfile({ ...profile, cycleLengthDays: Number(e.target.value) })}
                  className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            {/* Common Symptoms / Tendencies */}
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Common Tendencies / Sensations
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SYMPTOMS.map((sym) => {
                  const active = profile.symptoms?.includes(sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleToggleSymptom(sym)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-rose-100 text-rose-900 border border-rose-200'
                          : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Privacy Assurance */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-2 text-[11px] text-stone-500">
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                Cycle information is strictly stored under your private account. It is never used to diagnose medical conditions or dismiss real feelings.
              </span>
            </div>

          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100">
          {profile.optedIn ? (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-xs text-rose-700 hover:text-rose-900 flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Cycle Data</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-stone-500 hover:text-stone-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Preferences Saved</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Cycle Data?"
        description="This will permanently delete all cycle-aware data and disable cycle context from your reflections."
        confirmLabel="Delete Permanently"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};
