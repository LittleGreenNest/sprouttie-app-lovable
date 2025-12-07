import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, Grid3X3, Download, FileSpreadsheet, Plus, Trash2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../context/AuthContext';

const ACTIVITY_ICONS = {
  print_flashcards: Printer,
  bingo_generated: Grid3X3,
  export_data: Download,
  csv_import: FileSpreadsheet,
  flashcard_added: Plus,
  flashcard_deleted: Trash2
};

const ACTIVITY_COLORS = {
  print_flashcards: 'bg-blue-100 text-blue-600',
  bingo_generated: 'bg-purple-100 text-purple-600',
  export_data: 'bg-green-100 text-green-600',
  csv_import: 'bg-amber-100 text-amber-600',
  flashcard_added: 'bg-emerald-100 text-emerald-600',
  flashcard_deleted: 'bg-red-100 text-red-600'
};

const ACTIVITY_LABELS = {
  print_flashcards: 'Printed Flashcards',
  bingo_generated: 'Bingo Cards Generated',
  export_data: 'Data Exported',
  csv_import: 'CSV Imported',
  flashcard_added: 'Flashcard Added',
  flashcard_deleted: 'Flashcard Deleted'
};

const ActivityHistory = () => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (currentUser) {
      fetchActivities();
    }
  }, [currentUser]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredActivities = () => {
    if (filter === 'all') return activities;
    return activities.filter(a => a.activity_type === filter);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityStats = () => {
    const stats = {};
    activities.forEach(a => {
      stats[a.activity_type] = (stats[a.activity_type] || 0) + 1;
    });
    return stats;
  };

  const filteredActivities = getFilteredActivities();
  const stats = getActivityStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[hsl(var(--sprouttie-green))]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[hsl(var(--foreground))]">Activity History</h2>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">Track your prints, bingo games, exports, and more</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Printer className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.print_flashcards || 0}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Prints</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Grid3X3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.bingo_generated || 0}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Bingo Cards</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Download className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.export_data || 0}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Exports</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100">
              <FileSpreadsheet className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{stats.csv_import || 0}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Imports</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'all' 
              ? 'bg-[hsl(var(--sprouttie-green))] text-white' 
              : 'bg-slate-100 text-[hsl(var(--foreground))] hover:bg-slate-200'
          }`}
        >
          All Activities
        </button>
        <button
          onClick={() => setFilter('print_flashcards')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'print_flashcards' 
              ? 'bg-blue-500 text-white' 
              : 'bg-slate-100 text-[hsl(var(--foreground))] hover:bg-slate-200'
          }`}
        >
          Prints
        </button>
        <button
          onClick={() => setFilter('bingo_generated')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'bingo_generated' 
              ? 'bg-purple-500 text-white' 
              : 'bg-slate-100 text-[hsl(var(--foreground))] hover:bg-slate-200'
          }`}
        >
          Bingo
        </button>
        <button
          onClick={() => setFilter('export_data')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            filter === 'export_data' 
              ? 'bg-green-500 text-white' 
              : 'bg-slate-100 text-[hsl(var(--foreground))] hover:bg-slate-200'
          }`}
        >
          Exports
        </button>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <Clock className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">No activities yet</h3>
            <p className="text-[hsl(var(--muted-foreground))] text-center max-w-sm">
              Your activity history will appear here when you print flashcards, generate bingo cards, or export data.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredActivities.map((activity, index) => {
              const IconComponent = ACTIVITY_ICONS[activity.activity_type] || Clock;
              const colorClass = ACTIVITY_COLORS[activity.activity_type] || 'bg-slate-100 text-slate-600';
              
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[hsl(var(--foreground))]">
                      {ACTIVITY_LABELS[activity.activity_type] || activity.activity_type}
                    </p>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] truncate">
                      {activity.description}
                    </p>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {activity.metadata.count && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                            {activity.metadata.count} items
                          </span>
                        )}
                        {activity.metadata.gridSize && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                            {activity.metadata.gridSize}×{activity.metadata.gridSize} grid
                          </span>
                        )}
                        {activity.metadata.category && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                            {activity.metadata.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                    {formatDate(activity.created_at)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityHistory;
