import Icon from './Icon';
import React, { useEffect, useRef, useState } from 'react';

export default function AgentChat({ transactionId }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const endRef = useRef(null);
  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);
  return (
    <section className="card agent-chat">
      <div className="card-heading">
        <h2>Agent chat</h2>
        <span className="muted">Private</span>
      </div>
      <div
        className="agent-chat-messages"
        role="log"
        aria-label="Agent conversation"
        aria-live="polite"
      >
        <div className="message ai-message">
          <div className="message-meta">
            <span className="avatar ai" aria-hidden="true">
              <Icon name="Sparkles" />
            </span>
            <strong>ResolveAI</strong>
          </div>
          <p>
            Review the evidence for {transactionId}, ask about missing records,
            or work on your response.
          </p>
        </div>
        {messages.map((message, index) => (
          <div className="message agent-chat-user" key={index}>
            <div className="message-meta">
              <strong>You</strong>
            </div>
            <p>{message}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          setMessages((items) => [...items, draft.trim()]);
          setDraft('');
        }}
      >
        <textarea
          aria-label="Message the agent"
          placeholder="Ask your agent…"
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form.requestSubmit();
            }
          }}
        />
        <div>
          <small>Only visible to your team</small>
          <button
            type="submit"
            className="button primary"
            disabled={!draft.trim()}
          >
            Send <Icon name="ArrowUp" />
          </button>
        </div>
      </form>
    </section>
  );
}
