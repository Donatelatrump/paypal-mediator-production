// Contract-shaped fixtures only. Replace via the authenticated API client.
const checks = [
  'PAYMENT_RECORD',
  'ORDER_REFERENCE',
  'ORDER_RECORD',
  'TRACKING',
  'PROOF_OF_DELIVERY',
];
export const merchant = {
  id: '00000000-0000-4000-8000-000000000001',
  displayName: 'Audio Supply',
  role: 'ADMIN',
  policy: {
    allowInvestigations: false,
    allowSubmissions: false,
    requireMerchantApproval: true,
  },
};
export const integration = {
  provider: 'PAYPAL',
  environment: 'sandbox',
  credentialsConfigured: false,
  webhookConfigured: false,
  connectionStatus: 'NOT_CONFIGURED',
  disputesReadStatus: 'NOT_CHECKED',
  lastCheckedAt: null,
  paypalHttpStatus: null,
  paypalDebugId: null,
  source: 'PAYPAL_SANDBOX',
};
export const transactions = [
  ['1042', 'Studio headphones', '225', '6', '18', '249', 'READY', 'LINKED'],
  [
    '1041',
    'Mechanical keyboard',
    '115',
    '5',
    '9',
    '129',
    'INCOMPLETE',
    'LINKED',
  ],
  ['1038', 'Desk lamp', '75', '4', '6', '85', 'INCOMPLETE', 'LINKED'],
  [
    '1043',
    'Studio headphones',
    '225',
    '6',
    '22',
    '298',
    'INCOMPLETE',
    'LINKED',
    [
      {
        sku: 'SKU-STAND-01',
        description: 'Headphone stand',
        quantity: 1,
        unitAmount: '45',
      },
    ],
  ],
].map(
  (
    [
      ref,
      description,
      unitAmount,
      shippingAmount,
      taxAmount,
      totalAmount,
      readiness,
      link,
      additionalItems = [],
    ],
    index,
  ) => {
    const id = `00000000-0000-4000-8000-00000000${ref}`;
    const orderId = `10000000-0000-4000-8000-00000000${ref}`;
    const dossierId = `20000000-0000-4000-8000-00000000${ref}`;
    return {
      id,
      merchantId: merchant.id,
      environment: 'sandbox',
      paypalCaptureId: `CAPTURE-${ref}`,
      paypalOrderId: `PAYPAL-ORDER-${ref}`,
      merchantOrderReference: description ? `ORDER-${ref}` : null,
      invoiceId: null,
      status: 'COMPLETED',
      amount: { currencyCode: 'USD', value: totalAmount },
      capturedAt: `2026-11-0${5 - index}T12:00:00Z`,
      createdAt: `2026-11-0${5 - index}T12:00:01Z`,
      sourceEventId: `30000000-0000-4000-8000-00000000${ref}`,
      order:
        link === 'LINKED'
          ? {
              id: orderId,
              merchantId: merchant.id,
              environment: 'sandbox',
              externalId: `ORDER-${ref}`,
              paypalOrderId: `PAYPAL-ORDER-${ref}`,
              sourceKind: 'DEMO',
              sourceSystem: 'Commerce fixtures',
              currencyCode: 'USD',
              totalAmount,
              shippingAmount,
              taxAmount,
              discountAmount: '0',
              orderedAt: `2026-11-0${5 - index}T11:00:00Z`,
              items: [
                { sku: `SKU-${ref}`, description, quantity: 1, unitAmount },
                ...additionalItems,
              ],
              contentHash: 'a'.repeat(64),
              createdAt: `2026-11-0${5 - index}T11:01:00Z`,
            }
          : null,
      orderLink: {
        status: link,
        reason:
          link === 'CONFLICT'
            ? 'ORDER_AMOUNT_MISMATCH'
            : link === 'UNLINKED'
              ? 'ORDER_NOT_FOUND'
              : null,
      },
      readiness: {
        status: readiness,
        basis: 'DOCUMENT_COVERAGE',
        containsDemo: link === 'LINKED',
        dossierId,
        evidenceRevision: 1,
        reasons:
          readiness === 'READY'
            ? []
            : [
                link === 'CONFLICT'
                  ? 'ORDER_AMOUNT_MISMATCH'
                  : 'MISSING_DOCUMENTS',
              ],
        checks: checks.map((code, i) => ({
          code,
          status:
            link === 'CONFLICT' && code === 'ORDER_RECORD'
              ? 'CONFLICT'
              : i === 0 || readiness === 'READY' || (link === 'LINKED' && i < 3)
                ? 'PRESENT'
                : 'MISSING',
          evidenceIds:
            i === 0 || readiness === 'READY' || (link === 'LINKED' && i < 3)
              ? [`40000000-0000-4000-8000-00000000${index}${i === 1 ? 2 : i}01`]
              : [],
        })),
      },
    };
  },
);
export const dossiers = Object.fromEntries(
  transactions.map((transaction) => [
    transaction.id,
    {
      id: transaction.readiness.dossierId,
      merchantId: merchant.id,
      transactionId: transaction.id,
      revision: 1,
      items: transaction.readiness.checks
        .filter(
          (check) =>
            check.status === 'PRESENT' && check.code !== 'ORDER_REFERENCE',
        )
        .map((check) => ({
          id: check.evidenceIds[0],
          type: check.code,
          version: 1,
          sourceKind: check.code === 'PAYMENT_RECORD' ? 'PAYPAL' : 'DEMO',
          sourceSystem:
            check.code === 'PAYMENT_RECORD'
              ? 'PayPal Sandbox'
              : 'Commerce fixtures',
          externalReference: transaction.paypalCaptureId + '-' + check.code,
          retrievedAt: transaction.capturedAt,
          contentHash: 'a'.repeat(64),
          current: true,
          integrity: 'VALID',
          content:
            check.code === 'PAYMENT_RECORD'
              ? {
                  paypalCaptureId: transaction.paypalCaptureId,
                  amount: transaction.amount,
                }
              : check.code === 'ORDER_RECORD'
                ? transaction.order
                : {
                    paypalCaptureId: transaction.paypalCaptureId,
                    merchantOrderReference: transaction.merchantOrderReference,
                    carrier: 'DEMO carrier',
                    trackingNumber: 'DEMO-TRACK-1042',
                    status:
                      check.code === 'TRACKING' ? 'IN_TRANSIT' : 'DELIVERED',
                    ...(check.code === 'TRACKING'
                      ? { shippedAt: '2026-11-05T13:00:00Z' }
                      : { deliveredAt: '2026-11-06T10:00:00Z' }),
                  },
        })),
    },
  ]),
);

