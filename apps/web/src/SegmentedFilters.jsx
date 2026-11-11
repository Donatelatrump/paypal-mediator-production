import React, { useLayoutEffect, useRef, useState } from 'react';
export default function SegmentedFilters({
  value,
  onChange,
  options,
  label,
  onArrowDown,
}) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(null);
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = () => {
      const selected = container.querySelector('[aria-pressed="true"]');
      if (selected)
        setPosition({
          left: selected.offsetLeft,
          top: selected.offsetTop,
          width: selected.offsetWidth,
          height: selected.offsetHeight,
        });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    Array.from(container.querySelectorAll('button')).forEach((button) =>
      observer.observe(button),
    );
    return () => observer.disconnect();
  }, [value]);
  return (
    <div
      className="tabs transaction-filters"
      ref={containerRef}
      role="group"
      aria-label={label}
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {position && (
        <span
          className="filter-highlight"
          style={position}
          aria-hidden="true"
        />
      )}
      {options.map((tab) => (
        <button
          type="button"
          className={value === tab ? 'selected' : ''}
          aria-pressed={value === tab}
          onClick={(event) => {
            onChange(tab);
            event.currentTarget.focus();
          }}
          onKeyDown={(event) => {
            const tabs = options;
            const index = tabs.indexOf(value);
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft')
              next = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === 'ArrowDown') {
              event.preventDefault();
              onArrowDown?.();
              return;
            } else return;
            event.preventDefault();
            onChange(tabs[next]);
            containerRef.current.querySelectorAll('button')[next]?.focus();
          }}
          key={tab}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
