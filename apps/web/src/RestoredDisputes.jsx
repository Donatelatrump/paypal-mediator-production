import Icon from './Icon';
import React, { useEffect, useState } from 'react';
import MerchantScreens from './MerchantScreens';
import ProductThumbnail from './ProductThumbnail';
import PurchaseSummary from './PurchaseSummary';
import Badge from './Badge';
const initialOrders = [
  {
    id: '1042',
    name: 'Studio headphones',
    seller: 'Audio Supply',
    buyer: 'Alex Morgan',
    price: 249,
    date: 'Nov 2, 2026',
    status: 'In mediation',
    imageUrl: null,
    itemCount: 1,
    transactionId: 'TXN-1042',
    buyerEmail: 'alex@example.com',
    paymentLabel: 'Paid ···· 4242',
    delivery: {
      carrier: 'UPS',
      trackingNumber: '1Z1042000001',
      deliveredAt: 'Nov 4, 2026',
    },
    protectionStatus: 'Records ready',
    dispute: {
      caseId: 'M-1042',
      reason: 'Item not as described',
      status: 'In mediation',
      responseDeadline: 'Nov 9, 2026 · 5:00 PM PT',
    },
    breakdown: { subtotal: 225, shipping: 6, tax: 18, refunded: 0 },
    items: [
      {
        name: 'Studio headphones',
        sku: 'AUD-ST-001',
        variant: 'Black',
        quantity: 1,
        unitPrice: 225,
      },
    ],
  },
  {
    id: '1041',
    name: 'Mechanical keyboard',
    seller: 'Key Studio',
    buyer: 'Alex Morgan',
    price: 129,
    date: 'Oct 30, 2026',
    status: 'In transit',
    imageUrl: null,
    itemCount: 1,
    transactionId: 'TXN-1041',
    buyerEmail: 'alex@example.com',
    paymentLabel: 'Paid ···· 4242',
    delivery: {
      carrier: 'USPS',
      trackingNumber: null,
      expectedAt: 'Nov 6, 2026',
    },
    protectionStatus: 'Needs tracking',
    dispute: null,
    breakdown: { subtotal: 115, shipping: 5, tax: 9, refunded: 0 },
    items: [
      {
        name: 'Mechanical keyboard',
        sku: 'KEY-MK-001',
        variant: 'Charcoal · US layout',
        quantity: 1,
        unitPrice: 115,
      },
    ],
  },
  {
    id: '1038',
    name: 'Desk lamp',
    seller: 'Form Objects',
    buyer: 'Alex Morgan',
    price: 85,
    date: 'Oct 24, 2026',
    status: 'Delivered',
    imageUrl: null,
    itemCount: 1,
    transactionId: 'TXN-1038',
    buyerEmail: 'alex@example.com',
    paymentLabel: 'Paid ···· 4242',
    delivery: {
      carrier: 'FedEx',
      trackingNumber: '103800000001',
      deliveredAt: 'Oct 27, 2026',
    },
    protectionStatus: 'Records ready',
    dispute: null,
    breakdown: { subtotal: 75, shipping: 4, tax: 6, refunded: 0 },
    items: [
      {
        name: 'Desk lamp',
        sku: 'FORM-DL-001',
        variant: 'Matte black',
        quantity: 1,
        unitPrice: 75,
      },
    ],
  },
  {
    id: '1034',
    name: 'Everyday backpack',
    seller: 'Carry Goods',
    buyer: 'Alex Morgan',
    price: 110,
    date: 'Oct 18, 2026',
    status: 'Resolved',
    imageUrl: null,
    itemCount: 1,
    transactionId: 'TXN-1034',
    buyerEmail: 'alex@example.com',
    paymentLabel: 'Paid ···· 4242',
    delivery: {
      carrier: 'UPS',
      trackingNumber: '1Z1034000001',
      deliveredAt: 'Oct 28, 2026',
    },
    protectionStatus: 'Records ready',
    dispute: { caseId: 'M-1034', reason: 'Damaged item', status: 'Resolved' },
    breakdown: { subtotal: 100, shipping: 2, tax: 8, refunded: 0 },
    items: [
      {
        name: 'Everyday backpack',
        sku: 'CARRY-BP-001',
        variant: 'Black · 20L',
        quantity: 1,
        unitPrice: 100,
      },
    ],
  },
];
const Card = ({ children, className = '' }) => (
  <section className={`card ${className}`}>{children}</section>
);
// Restored from eec5cdb. The conversation and resolution flow remain frontend fixtures.
export default function RestoredDisputes({ transaction }) {
  const [page, setPage] = useState('disputes');
  const [selected, setSelected] = useState('1042');
  const [channel, setChannel] = useState('Shared conversation');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const orders = initialOrders;
  const order = orders.find((item) => item.id === selected) || orders[0];
  const role = 'Seller';
  const description = 'The item arrived damaged.';
  const issue = 'Item not as described';
  const desired = 'Partial refund';
  const files = [];
  const go = (target) => {
    setPage(target);
    setReviewed(false);
    window.scrollTo({ top: 0 });
  };
  const open = (item, target = 'mediation') => {
    setSelected(item.id);
    go(target === 'details' ? 'mediation' : target);
  };
  const purchaseSummary = () => <PurchaseSummary order={transaction} />;
  useEffect(() => {
    const escape = (event) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        page === 'disputes' ||
        document.querySelector('dialog[open]')
      )
        return;
      if (event.target.closest?.('input, textarea, select')) return;
      event.preventDefault();
      setPage(page === 'resolution' ? 'mediation' : 'disputes');
    };
    window.addEventListener('keydown', escape, true);
    return () => window.removeEventListener('keydown', escape, true);
  }, [page]);
  return (
    <>
      {page === 'disputes' && (
        <MerchantScreens page="disputes" orders={orders} go={go} open={open} />
      )}
      {page === 'mediation' && (
        <>
          <div className="case-bar">
            <div>
              <span className="status-dot" />
              <strong>Case #M-{order.id}</strong>
              <span className="muted">{order.name}</span>
            </div>
            <Badge>{accepted ? 'Agreement accepted' : 'In mediation'}</Badge>
          </div>
          <div className="mediation-grid">
            <Card className="conversation-card">
              <div className="tabs conversation-tabs">
                {['Shared conversation', 'Private AI assistance'].map((tab) => (
                  <button
                    className={channel === tab ? 'selected' : ''}
                    key={tab}
                    onClick={() => setChannel(tab)}
                  >
                    {tab === 'Private AI assistance' && (
                      <Icon name="LockKeyhole" />
                    )}
                    {tab}
                  </button>
                ))}
              </div>
              <div className="channel-note">
                {channel === 'Shared conversation'
                  ? 'Visible to you, the other party, and the AI mediator.'
                  : 'Only visible to you. Private guidance is not sent to the other party.'}
              </div>
              <div className="messages">
                {channel === 'Shared conversation' ? (
                  <>
                    <div className="message">
                      <div className="message-meta">
                        <span className="avatar">AM</span>
                        <strong>Alex Morgan</strong>
                        <small>Buyer · 9:42 AM</small>
                      </div>
                      <p>
                        {order.id === '1042'
                          ? 'The headphones arrived with a crack on the left ear cup. The audio also cuts out. I’d like help finding a fair solution.'
                          : description}
                      </p>
                      <div className="attachments">
                        {(files.length
                          ? files
                          : order.id === '1042'
                            ? ['ear-cup-photo.jpg', 'order-receipt.pdf']
                            : []
                        ).map((file) => (
                          <span key={file}>
                            <Icon name="Paperclip" /> {file}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="message ai-message">
                      <div className="message-meta">
                        <span className="avatar ai">
                          <Icon name="Sparkles" />
                        </span>
                        <strong>Middle AI</strong>
                        <Badge>Mediator</Badge>
                      </div>
                      <p>
                        I’ve summarized the concern and attached evidence. Let’s
                        clarify the condition of the item and explore an option
                        that works for both sides.
                      </p>
                    </div>
                    <div className="message">
                      <div className="message-meta">
                        <span className="avatar">AS</span>
                        <strong>{order.seller}</strong>
                        <small>Seller · 10:12 AM</small>
                      </div>
                      <p>
                        I’m sorry to hear about the condition. We can offer a
                        $60 partial refund if you’d prefer to keep the item, or
                        discuss a return.
                      </p>
                    </div>
                    <div className="message ai-message">
                      <div className="message-meta">
                        <span className="avatar ai">
                          <Icon name="Sparkles" />
                        </span>
                        <strong>Middle AI</strong>
                        <Badge>Proposal ready</Badge>
                      </div>
                      <p>
                        A partial refund is available for review. No agreement
                        takes effect until the terms are accepted.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => go('resolution')}
                      >
                        Review proposed terms <Icon name="ArrowUpRight" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="message ai-message">
                    <div className="message-meta">
                      <span className="avatar ai">
                        <Icon name="Sparkles" />
                      </span>
                      <strong>Your private AI assistant</strong>
                    </div>
                    <p>
                      You can ask for clarification or help drafting a response.
                      Consider whether keeping the item with a partial refund
                      addresses your concern, or whether you’d prefer to discuss
                      a return.
                    </p>
                  </div>
                )}
                {messages
                  .filter(
                    (message) =>
                      message.channel === channel && message.order === order.id,
                  )
                  .map((message, index) => (
                    <div
                      className={`message ${message.ai ? 'ai-message' : ''}`}
                      key={index}
                    >
                      <div className="message-meta">
                        <span className="avatar">
                          {message.ai ? (
                            <Icon name="Sparkles" />
                          ) : role === 'Buyer' ? (
                            'AM'
                          ) : (
                            'AS'
                          )}
                        </span>
                        <strong>
                          {message.ai ? 'Private AI assistant' : 'You'}
                        </strong>
                        <small>
                          {message.ai
                            ? 'Private'
                            : channel === 'Shared conversation'
                              ? 'Shared'
                              : 'Private'}
                        </small>
                      </div>
                      <p>{message.text}</p>
                    </div>
                  ))}
              </div>
              <form
                className="composer"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!draft.trim()) return;
                  const newMessages = [
                    { channel, order: order.id, text: draft.trim() },
                  ];
                  if (channel === 'Private AI assistance')
                    newMessages.push({
                      channel,
                      order: order.id,
                      ai: true,
                      text: 'You could ask the other party to confirm the refund amount, timing, and whether a return is required.',
                    });
                  setMessages((items) => [...items, ...newMessages]);
                  setDraft('');
                }}
              >
                <textarea
                  aria-label="Message"
                  rows={2}
                  placeholder={
                    channel === 'Shared conversation'
                      ? 'Write a message to everyone in this case…'
                      : 'Ask your private assistant…'
                  }
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <div>
                  <small>
                    {channel === 'Shared conversation'
                      ? 'Shared with both parties'
                      : 'Private · only you can see this'}
                  </small>
                  <button className="button primary" disabled={!draft.trim()}>
                    Send <Icon name="ArrowUp" />
                  </button>
                </div>
              </form>
            </Card>
            <div className="case-sidebar">
              <Card>
                <div className="card-heading">
                  <h2>Case at a glance</h2>
                  <span>
                    <Icon name="CircleDot" />
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Purchase</dt>
                    <dd>{order.name}</dd>
                  </div>
                  <div>
                    <dt>Issue</dt>
                    <dd>
                      {order.id === '1042' ? 'Item not as described' : issue}
                    </dd>
                  </div>
                  <div>
                    <dt>Requested</dt>
                    <dd>{desired}</dd>
                  </div>
                </dl>
              </Card>
              <Card className="proposal-card">
                <div className="eyebrow">PROPOSED RESOLUTION</div>
                <h2>$60.00</h2>
                <p>Partial refund · Keep the item</p>
                <button
                  className="button primary full"
                  onClick={() => go('resolution')}
                >
                  Review proposal <Icon name="ArrowUpRight" />
                </button>
                <small>Awaiting {role.toLowerCase()} review</small>
              </Card>
              <div className="helper-note">
                <span>
                  <Icon name="Sparkles" />
                </span>
                <p>
                  AI summaries can miss details. Check the original evidence and
                  terms before deciding.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      {page === 'resolution' && (
        <>
          <button className="back-link" onClick={() => go('mediation')}>
            <Icon name="ArrowLeft" /> Back to mediation
          </button>
          <div className="two-column detail-grid">
            <Card>
              <div className="card-heading">
                <h2>Partial refund agreement</h2>
                <Badge>{accepted ? 'Accepted' : 'Pending review'}</Badge>
              </div>
              <div className="refund-amount">
                $60.00<span>Proposed refund to the buyer</span>
              </div>
              <div className="terms">
                <h3>What you’re agreeing to</h3>
                <div>
                  <span>01</span>
                  <p>
                    The seller provides a $60.00 partial refund for order #
                    {order.id}.
                  </p>
                </div>
                <div>
                  <span>02</span>
                  <p>The buyer keeps the item. No return is required.</p>
                </div>
                <div>
                  <span>03</span>
                  <p>
                    The seller initiates the refund within 3 business days after
                    both parties accept.
                  </p>
                </div>
                <div>
                  <span>04</span>
                  <p>
                    The case closes after the buyer confirms receipt of the
                    refund.
                  </p>
                </div>
              </div>
              {accepted ? (
                <button
                  className="button primary"
                  onClick={() => go('outcome')}
                >
                  Track case outcome <Icon name="ArrowUpRight" />
                </button>
              ) : (
                <>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={reviewed}
                      onChange={(event) => setReviewed(event.target.checked)}
                    />
                    I have reviewed the terms and agree to this resolution.
                  </label>
                  <div className="button-row">
                    <button
                      className="button primary"
                      disabled={!reviewed}
                      onClick={() => {
                        setAccepted(true);
                        go('outcome');
                      }}
                    >
                      Accept agreement
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => {
                        setChannel('Shared conversation');
                        go('mediation');
                        setDraft(
                          'I’d like to discuss a change to the proposed terms: ',
                        );
                      }}
                    >
                      Request a change
                    </button>
                  </div>
                </>
              )}
            </Card>
            <div>
              {purchaseSummary()}
              <div className="helper-note">
                <span>
                  <Icon name="Sparkles" />
                </span>
                <p>
                  You remain in control. You can return to the conversation to
                  ask questions or propose different terms.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      {page === 'outcome' && (
        <>
          <div className="two-column">
            <Card>
              <div className="card-heading">
                <h2>{order.name}</h2>
                <Badge>
                  {accepted ? 'Follow-up pending' : 'Awaiting agreement'}
                </Badge>
              </div>
              <p className="muted">Case #M-{order.id} · Partial refund</p>
              <div className="refund-amount">
                $60.00
                <span>
                  {accepted ? 'Agreed refund amount' : 'Proposed refund amount'}
                </span>
              </div>
              <div className="timeline">
                <div>
                  <i />
                  <strong>
                    {accepted
                      ? `${role} accepted the terms`
                      : 'Proposal awaiting your review'}
                  </strong>
                  <p>
                    {accepted
                      ? 'The other party still needs to confirm acceptance.'
                      : 'Review the proposed agreement before proceeding.'}
                  </p>
                </div>
                <div className="pending">
                  <i />
                  <strong>Seller initiates refund</strong>
                  <p>Due within 3 business days of mutual acceptance.</p>
                </div>
                <div className="pending">
                  <i />
                  <strong>Buyer confirms receipt</strong>
                  <p>The case can then be marked resolved.</p>
                </div>
              </div>
              <button
                className="button primary"
                onClick={() => go(accepted ? 'mediation' : 'resolution')}
              >
                {accepted ? 'Return to case' : 'Review agreement'}{' '}
                <Icon name="ArrowUpRight" />
              </button>
            </Card>
            <Card>
              <div className="card-heading">
                <h2>Resolved case</h2>
                <Badge>Resolved</Badge>
              </div>
              <div className="product featured">
                <ProductThumbnail
                  imageUrl={orders.find((item) => item.id === '1034')?.imageUrl}
                />
                <div>
                  <strong>Everyday backpack</strong>
                  <small>Case #M-1034 · Carry Goods</small>
                </div>
              </div>
              <h3>Replacement received</h3>
              <p>
                The seller sent a replacement for the damaged item. The buyer
                confirmed delivery and the case was closed.
              </p>
              <dl>
                <div>
                  <dt>Agreement</dt>
                  <dd>Replacement at no cost</dd>
                </div>
                <div>
                  <dt>Closed</dt>
                  <dd>Oct 28, 2026</dd>
                </div>
                <div>
                  <dt>Follow-up</dt>
                  <dd>No action needed</dd>
                </div>
              </dl>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
