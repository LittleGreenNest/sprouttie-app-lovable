import React from 'react';
import { motion } from 'framer-motion';

const NotesList = ({ notes = [] }) => {
  if (notes.length === 0) return null;

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
        <span>📔</span> Today's Observations
      </h3>
      
      <div className="space-y-3">
        {notes.map((note, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-r from-[hsl(var(--sprouttie-mint))] to-[hsl(var(--sprouttie-cream))] rounded-lg p-4 border-l-4 border-[hsl(var(--sprouttie-green))]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-[hsl(var(--foreground))] leading-relaxed">
                  {note.text}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="font-semibold">by {note.by}</span>
              <span>•</span>
              <span>{formatTime(note.time)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default NotesList;
