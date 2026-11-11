import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import ProfileAvatar from './ProfileAvatar';
import { date } from './lib/format';

export default function DisputeConversation({
  transaction,
  account,
  selectedEvidence = [],
}) {
  const storageKey = `merchant:${transaction.merchantId}:dispute:${transaction.paypalCaptureId}:conversation`;
  const generateDraft = () => {
    const sources = [
      selectedEvidence.includes('PAYMENT_RECORD') && 'payment record',
      (selectedEvidence.includes('ORDER_RECORD') ||
        selectedEvidence.includes('ORDER_REFERENCE')) &&
        'order details',
      selectedEvidence.includes('TRACKING') && 'tracking information',
      selectedEvidence.includes('PROOF_OF_DELIVERY') && 'delivery record',
    ].filter(Boolean);
    const basis = sources.length
      ? `the ${sources.join(', ')}`
      : 'the details you shared';
    return `Thank you for letting us know. I’ll review ${basis} to understand what happened with your delivery. I’ll follow up with an update and the next steps once I can confirm the details.`;
  };
  const [initial] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      const messages = (
        Array.isArray(saved) ? saved : saved?.messages || []
      ).filter(
        (item) =>
          item && typeof item.text === 'string' && item.role === 'merchant',
      );
      return {
        messages,
        draft:
          typeof saved?.draft === 'string' && saved.draft.trim()
            ? saved.draft
            : generateDraft(),
        approvedText: saved?.approvedText || null,
      };
    } catch {
      return { messages: [], draft: generateDraft(), approvedText: null };
    }
  });
  const [messages, setMessages] = useState(initial.messages);
  const [draft, setDraft] = useState(initial.draft);
  const [approvedText, setApprovedText] = useState(initial.approvedText);
  const updateDraft = (text) => {
    setDraft(text);
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ messages, draft: text, approvedText }),
      );
      setError('');
    } catch {
      setError('Your draft could not be saved. Please try again.');
    }
  };
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  const upload = useRef(null);
  const input = useRef(null);
  const log = useRef(null);
  useEffect(() => {
    const container = log.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);
  const send = (event) => {
    event.preventDefault();
    if (!draft.trim() || (draft.trim() === approvedText && !attachments.length))
      return;
    const message = {
      id: crypto.randomUUID(),
      role: 'merchant',
      author: account?.displayName || 'You',
      text: draft.trim(),
      createdAt: new Date().toISOString(),
      attachments,
    };
    try {
      const next = [...messages, message];
      localStorage.setItem(
        storageKey,
        JSON.stringify({ messages: next, draft, approvedText: draft.trim() }),
      );
      setMessages(next);
      setApprovedText(draft.trim());
      setAttachments([]);
      setError('');
      input.current?.focus();
    } catch {
      setError('Your message could not be saved. Please try again.');
    }
  };
  const addAttachments = (event) => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    if (
      incoming.some(
        (file) =>
          ![
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
          ].includes(file.type),
      )
    ) {
      setError('Choose a PDF, JPG, PNG, WebP, or GIF file.');
      return;
    }
    if (incoming.some((file) => file.size > 10 * 1024 * 1024)) {
      setError('Each attachment must be 10 MB or smaller.');
      return;
    }
    const next = [...attachments];
    incoming.forEach((file) => {
      if (
        !next.some((item) => item.name === file.name && item.size === file.size)
      )
        next.push({ name: file.name, size: file.size, type: file.type });
    });
    if (next.length > 5) {
      setError('Attach up to 5 files per message.');
      return;
    }
    setAttachments(next);
    setError('');
    input.current?.focus();
  };
  const approved = draft.trim() === approvedText && !attachments.length;
  const thread = [
    {
      id: 'buyer-report',
      role: 'buyer',
      author: 'Buyer',
      text: 'The order has not arrived. Please provide an update on the delivery.',
      attachments: [],
    },
    ...messages,
  ];
  return (
    <section
      className="card dispute-conversation"
      aria-label="Case conversation"
    >
      <div
        className="dispute-chat-log"
        ref={log}
        role="log"
        aria-label="Case messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        {thread.map((message) => (
          <div
            className={`dispute-chat-message ${message.role === 'merchant' ? 'from-merchant' : 'from-buyer'}`}
            key={message.id}
          >
            <div className="dispute-chat-avatar">
              {message.role === 'merchant' ? (
                <ProfileAvatar small />
              ) : (
                <span className="avatar">
                  <Icon name="UserRound" size={16} />
                </span>
              )}
            </div>
            <div className="dispute-chat-message-content">
              <div className="dispute-chat-author">
                {message.author}
                {message.role === 'merchant' && <span>You</span>}
              </div>
              <div className="dispute-chat-bubble">
                {message.text && <p>{message.text}</p>}
                {message.attachments?.length > 0 && (
                  <ul className="dispute-chat-attachments">
                    {message.attachments.map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <Icon name="Paperclip" size={13} />
                        <span>{file.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {message.createdAt && (
                <time
                  className="dispute-chat-time"
                  dateTime={message.createdAt}
                >
                  {date(message.createdAt)}
                </time>
              )}
            </div>
          </div>
        ))}
      </div>
      <form className="dispute-chat-composer" onSubmit={send}>
        {attachments.length > 0 && (
          <ul className="dispute-chat-pending-files">
            {attachments.map((file, index) => (
              <li key={`${file.name}-${index}`}>
                <Icon name="Paperclip" size={13} />
                <span>{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setAttachments((items) =>
                      items.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Icon name="X" size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="dispute-draft-label">
          <label htmlFor="dispute-response-draft">Response draft</label>
          {approved && <span>Approved</span>}
        </div>
        <textarea
          id="dispute-response-draft"
          ref={input}
          aria-label="Response draft"
          placeholder="Write your response…"
          rows={5}
          value={draft}
          onChange={(event) => updateDraft(event.target.value)}
          onBlur={() => {
            if (!draft.trim()) updateDraft(generateDraft());
          }}
        />
        <div className="dispute-chat-composer-actions">
          <input
            ref={upload}
            className="dispute-chat-file-input"
            type="file"
            aria-label="Message attachments"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
            onChange={addAttachments}
          />
          <button
            type="button"
            className="dispute-chat-attach"
            aria-label="Attach files"
            title="Attach files"
            onClick={() => upload.current?.click()}
          >
            <Icon name="Paperclip" size={18} />
          </button>
          <button
            type="button"
            className="dispute-chat-attach"
            aria-label="Regenerate AI draft"
            title="Regenerate AI draft"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              const next = generateDraft();
              setDraft(next);
              setApprovedText(null);
              try {
                localStorage.setItem(
                  storageKey,
                  JSON.stringify({ messages, draft: next, approvedText: null }),
                );
                setError('');
              } catch {
                setError('Your draft could not be saved. Please try again.');
              }
              input.current?.focus();
            }}
          >
            <Icon name="Sparkles" size={18} />
          </button>
          <button
            type="submit"
            className="button primary dispute-chat-send"
            disabled={!draft.trim() || approved}
          >
            <Icon name="Check" size={16} />
            {approved ? 'Approved' : 'Approve response'}
          </button>
        </div>
        {error && (
          <p className="dispute-chat-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}
