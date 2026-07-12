import React, { useEffect, useState } from 'react';
import InterfaceSelect from './InterfaceSelect.jsx';
import { categoryForFilename } from '../store/downloadsStore.js';

const CATEGORIES = ['Videos', 'Music', 'Documents', 'Compressed', 'Programs', 'Other'];

const URL_PATTERN = /^(https?|ftp|sftp):\/\/\S+$/i;

function filenameFromUrl(url) {
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last || u.hostname;
  } catch {
    return '';
  }
}

export default function AddDownloadDialog({ open, onClose, onSubmit, defaultInterface, defaultSaveDir }) {
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [saveDir, setSaveDir] = useState(defaultSaveDir || '');
  const [category, setCategory] = useState('Other');
  const [description, setDescription] = useState('');
  const [networkInterface, setNetworkInterface] = useState(null);
  const [startImmediately, setStartImmediately] = useState(true);
  const [maxConnections, setMaxConnections] = useState(8);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-detect a download-looking URL already sitting on the clipboard when the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError('');
    navigator.clipboard
      ?.readText()
      .then((text) => {
        const trimmed = text.trim();
        if (URL_PATTERN.test(trimmed)) {
          setUrl(trimmed);
          setFileName(filenameFromUrl(trimmed));
          setCategory(categoryForFilename(filenameFromUrl(trimmed)));
        }
      })
      .catch(() => {
        /* Clipboard access denied — silently skip auto-detect. */
      });
  }, [open]);

  useEffect(() => {
    if (defaultInterface && networkInterface === null) {
      // Leave as null ("use default") — defaultInterface is applied server-side
      // via the global option, we only show it as a placeholder hint.
    }
  }, [defaultInterface, networkInterface]);

  if (!open) return null;

  function handleUrlChange(value) {
    setUrl(value);
    if (value && !fileName) {
      const guessed = filenameFromUrl(value);
      setFileName(guessed);
      setCategory(categoryForFilename(guessed));
    }
  }

  async function handleChooseFolder() {
    const dir = await window.api.chooseFolder();
    if (dir) setSaveDir(dir);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!url.trim() || !URL_PATTERN.test(url.trim())) {
      setError('Enter a valid http(s), ftp, or sftp URL.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        urls: [url.trim()],
        dir: saveDir || undefined,
        out: fileName || undefined,
        category,
        description,
        networkInterface,
        maxConnections,
        startImmediately
      });
      resetAndClose();
    } catch (err) {
      setError(err.message || 'Failed to add download.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetAndClose() {
    setUrl('');
    setFileName('');
    setDescription('');
    setNetworkInterface(null);
    onClose();
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && resetAndClose()}>
      <form className="modal add-download-dialog" onSubmit={handleSubmit}>
        <header className="modal-header">
          <h2>Add download</h2>
          <button type="button" className="icon-btn" onClick={resetAndClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="url">URL</label>
            <input
              id="url"
              type="text"
              autoFocus
              placeholder="https://example.com/file.zip"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="filename">File name</label>
              <input id="filename" type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="save-to">Save to</label>
            <div className="input-with-button">
              <input id="save-to" type="text" value={saveDir} onChange={(e) => setSaveDir(e.target.value)} placeholder="Default download folder" />
              <button type="button" className="btn-secondary" onClick={handleChooseFolder}>
                Browse…
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional note" />
          </div>

          <InterfaceSelect value={networkInterface} onChange={setNetworkInterface} />

          <div className="field">
            <label htmlFor="max-conn">Max connections: {maxConnections}</label>
            <input
              id="max-conn"
              type="range"
              min={1}
              max={32}
              value={maxConnections}
              onChange={(e) => setMaxConnections(Number(e.target.value))}
            />
          </div>

          <div className="field field-inline">
            <label>
              <input
                type="checkbox"
                checked={startImmediately}
                onChange={(e) => setStartImmediately(e.target.checked)}
              />
              Start immediately (unchecked adds to queue, paused)
            </label>
          </div>

          {error && <p className="field-hint field-hint-error">{error}</p>}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn-secondary" onClick={resetAndClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Adding…' : 'Start download'}
          </button>
        </footer>
      </form>
    </div>
  );
}
