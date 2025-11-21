import React, { useMemo, useRef, useEffect, useState } from 'react';

function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleTimeString();
}

function EventLog({ log, onSend }) {
  const listRef = useRef(null);
  const [message, setMessage] = useState('');

  const sortedLog = useMemo(() => (log || []).slice().sort((a, b) => a.timestamp - b.timestamp), [
    log,
  ]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [sortedLog]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    onSend?.(text);
    setMessage('');
  };

  return (
    <div className="event-log">
      <div className="event-log__list" ref={listRef}>
        {sortedLog.length === 0 ? (
          <p className="muted">No messages yet.</p>
        ) : (
          sortedLog.map((entry) => (
            <div className="event-log__item" key={entry.id || `${entry.timestamp}-${entry.authorId}`}>
              <div className="event-log__meta">
                <span className="muted">{formatTimestamp(entry.timestamp)}</span>
                <strong>{entry.authorName || 'Unknown'}</strong>
              </div>
              <div>{entry.message}</div>
            </div>
          ))
        )}
      </div>
      <form className="event-log__form" onSubmit={handleSubmit}>
        <input
          placeholder="Write a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default EventLog;
