import React from 'react';
import './initial-mockup.css';

function Bar({ kind = '' }) {
  return <span className={`mock-bar ${kind}`} />;
}
function Panel({ kind = '', children }) {
  return <div className={`mock-panel ${kind}`}>{children}</div>;
}
function PanelTop({ subtitle = false, control = false }) {
  return (
    <div className="mock-panel-top">
      <div>
        <Bar />
        {subtitle && <Bar kind="subtitle" />}
      </div>
      <span className={control ? 'mock-control' : 'mock-square'} />
    </div>
  );
}

export default function InitialMockup() {
  return (
    <section className="initial-mockup" aria-label="Dashboard loading">
      <div aria-hidden="true">
        <div className="mock-heading">
          <div>
            <Bar kind="heading" />
            <Bar kind="subtitle" />
          </div>
          <div className="mock-actions">
            <span />
            <span />
          </div>
        </div>
        <div className="mock-summary-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <Panel key={index} kind="mock-summary">
              <PanelTop />
              <Bar kind="value" />
              <div className="mock-summary-footer">
                <Bar kind="pill" />
                <Bar />
              </div>
            </Panel>
          ))}
        </div>
        <div className="mock-main-grid">
          <Panel kind="mock-large">
            <PanelTop subtitle control />
            <div className="mock-plot">
              {Array.from({ length: 5 }, (_, index) => (
                <span key={index} />
              ))}
            </div>
            <div className="mock-plot-footer">
              {Array.from({ length: 6 }, (_, index) => (
                <Bar key={index} />
              ))}
            </div>
          </Panel>
          <Panel kind="mock-side">
            <PanelTop />
            <div className="mock-ring" />
            <div className="mock-legend">
              <Bar />
              <Bar />
              <Bar />
            </div>
          </Panel>
        </div>
        <div className="mock-bottom-grid">
          <Panel>
            <PanelTop control />
            <div className="mock-table">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="mock-row" key={index}>
                  <span className="mock-row-icon" />
                  <div>
                    <Bar />
                    <Bar kind="short" />
                  </div>
                  <Bar />
                  <Bar kind="pill" />
                  <Bar />
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelTop />
            <div className="mock-blocks">
              <span />
              <span />
              <span />
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
