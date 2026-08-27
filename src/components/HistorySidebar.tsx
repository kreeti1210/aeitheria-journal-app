import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Zap,
  FileText,
  HelpCircle,
  RefreshCw,
  Tag,
  Download,
  Filter,
  ChevronRight,
  MessageSquare,
  Wind,
  PenLine,
  Compass,
  Lock,
  X
} from 'lucide-react';
import { JournalInteraction, JournalEntry, VentSession, ReflectionMode } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface HistorySidebarProps {
  interactions: JournalInteraction[];
  journalEntries: JournalEntry[];
  ventSessions: VentSession[];
  activeId: string | null;
  onSelectInteraction: (interaction: JournalInteraction) => void;
  onSelectJournalEntry: (entry: JournalEntry) => void;
  onSelectVentSession?: (session: VentSession) => void;
  onNewReflection: () => void;
  onDeleteInteraction: (id: string) => Promise<void>;
  onDeleteJournalEntry: (id: string) => Promise<void>;
  onDeleteVentSession?: (id: string) => Promise<void>;
  loading: boolean;
  onClose?: () => void;
}

type VaultTab = 'all' | 'journal' | 'conversations' | 'vents';

interface PendingDelete {
  type: 'journal' | 'interaction' | 'vent';
  id: string;
  title: string;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  interactions,
  journalEntries,
  ventSessions,
  activeId,
  onSelectInteraction,
  onSelectJournalEntry,
  onSelectVentSession,
  onNewReflection,
  onDeleteInteraction,
  onDeleteJournalEntry,
  onDeleteVentSession,
  loading,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVaultTab, setActiveVaultTab] = useState<VaultTab>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  // Filtered lists
  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q)) ||
        item.messages?.some((m) => m.content?.toLowerCase().includes(q)) ||
        item.summary?.toLowerCase().includes(q)
      );
    });
  }, [interactions, searchQuery]);

  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q)) ||
        item.content?.toLowerCase().includes(q)
      );
    });
  }, [journalEntries, searchQuery]);

  const filteredVentSessions = useMemo(() => {
    return ventSessions.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.content?.toLowerCase().includes(q) ||
        item.userSelectedEmotions?.some((e) => e.toLowerCase().includes(q))
      );
    });
  }, [ventSessions, searchQuery]);

  const handleRequestDeleteInteraction = (e: React.MouseEvent, item: JournalInteraction) => {
    e.stopPropagation();
    setPendingDelete({
      type: 'interaction',
      id: item.id,
      title: item.title || 'Untitled Talk',
    });
  };

  const handleRequestDeleteJournal = (e: React.MouseEvent, entry: JournalEntry) => {
    e.stopPropagation();
    setPendingDelete({
      type: 'journal',
      id: entry.id,
      title: entry.title || 'Untitled Journal Entry',
    });
  };

  const handleRequestDeleteVent = (e: React.MouseEvent, vent: VentSession) => {
    e.stopPropagation();
    setPendingDelete({
      type: 'vent',
      id: vent.id,
      title: 'Secret Vent Session',
    });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.id);
    try {
      if (pendingDelete.type === 'interaction') {
        await onDeleteInteraction(pendingDelete.id);
      } else if (pendingDelete.type === 'journal') {
        await onDeleteJournalEntry(pendingDelete.id);
      } else if (pendingDelete.type === 'vent' && onDeleteVentSession) {
        await onDeleteVentSession(pendingDelete.id);
      }
    } finally {
      setDeletingId(null);
      setPendingDelete(null);
    }
  };

  const handleExportAll = () => {
    const backupData = {
      conversations: interactions,
      journalEntries,
      ventSessions,
      exportedAt: new Date().toISOString(),
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aetheria_journal_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const totalCount = interactions.length + journalEntries.length + ventSessions.length;

  return (
    <aside id="history-sidebar" className="w-full bg-white flex flex-col h-full shrink-0 overflow-hidden">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-stone-100 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-900">Vault</span>
            <span className="text-[11px] font-medium px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
              {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {totalCount > 0 && (
              <button
                onClick={handleExportAll}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                title="Export all data (JSON)"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              id="btn-sidebar-new"
              onClick={onNewReflection}
              className="p-1.5 text-stone-900 hover:bg-stone-100 rounded-md transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
              title="Start New Thought"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
            </button>
            {onClose && (
              <button
                id="btn-sidebar-close"
                onClick={onClose}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer ml-0.5"
                title="Close Vault"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-stone-400" />
          <input
            id="input-search-history"
            type="text"
            placeholder="Search entries, talks, vents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:border-stone-400 transition-all"
          />
        </div>

        {/* Vault Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
          <button
            onClick={() => setActiveVaultTab('all')}
            className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeVaultTab === 'all'
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            All ({totalCount})
          </button>

          <button
            onClick={() => setActiveVaultTab('journal')}
            className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeVaultTab === 'journal'
                ? 'bg-emerald-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Journal ({journalEntries.length})
          </button>

          <button
            onClick={() => setActiveVaultTab('conversations')}
            className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeVaultTab === 'conversations'
                ? 'bg-purple-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Talks ({interactions.length})
          </button>

          <button
            onClick={() => setActiveVaultTab('vents')}
            className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeVaultTab === 'vents'
                ? 'bg-rose-800 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Vents ({ventSessions.length})
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-stone-400 text-xs flex flex-col items-center gap-2">
            <div className="h-5 w-5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
            <span>Syncing from private vault...</span>
          </div>
        ) : totalCount === 0 ? (
          <div className="py-12 px-4 text-center text-stone-400 text-xs space-y-3">
            <p className="font-medium text-stone-600">Your vault is clean</p>
            <p className="text-[11px] text-stone-400">Write a journal entry, vent out freely, or start a talk session.</p>
          </div>
        ) : (
          <>
            {/* Journal Entries */}
            {(activeVaultTab === 'all' || activeVaultTab === 'journal') &&
              filteredJournalEntries.map((entry) => {
                const isActive = entry.id === activeId;
                return (
                  <div
                    key={entry.id}
                    id={`journal-item-${entry.id}`}
                    onClick={() => onSelectJournalEntry(entry)}
                    className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-emerald-50/70 border-emerald-300 text-stone-900 shadow-xs'
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <PenLine className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        <h4 className="text-xs font-semibold truncate leading-snug text-stone-900">
                          {entry.title || 'Untitled Journal Entry'}
                        </h4>
                      </div>

                      <button
                        onClick={(e) => handleRequestDeleteJournal(e, entry)}
                        disabled={deletingId === entry.id}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 rounded transition-all shrink-0 cursor-pointer"
                        title="Delete Entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="mt-1 text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                      {entry.content || 'Empty entry'}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-stone-400">
                      <span>{formatDate(entry.updatedAt || entry.createdAt)}</span>
                      {entry.mood && (
                        <span className="text-emerald-700 font-medium">{entry.mood}</span>
                      )}
                    </div>
                  </div>
                );
              })}

            {/* Talk Conversations */}
            {(activeVaultTab === 'all' || activeVaultTab === 'conversations') &&
              filteredInteractions.map((item) => {
                const isActive = item.id === activeId;
                const messageCount = item.messages?.length || 0;
                const previewText = item.messages?.[0]?.content || item.initialPrompt || 'Empty session';

                return (
                  <div
                    key={item.id}
                    id={`interaction-item-${item.id}`}
                    onClick={() => onSelectInteraction(item)}
                    className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-purple-50/70 border-purple-300 text-stone-900 shadow-xs'
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Sparkles className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                        <h4 className="text-xs font-semibold truncate leading-snug text-stone-900">
                          {item.title || 'Untitled Talk'}
                        </h4>
                      </div>

                      <button
                        onClick={(e) => handleRequestDeleteInteraction(e, item)}
                        disabled={deletingId === item.id}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 rounded transition-all shrink-0 cursor-pointer"
                        title="Delete Session"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="mt-1 text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                      {previewText}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-stone-400">
                      <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                      <span>{messageCount} turn{messageCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                );
              })}

            {/* Secret Vent Sessions */}
            {(activeVaultTab === 'all' || activeVaultTab === 'vents') &&
              filteredVentSessions.map((vent) => {
                const isActive = vent.id === activeId;

                return (
                  <div
                    key={vent.id}
                    id={`vent-item-${vent.id}`}
                    onClick={() => onSelectVentSession && onSelectVentSession(vent)}
                    className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'bg-rose-50/80 border-rose-300 text-stone-900 shadow-xs'
                        : 'bg-white hover:bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Lock className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <h4 className="text-xs font-semibold truncate leading-snug text-stone-900">
                          Secret Vent Session
                        </h4>
                      </div>

                      <button
                        onClick={(e) => handleRequestDeleteVent(e, vent)}
                        disabled={deletingId === vent.id}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 rounded transition-all shrink-0 cursor-pointer"
                        title="Delete Secret Vent"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="mt-1 text-[11px] text-stone-500 line-clamp-2 leading-relaxed italic">
                      "{vent.content || 'Empty vent session'}"
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-stone-400">
                      <span>{formatDate(vent.createdAt)}</span>
                      <span className="text-rose-700 font-medium">{vent.wordCount || 0} words &bull; Private</span>
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-stone-100 bg-stone-50/70 shrink-0 flex items-center justify-between text-[10px] text-stone-500">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Private Firestore Vault</span>
        </span>
      </div>

      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!pendingDelete}
        title={
          pendingDelete?.type === 'vent'
            ? 'Delete Secret Vent?'
            : pendingDelete?.type === 'journal'
            ? 'Delete Journal Entry?'
            : 'Delete Conversation?'
        }
        description={
          pendingDelete?.type === 'vent'
            ? 'This secret vent session and any reflective journals derived from it will be permanently erased from your private vault. This cannot be undone.'
            : pendingDelete?.type === 'journal'
            ? `"${pendingDelete?.title}" will be permanently removed from your vault.`
            : `"${pendingDelete?.title}" and its reflection dialogue will be permanently deleted.`
        }
        confirmLabel="Delete Permanently"
        isDeleting={!!deletingId}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </aside>
  );
};
