import React, { useState } from 'react';
import { Upload, Download, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const PronunciationCSVImport = () => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

  const downloadTemplate = () => {
    const template = `word_text,language,audio_url,phonetic,example_sentence
公共汽车,en,https://example.com/audio/bus-en.mp3,gōng gòng qì chē,"I take the bus to work"
公共汽车,zh,https://example.com/audio/bus-zh.mp3,gōng gòng qì chē,我坐公共汽车去上班
汽车,en,https://example.com/audio/car-en.mp3,qì chē,This is my car
汽车,zh,https://example.com/audio/car-zh.mp3,qì chē,这是我的汽车`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pronunciation-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          toast.error('Error parsing CSV file');
          console.error(results.errors);
          return;
        }

        // Validate data
        const validData = results.data.filter(row => {
          return row.word_text && row.language && row.audio_url;
        });

        if (validData.length === 0) {
          toast.error('No valid data found in CSV. Make sure it has word_text, language, and audio_url columns.');
          return;
        }

        setPreview(validData);
        setShowPreview(true);
        toast.info(`Found ${validData.length} valid pronunciation entries`);
      },
      error: (error) => {
        toast.error('Failed to parse CSV file');
        console.error(error);
      }
    });
  };

  const handleImport = async () => {
    setUploading(true);
    setImportResults(null);

    try {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      // Insert pronunciations in batches
      const batchSize = 50;
      for (let i = 0; i < preview.length; i += batchSize) {
        const batch = preview.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('pronunciations')
          .insert(
            batch.map(row => ({
              word_text: row.word_text.trim(),
              language: row.language.trim(),
              audio_url: row.audio_url.trim(),
              phonetic: row.phonetic?.trim() || null,
              example_sentence: row.example_sentence?.trim() || null
            }))
          );

        if (error) {
          results.failed += batch.length;
          results.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
        } else {
          results.success += batch.length;
        }
      }

      setImportResults(results);

      if (results.success > 0) {
        toast.success(`Successfully imported ${results.success} pronunciations!`);
      }
      if (results.failed > 0) {
        toast.error(`Failed to import ${results.failed} pronunciations`);
      }

      // Clear preview after successful import
      if (results.failed === 0) {
        setShowPreview(false);
        setPreview([]);
      }
    } catch (error) {
      toast.error('Failed to import pronunciations');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleAutoGenerate = async () => {
    try {
      setIsGenerating(true);
      
      // Get all words without audio
      const { data: wordsWithoutAudio, error: fetchError } = await supabase
        .from('pronunciations')
        .select('word_text, language')
        .is('audio_url', null)
        .limit(100); // Limit to avoid overwhelming the API

      if (fetchError) throw fetchError;

      if (!wordsWithoutAudio || wordsWithoutAudio.length === 0) {
        toast.info('All words already have audio recordings!');
        setIsGenerating(false);
        return;
      }

      setGenerationProgress({ current: 0, total: wordsWithoutAudio.length });
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < wordsWithoutAudio.length; i++) {
        const { word_text, language } = wordsWithoutAudio[i];
        
        try {
          const { data, error } = await supabase.functions.invoke('generate-pronunciation', {
            body: { word_text, language }
          });

          if (error) throw error;
          
          if (data?.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (err) {
          console.error(`Failed to generate audio for ${word_text}:`, err);
          errorCount++;
        }

        setGenerationProgress({ current: i + 1, total: wordsWithoutAudio.length });
      }

      toast.success(`Generated ${successCount} audio files! ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
      
    } catch (error) {
      console.error('Auto-generation error:', error);
      toast.error('Failed to auto-generate pronunciations');
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">📁 Bulk Import Pronunciations</h2>
          <p className="text-gray-600">Upload a CSV file to add multiple pronunciation audio URLs at once</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl hover:shadow-lg transition-all"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating {generationProgress.current}/{generationProgress.total}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Auto-Generate Audio
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Section */}
      {!showPreview && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[hsl(var(--sprouttie-green))] transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Drop your CSV file here or click to browse</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="inline-block px-6 py-3 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl cursor-pointer hover:shadow-lg transition-all"
          >
            Choose CSV File
          </label>
        </div>
      )}

      {/* Preview Section */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  Preview ({preview.length} entries)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      setPreview([]);
                    }}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={uploading}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[hsl(var(--sprouttie-green))] to-[hsl(var(--sprouttie-green-dark))] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Import All
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Word</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Language</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Audio URL</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Phonetic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{row.word_text}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {row.language}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 truncate max-w-xs">{row.audio_url}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{row.phonetic || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 10 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    ... and {preview.length - 10} more entries
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Results */}
      <AnimatePresence>
        {importResults && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-gray-800 mb-2">Import Complete</h4>
                <div className="space-y-1 text-sm">
                  <p className="text-green-700">✓ Successfully imported: {importResults.success}</p>
                  {importResults.failed > 0 && (
                    <p className="text-red-700">✗ Failed: {importResults.failed}</p>
                  )}
                </div>
                {importResults.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-red-600 font-medium">View Errors</summary>
                    <ul className="mt-2 space-y-1 text-xs text-red-700">
                      {importResults.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-2">📋 CSV Format Instructions</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Required columns:</strong> word_text, language, audio_url</li>
          <li>• <strong>Optional columns:</strong> phonetic, example_sentence</li>
          <li>• <strong>Supported languages:</strong> en (English), zh (华语), yue (粤语), nan (福建话)</li>
          <li>• Audio URLs must be publicly accessible</li>
          <li>• Download the template above to see the correct format</li>
        </ul>
      </div>
    </div>
  );
};

export default PronunciationCSVImport;
