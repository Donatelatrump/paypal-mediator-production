import Icon from './Icon';
import React, { useRef, useState } from 'react';

export default function EvidenceUpload({
  category,
  readOnly = false,
  accept,
  onUpload,
}) {
  const inputRef = useRef(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const addFiles = async (incoming) => {
    if (readOnly || uploading) return;
    setError('');
    setUploading(Boolean(onUpload));
    try {
      for (const file of incoming) {
        if (
          files.some(
            (existing) =>
              existing.name === file.name &&
              existing.size === file.size &&
              existing.lastModified === file.lastModified,
          )
        )
          continue;
        if (onUpload) await onUpload(file);
        setFiles((current) =>
          current.some(
            (existing) =>
              existing.name === file.name &&
              existing.size === file.size &&
              existing.lastModified === file.lastModified,
          )
            ? current
            : [...current, file],
        );
      }
    } catch (failure) {
      setError(
        failure.message || 'Could not upload this file. Please try again.',
      );
    } finally {
      setUploading(false);
    }
  };
  return (
    <div
      className={`evidence-folder ${dragging ? 'is-dragging' : ''} ${readOnly ? 'is-readonly' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (readOnly || uploading) return;
        depth.current++;
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = readOnly ? 'none' : 'copy';
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (!readOnly && !uploading)
          addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        className="evidence-file-input"
        type="file"
        multiple
        accept={accept}
        aria-label={`Upload ${category.toLowerCase()}`}
        tabIndex={-1}
        disabled={readOnly || uploading}
        onChange={(event) => {
          addFiles(Array.from(event.target.files));
          event.target.value = '';
        }}
      />
      <button
        type="button"
        className="evidence-folder-picker"
        disabled={readOnly || uploading}
        aria-label={`Add files to ${category.toLowerCase()}`}
        onClick={() => inputRef.current?.click()}
      >
        <Icon name="FolderUp" />
        <strong>
          {uploading
            ? 'Uploading…'
            : readOnly
              ? 'Files at this version'
              : dragging
                ? 'Drop files here'
                : 'Drop evidence here'}
        </strong>
        <span>{readOnly ? 'Read only' : 'or click to browse'}</span>
      </button>
      {!readOnly && files.length > 0 && (
        <ul className="evidence-selected-files" aria-live="polite">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.lastModified}`}>
              <span>
                <strong>{file.name}</strong>
                <small>
                  {onUpload ? 'Uploaded' : 'Selected'} ·{' '}
                  {Math.max(1, Math.ceil(file.size / 1024))} KB
                </small>
              </span>
              {!onUpload && (
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Icon name="X" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="upload-error">
          {error}
        </p>
      )}
    </div>
  );
}
