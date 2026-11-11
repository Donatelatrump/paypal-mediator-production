import React, { useEffect, useRef, useState } from 'react';

export default function ReportPanels({ children }) {
  const rootRef = useRef(null);
  const [panel, setPanel] = useState(0);
  const lastControl = useRef(0);
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);
  const controls = () =>
    Array.from(
      rootRef.current?.children[0]?.querySelectorAll(
        'input, textarea, button:not([disabled])',
      ) || [],
    );
  const focusPanel = (index) => {
    setPanel(index);
    if (index === 0) {
      const fields = controls();
      fields[Math.min(lastControl.current, fields.length - 1)]?.focus({
        preventScroll: true,
      });
    } else rootRef.current.children[1]?.focus({ preventScroll: true });
  };
  return (
    <div
      className="two-column detail-grid report-panels"
      ref={rootRef}
      tabIndex={-1}
      data-active-panel={panel ?? undefined}
      onFocus={(event) => {
        if (event.target === rootRef.current) return;
        const first = rootRef.current.children[0];
        if (first.contains(event.target)) {
          setPanel(0);
          const index = controls().indexOf(event.target);
          if (index >= 0) lastControl.current = index;
        } else setPanel(1);
      }}
      onKeyDown={(event) => {
        if (
          event.defaultPrevented ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        )
          return;
        if (event.target.closest('[role="combobox"][aria-expanded="true"]'))
          return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          event.stopPropagation();
          focusPanel(event.key === 'ArrowLeft' ? 0 : 1);
        } else if (
          (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
          panel !== 1
        ) {
          event.preventDefault();
          event.stopPropagation();
          const fields = controls();
          const index = fields.indexOf(document.activeElement);
          const next =
            index < 0
              ? 0
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + fields.length) %
                fields.length;
          lastControl.current = next;
          fields[next]?.focus();
        }
      }}
    >
      {React.Children.map(children, (child, index) => (
        <div
          className="report-panel"
          tabIndex={index === 1 ? 0 : -1}
          aria-label={index === 0 ? 'Buyer report form' : 'Purchase summary'}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