// Explicit UI history fixtures. The API exposes item versions, not revision snapshots yet.
export const evidenceSnapshots = Object.fromEntries(
  transactions.map((transaction) => {
    const dossier = dossiers[transaction.id];
    const payment = dossier.items.filter(
      (item) => item.type === 'PAYMENT_RECORD',
    );
    const initialChecks = transaction.readiness.checks.map((check) => ({
      ...check,
      status: check.code === 'PAYMENT_RECORD' ? 'PRESENT' : 'MISSING',
      evidenceIds:
        check.code === 'PAYMENT_RECORD' ? payment.map((item) => item.id) : [],
    }));
    return [
      transaction.id,
      [
        {
          revision: 2,
          createdAt: '2026-11-06T10:00:00Z',
          summary: 'Order and supporting records collected',
          checks: transaction.readiness.checks,
          items: dossier.items,
        },
        {
          revision: 1,
          createdAt: transaction.capturedAt,
          summary: 'Payment record collected',
          checks: initialChecks,
          items: payment,
        },
      ],
    ];
  }),
);

export const account = {
  id: 'demo-account-001',
  displayName: 'Alex Morgan',
  email: 'alex@example.com',
  phone: '',
};

export const merchants = [
  merchant,
  {
    id: '00000000-0000-4000-8000-000000000002',
    displayName: 'Studio Collective',
    role: 'ADMIN',
    policy: {
      allowInvestigations: false,
      allowSubmissions: false,
      requireMerchantApproval: true,
    },
  },
];

// Inbox examples for the local workspace preview.
export const notifications = [
  {
    id: 'notice-dispute-1042',
    merchantId: merchant.id,
    title: 'A dispute needs your response',
    detail: 'Review the case and prepare a response for Studio headphones.',
    createdAt: '2026-11-10T10:00:00Z',
    icon: 'MessageSquareWarning',
    page: 'disputes',
  },
  {
    id: 'notice-evidence-1041',
    merchantId: merchant.id,
    title: 'Evidence needs attention',
    detail: 'Mechanical keyboard is missing supporting documents.',
    createdAt: '2026-11-10T09:30:00Z',
    icon: 'FileText',
    page: 'evidence',
    transactionId: transactions[1].id,
  },
  {
    id: 'notice-agent-1042',
    merchantId: merchant.id,
    title: 'Your agent has an update',
    detail: 'Payment records are available for review in the evidence dossier.',
    createdAt: '2026-11-10T08:45:00Z',
    icon: 'Star',
    page: 'activity',
  },
  {
    id: 'notice-studio-welcome',
    merchantId: merchants[1].id,
    title: 'Your team workspace is ready',
    detail: 'Studio Collective is ready for your team to get started.',
    createdAt: '2026-11-09T16:00:00Z',
    icon: 'Users',
    page: 'overview',
  },
];
