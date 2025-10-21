import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const StickyNoteButton = ({ onAddNote, familyMember }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedEmojis, setSelectedEmojis] = useState([]);

  const emojiTags = [
    { emoji: '🌸', label: 'Recognized' },
    { emoji: '🌟', label: 'Spoke Correctly' },
    { emoji: '❤️', label: 'Cute Moment' },
    { emoji: '🎉', label: 'Breakthrough' },
    { emoji: '🤔', label: 'Struggled' },
    { emoji: '😊', label: 'Happy' }
  ];

  const toggleEmoji = (emoji) => {
    setSelectedEmojis(prev => 
      prev.includes(emoji) 
        ? prev.filter(e => e !== emoji)
        : [...prev, emoji]
    );
  };

  const handleSubmit = () => {
    if (!noteText.trim() && selectedEmojis.length === 0) return;

    const fullNote = [
      ...selectedEmojis,
      noteText.trim()
    ].filter(Boolean).join(' ');

    onAddNote(fullNote);
    setNoteText('');
    setSelectedEmojis([]);
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-[hsl(var(--sprouttie-coral))] to-[hsl(var(--sprouttie-coral-dark))] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-2xl"
      >
        📝
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />

            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-6 m-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[hsl(var(--foreground))]">
                    📝 Add Observation
                  </h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Emoji tags */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">
                    Tag the moment:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {emojiTags.map((tag) => (
                      <motion.button
                        key={tag.emoji}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleEmoji(tag.emoji)}
                        className={`
                          px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all
                          ${selectedEmojis.includes(tag.emoji)
                            ? 'bg-[hsl(var(--sprouttie-coral-light))] border-[hsl(var(--sprouttie-coral))] text-[hsl(var(--sprouttie-coral-dark))]'
                            : 'bg-white border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--sprouttie-coral-light))]'
                          }
                        `}
                      >
                        {tag.emoji} {tag.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Note textarea */}
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="What did you notice today? Any special moments or progress?"
                  className="w-full h-32 p-3 border-2 border-[hsl(var(--border))] rounded-lg resize-none focus:outline-none focus:border-[hsl(var(--sprouttie-green))] transition-colors"
                />

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!noteText.trim() && selectedEmojis.length === 0}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-lg hover:shadow-md transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default StickyNoteButton;
