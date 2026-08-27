import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  PenLine,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  Smile,
  ChevronDown,
  Sparkles,
  ChevronLeft,
  Trash2,
  Calendar,
  Lock,
  Eye,
  Edit3,
  ArrowUpRight
} from 'lucide-react';
import { JournalEntry, UserProfile, SaveStatus } from '../types';
import { saveJournalEntry, deleteJournalEntry } from '../services/firestoreService';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ClassicJournalEditorProps {
  user: UserProfile;
  currentEntry: JournalEntry;
  onUpdateEntry: (entry: JournalEntry) => void;
  onBackToHome: () => void;
  onReflectWithAI: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => Promise<void> | void;
  onOpenVentSession?: (ventId: string) => void;
}

const MOODS = ['Calm', 'Grateful', 'Thoughtful', 'Focused', 'Restless', 'Overwhelmed', 'Hopeful'];

export const ClassicJournalEditor: React.FC<ClassicJournalEditorProps> = ({
  user,
  currentEntry,
  onUpdateEntry,
  onBackToHome,
  onReflectWithAI,
  onDeleteEntry,
  onOpenVentSession,
}) => {
  const isReflective = currentEntry.entryType === 'transformed_vent' || Boolean(currentEntry.sourceVentId);
  const [title, setTitle] = useState(currentEntry.title);
  const [content, setContent] = useState(currentEntry.content);
  const [mood, setMood] = useState(currentEntry.mood || '');
  const [tags, setTags] = useState<string[]>(currentEntry.tags || []);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showMoodDropdown, setShowMoodDropdown] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingFormatted, setIsEditingFormatted] = useState(false);

  // Sync state if currentEntry changes
  useEffect(() => {
    setTitle(currentEntry.title);
    setContent(currentEntry.content);
    setMood(currentEntry.mood || '');
    setTags(currentEntry.tags || []);
    setIsEditingFormatted(false);
  }, [currentEntry.id]);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteEntry(currentEntry.id);
      setIsDeleteModalOpen(false);
      onBackToHome();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (overrides?: Partial<JournalEntry>) => {
    setSaveStatus('saving');
    const updated: JournalEntry = {
      ...currentEntry,
      title: overrides?.title ?? title,
      content: overrides?.content ?? content,
      mood: overrides?.mood ?? mood,
      tags: overrides?.tags ?? tags,
      updatedAt: Date.now(),
    };

    const res = await saveJournalEntry(user.uid, updated);
    if (res.success) {
      setSaveStatus('saved');
      onUpdateEntry(updated);
    } else {
      setSaveStatus('error');
    }
  };

  const handleAddTag = () => {
    const clean = newTag.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      const updated = [...tags, clean];
      setTags(updated);
      setNewTag('');
      setShowTagInput(false);
      handleSave({ tags: updated });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    handleSave({ tags: updated });
  };

  const handleSelectMood = (m: string) => {
    setMood(m);
    setShowMoodDropdown(false);
    handleSave({ mood: m });
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div id="classic-journal-editor" className="flex-1 flex flex-col h-full bg-stone-50 overflow-hidden">
      
      {/* Top Header */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-2.5 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToHome}
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
            title="Back to home"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div>
            <h2 className="text-sm sm:text-base font-semibold text-stone-900 flex items-center gap-2">
              {isReflective ? (
                <>
                  <Sparkles className="h-4 w-4 text-rose-600" />
                  <span>Reflective Journal</span>
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4 text-emerald-800" />
                  <span>Private Journal</span>
                </>
              )}
            </h2>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Status */}
          <div className="flex items-center gap-1.5 text-xs font-medium">
            {saveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Saved</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={() => handleSave()}
                className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 cursor-pointer text-[11px]"
              >
                <AlertCircle className="h-3 w-3 text-red-600" />
                <span>Retry Save</span>
              </button>
            )}
          </div>

          {/* Toggle between Gemini-styled View and Edit for Reflective Journal */}
          {isReflective && (
            <button
              onClick={() => setIsEditingFormatted(!isEditingFormatted)}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer border border-stone-200"
              title={isEditingFormatted ? "Switch to formatted reading view" : "Edit raw text"}
            >
              {isEditingFormatted ? (
                <>
                  <Eye className="h-3 w-3 text-rose-600" />
                  <span>View Formatted</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-3 w-3 text-stone-600" />
                  <span>Edit Text</span>
                </>
              )}
            </button>
          )}

          {/* AI Reflection Bridge Button */}
          <button
            onClick={() => onReflectWithAI({ ...currentEntry, title, content, mood, tags })}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-900 text-xs font-medium rounded-xl transition-all cursor-pointer border border-stone-200"
            title="Reflect on this entry with AI companion"
          >
            <Sparkles className="h-3.5 w-3.5 text-rose-600" />
            <span>Reflect with AI</span>
          </button>

          {/* Delete Button */}
          <button
            id="btn-delete-journal-entry"
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
            title="Delete entry"
          >
            <Trash2 className="h-4 w-4" />
          </button>

        </div>

      </div>

      {/* Main Journal Writing Canvas */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 w-full">
        <div className="max-w-3xl mx-auto pb-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col space-y-3.5 focus-within:border-rose-300 focus-within:ring-2 focus-within:ring-rose-50 transition-all">
          
          {/* Source Vent Link Banner (Change 1: Safe Reference Badge) */}
          {currentEntry.sourceVentId && (
            <div className="px-3 py-1.5 bg-rose-50/60 border border-rose-200/70 rounded-xl flex items-center justify-between text-xs text-rose-950">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <span>
                  Originating from{' '}
                  <strong className="font-semibold text-rose-900">
                    {currentEntry.sourceVentTitle || 'Secret Vent Session'}
                  </strong>
                </span>
              </div>
              {onOpenVentSession && (
                <button
                  onClick={() => onOpenVentSession(currentEntry.sourceVentId!)}
                  className="flex items-center gap-0.5 text-[11px] font-medium text-rose-700 hover:text-rose-900 hover:underline cursor-pointer ml-2 shrink-0"
                  title="Navigate to originating vent session"
                >
                  <span>View vent</span>
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Entry Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaveStatus('saving');
            }}
            onBlur={() => handleSave()}
            placeholder="Entry Title..."
            className="w-full text-base sm:text-lg font-bold text-stone-900 placeholder-stone-300 border-b border-stone-100 pb-1.5 focus:outline-none focus:border-rose-400"
          />

          {/* Meta Bar: Mood & Tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            
            {/* Mood Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoodDropdown(!showMoodDropdown)}
                className="px-2.5 py-1 bg-stone-50 hover:bg-stone-100 text-stone-600 rounded-lg text-xs font-medium flex items-center gap-1 border border-stone-200 cursor-pointer"
              >
                <Smile className="h-3 w-3 text-rose-500" />
                <span>{mood || 'Select Mood'}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              {showMoodDropdown && (
                <div className="absolute left-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-stone-200 py-1 z-40">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => handleSelectMood(m)}
                      className="w-full text-left px-3 py-1.5 text-xs text-stone-700 hover:bg-rose-50 hover:text-rose-900 cursor-pointer"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md text-[11px] flex items-center gap-1 border border-stone-200"
              >
                #{t}
                <button
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-red-500 font-bold ml-0.5 cursor-pointer"
                >
                  &times;
                </button>
              </span>
            ))}

            {showTagInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="w-20 px-2 py-0.5 text-xs border border-rose-300 rounded focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleAddTag}
                  className="text-[10px] px-2 py-0.5 bg-stone-900 text-white rounded cursor-pointer"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="text-[11px] text-stone-400 hover:text-stone-700 flex items-center gap-0.5 cursor-pointer"
              >
                <Tag className="h-3 w-3" />
                <span>+Tag</span>
              </button>
            )}

            <div className="ml-auto text-[11px] text-stone-400">
              <span>{wordCount} words</span>
            </div>

          </div>

          {/* Content Body: Gemini Response Markdown Styling for Reflective Journals */}
          {isReflective && !isEditingFormatted ? (
            <div className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-4 sm:p-5">
              <div className="markdown-body text-xs sm:text-sm text-stone-800 leading-relaxed space-y-3">
                <Markdown>{content || '_No content_'}</Markdown>
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setSaveStatus('saving');
              }}
              onBlur={() => handleSave()}
              placeholder="Write your thoughts, memories, reflections, or moments here..."
              className="w-full bg-transparent text-sm sm:text-base text-stone-800 placeholder-stone-300 resize-none focus:outline-none leading-relaxed font-sans min-h-[220px]"
            />
          )}

          {/* Footer Save notice */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
            <span>Last updated {new Date(currentEntry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>Autosaves on edit</span>
          </div>

        </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        title="Delete Journal Entry?"
        description={`"${title || 'Untitled Entry'}" will be permanently removed from your private vault.`}
        confirmLabel="Delete Permanently"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />

    </div>
  );
};

