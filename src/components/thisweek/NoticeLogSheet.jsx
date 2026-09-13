import React from 'react';
import { X } from 'lucide-react';
import DuringScreen from './screens/DuringScreen';
import { useThisWeek } from './useThisWeek';

/**
 * "Word said / attempted / book read" notes for this week. These weekly_logs
 * rows feed the suggestion engine, and the only way to add them used to be
 * step 3 of the retired wizard. Mounted only when opened, so Home does not
 * load what useThisWeek loads.
 */
const NoticeLogSheet = ({ onClose }) => {
  const { logs, addLog, deleteLog } = useThisWeek();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Note what you noticed"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto relative p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-[hsl(var(--muted))] border-0 bg-transparent cursor-pointer"
        >
          <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </button>
        <DuringScreen logs={logs} addLog={addLog} deleteLog={deleteLog} />
      </div>
    </div>
  );
};

export default NoticeLogSheet;
