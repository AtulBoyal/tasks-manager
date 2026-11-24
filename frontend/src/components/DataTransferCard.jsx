import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTaskContext } from '../context/TaskContext';
import {
  toExportJson,
  toCsv,
  exportFileName,
  prepareImport,
  MAX_IMPORT_BYTES
} from '../utils/taskTransfer';

const buttonClass =
  "px-4 py-2 rounded-xl font-semibold transition disabled:opacity-50";
const primaryButton = `${buttonClass} bg-orange-500 hover:bg-orange-600 text-white`;
const secondaryButton =
  `${buttonClass} border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700`;

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

const downloadFile = (content, mimeType, extension) => {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(extension);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

export default function DataTransferCard({ className }) {
  const { tasks, importTasks } = useTaskContext();
  const [preview, setPreview] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const exportJson = () => {
    downloadFile(toExportJson(tasks), 'application/json', 'json');
    toast.success(`Exported ${plural(tasks.length, 'task')}`);
  };

  const exportCsv = () => {
    // BOM so Excel opens the UTF-8 file (accents, emoji) correctly
    downloadFile(`\uFEFF${toCsv(tasks)}`, 'text/csv;charset=utf-8', 'csv');
    toast.success(`Exported ${plural(tasks.length, 'task')}`);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow choosing the same file again
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
      toast.error('That file is larger than 5 MB.');
      return;
    }

    try {
      const text = await file.text();
      setPreview({ fileName: file.name, ...prepareImport(text, file.name, tasks) });
    } catch (error) {
      toast.error(error.message || 'Could not read that file.');
    }
  };

  const confirmImport = async () => {
    setIsImporting(true);
    try {
      const created = await importTasks(preview.tasks);
      toast.success(`Imported ${plural(created.length, 'task')}`);
      setPreview(null);
    } catch (error) {
      console.error('Import failed:', error);
      const done = error.importedCount ?? 0;
      toast.error(
        done > 0
          ? `Imported ${done} of ${preview.tasks.length} tasks, then failed: ${error.message}. Choose the file again to import the rest; duplicates are skipped.`
          : `Import failed: ${error.message}`
      );
      // Already-imported tasks are now duplicates, so make the user re-check the file
      if (done > 0) setPreview(null);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={className}>
      <h2 className="flex items-center gap-2 text-xl font-bold text-orange-500 mb-2">
        💾 Your Data
      </h2>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Download a backup of all {plural(tasks.length, 'task')} (including completed and
        archived), or import tasks from a backup or spreadsheet.
      </p>

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={exportJson} className={primaryButton}>
          Export JSON (backup)
        </button>
        <button type="button" onClick={exportCsv} className={secondaryButton}>
          Export CSV (spreadsheet)
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className={secondaryButton}
        >
          Import…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv,application/json,text/csv"
          onChange={handleFile}
          className="hidden"
          aria-label="Import file"
        />
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        CSV imports need a <code>name</code> column; <code>priority</code>, <code>deadline</code>{' '}
        (YYYY-MM-DD), <code>status</code>, <code>recurrence</code> and <code>tags</code> are optional.
      </p>

      {preview && (
        <div
          role="region"
          aria-label="Import preview"
          className="mt-5 rounded-xl border border-orange-200 dark:border-slate-600 bg-orange-50/50 dark:bg-slate-900/50 p-4"
        >
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {preview.tasks.length > 0
              ? `Ready to import ${plural(preview.tasks.length, 'task')} from ${preview.fileName}`
              : `Nothing new to import from ${preview.fileName}`}
          </p>

          {(preview.duplicates > 0 || preview.invalid.length > 0) && (
            <ul className="mt-2 text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 space-y-1">
              {preview.duplicates > 0 && (
                <li>Skipping {plural(preview.duplicates, 'duplicate')} you already have</li>
              )}
              {preview.invalid.length > 0 && (
                <li>
                  Skipping {plural(preview.invalid.length, 'invalid row')}:{' '}
                  {preview.invalid.slice(0, 5).join('; ')}
                  {preview.invalid.length > 5 && ` and ${preview.invalid.length - 5} more`}
                </li>
              )}
            </ul>
          )}

          <div className="mt-4 flex gap-3">
            {preview.tasks.length > 0 && (
              <button type="button" onClick={confirmImport} disabled={isImporting} className={primaryButton}>
                {isImporting ? 'Importing…' : `Import ${plural(preview.tasks.length, 'task')}`}
              </button>
            )}
            <button type="button" onClick={() => setPreview(null)} disabled={isImporting} className={secondaryButton}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
