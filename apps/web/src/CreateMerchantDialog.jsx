import Icon from './Icon';
import React, { useEffect, useRef, useState } from 'react';
import TimeZoneCombobox from './TimeZoneCombobox';
import SidebarIcon from './SidebarIcon';
import Combobox from './Combobox';
import { subscriptionPlans } from './data/subscriptionPlans';

const steps = [
  'Team Information',
  'Business address',
  'Payment',
  'Integrations',
  'Review',
];
const stepIcons = [
  'Information',
  'Information',
  'transactions',
  'Integrations',
  'Policies',
];
const countries = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'France',
  'Germany',
  'Japan',
  'Mexico',
];
function Field({ title, value, onChange, ...props }) {
  return (
    <label>
      {title}
      <input
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </label>
  );
}
export default function CreateMerchantDialog({ account, onCreate, onClose }) {
  const dialog = useRef(null);
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [details, setDetails] = useState({
    displayName: '',
    contactName: account.displayName,
    email: account.email,
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [address, setAddress] = useState({
    street: '',
    unit: '',
    city: '',
    region: '',
    postalCode: '',
    country: 'United States',
  });
  const [planId, setPlanId] = useState(null);
  const selectedPlan = subscriptionPlans.find((plan) => plan.id === planId);
  const [card, setCard] = useState({
    name: account.displayName,
    number: '',
    expiry: '',
    cvc: '',
  });
  const [paypal, setPaypal] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    dialog.current.querySelector('input')?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (step > 0) dialog.current.querySelector('.setup-step-heading')?.focus();
  }, [step]);
  const move = (next) => {
    setStep(next);
    setError('');
    setAuthorizing(false);
  };
  const submit = (event) => {
    event.preventDefault();
    setError('');
    if (step === 0 && Object.values(details).some((value) => !value.trim()))
      return setError('Complete all business information fields.');
    if (
      step === 1 &&
      ['street', 'city', 'region', 'postalCode', 'country'].some(
        (key) => !address[key].trim(),
      )
    )
      return setError('Complete your business address.');
    if (step === 2) {
      if (!selectedPlan)
        return setError('Choose a subscription plan to continue.');
      const digits = card.number.replace(/\s/g, '');
      let sum = 0;
      for (let i = 0; i < digits.length; i++) {
        let digit = Number(digits[digits.length - 1 - i]);
        if (i % 2) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
        sum += digit;
      }
      if (!/^\d{13,19}$/.test(digits) || sum % 10)
        return setError('Enter a valid card number.');
      const expiry = card.expiry.match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/);
      if (
        !expiry ||
        new Date(2000 + Number(expiry[2]), Number(expiry[1])) <= new Date()
      )
        return setError('Enter a valid future expiration date (MM/YY).');
      if (!card.name.trim() || !/^\d{3,4}$/.test(card.cvc))
        return setError('Enter the cardholder name and a valid security code.');
    }
    if (step < 4) {
      setCompleted((value) => Math.max(value, step + 1));
      move(step + 1);
      return;
    }
    // Preview payment details stay in memory; only a display summary is persisted.
    const digits = card.number.replace(/\s/g, '');
    const payment = {
      brand: digits.startsWith('4')
        ? 'Visa'
        : digits.startsWith('5')
          ? 'Mastercard'
          : 'Card',
      last4: digits.slice(-4),
      status: 'PREVIEW',
    };
    const integration = {
      provider: 'PAYPAL',
      environment: 'sandbox',
      credentialsConfigured: paypal,
      webhookConfigured: paypal,
      connectionStatus: paypal ? 'CONNECTED' : 'NOT_CONFIGURED',
      disputesReadStatus: paypal ? 'GRANTED' : 'NOT_CHECKED',
      lastCheckedAt: paypal ? new Date().toISOString() : null,
      source: 'DEMO',
    };
    try {
      onCreate({
        ...Object.fromEntries(
          Object.entries(details).map(([key, value]) => [key, value.trim()]),
        ),
        address: Object.fromEntries(
          Object.entries(address).map(([key, value]) => [key, value.trim()]),
        ),
        payment,
        integration,
        subscription: {
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          price: selectedPlan.price,
        },
      });
    } catch (failure) {
      setError(
        failure.message || 'Could not create the team. Please try again.',
      );
    }
  };
  const editDetails = (key, value) =>
    setDetails((current) => ({ ...current, [key]: value }));
  return (
    <dialog
      className="settings-dialog merchant-create-dialog"
      ref={dialog}
      aria-label="Create a team"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <button
        type="button"
        className="settings-close"
        aria-label="Close create team"
        onClick={onClose}
      >
        <Icon name="X" />
      </button>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Team setup">
          {steps.map((title, index) => (
            <button
              type="button"
              className={`nav-item ${step === index ? 'active' : ''}`}
              aria-current={step === index ? 'step' : undefined}
              disabled={index > completed}
              onClick={() => move(index)}
              key={title}
            >
              <SidebarIcon name={stepIcons[index]} />
              {title}
            </button>
          ))}
        </nav>
        <section className="card settings-content">
          <div className="settings-content-inner">
            <form
              className="account-settings-form account-information-form"
              onChange={() => setCompleted((value) => Math.min(value, step))}
              onSubmit={submit}
            >
              <h3 className="setup-step-heading" tabIndex={-1}>
                {steps[step]}
              </h3>
              {step === 0 && (
                <>
                  {[
                    ['displayName', 'Merchant name', 'text', 'organization'],
                    ['contactName', 'Contact name', 'text', 'name'],
                    ['email', 'Business email', 'email', 'email'],
                    ['phone', 'Business phone', 'tel', 'tel'],
                  ].map(([key, title, type, autocomplete]) => (
                    <Field
                      key={key}
                      title={title}
                      type={type}
                      maxLength={key === 'displayName' ? 80 : 254}
                      autoComplete={autocomplete}
                      value={details[key]}
                      onChange={(value) => editDetails(key, value)}
                    />
                  ))}
                  <TimeZoneCombobox
                    value={details.timezone}
                    onChange={(value) => editDetails('timezone', value)}
                  />
                </>
              )}
              {step === 1 && (
                <>
                  <div className="setup-combobox-field">
                    <span>Country</span>
                    <Combobox
                      label="Country"
                      value={address.country}
                      onChange={(country) =>
                        setAddress({ ...address, country })
                      }
                      options={countries}
                    />
                  </div>
                  {[
                    ['street', 'Street address', 'address-line1'],
                    [
                      'unit',
                      'Apartment, suite, etc. (optional)',
                      'address-line2',
                    ],
                    ['city', 'City', 'address-level2'],
                    ['region', 'State / province / region', 'address-level1'],
                    ['postalCode', 'ZIP / postal code', 'postal-code'],
                  ].map(([key, title, autocomplete]) => (
                    <Field
                      key={key}
                      title={title}
                      required={key !== 'unit'}
                      autoComplete={autocomplete}
                      value={address[key]}
                      onChange={(value) =>
                        setAddress({ ...address, [key]: value })
                      }
                      maxLength={200}
                    />
                  ))}
                </>
              )}
              {step === 2 && (
                <>
                  <fieldset className="subscription-plans">
                    <legend>Choose a subscription plan</legend>
                    <div className="subscription-plan-grid">
                      {subscriptionPlans.map((plan) => (
                        <label
                          className={`subscription-plan ${planId === plan.id ? 'selected' : ''}`}
                          key={plan.id}
                        >
                          <input
                            type="radio"
                            name="subscription-plan"
                            value={plan.id}
                            checked={planId === plan.id}
                            onChange={() => {
                              setPlanId(plan.id);
                              setCompleted((value) => Math.min(value, 2));
                              setError('');
                            }}
                          />
                          <span className="subscription-plan-top">
                            <Icon name={plan.icon} size={20} />
                            <span className="subscription-plan-selection">
                              {planId === plan.id && (
                                <Icon
                                  name="Check"
                                  size={12}
                                  strokeWidth={2.5}
                                />
                              )}
                            </span>
                          </span>
                          <strong>{plan.name}</strong>
                          {plan.price != null && (
                            <span className="subscription-plan-price">
                              ${plan.price}
                              <small>/month</small>
                            </span>
                          )}
                          <span className="subscription-plan-description">
                            {plan.description}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {selectedPlan && (
                    <section
                      className="subscription-payment-details"
                      aria-labelledby="subscription-payment-title"
                    >
                      <div className="subscription-payment-heading">
                        <h3 id="subscription-payment-title">Payment details</h3>
                        <span>{selectedPlan.name} plan</span>
                      </div>
                      <p>
                        Your business address will be used as the billing
                        address.
                      </p>
                      <Field
                        title="Cardholder name"
                        autoComplete="cc-name"
                        value={card.name}
                        onChange={(name) => setCard({ ...card, name })}
                      />
                      <Field
                        title="Card number"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        maxLength={23}
                        value={card.number}
                        onChange={(number) => setCard({ ...card, number })}
                      />
                      <div className="setup-card-row">
                        <Field
                          title="Expiration date"
                          placeholder="MM/YY"
                          autoComplete="cc-exp"
                          maxLength={7}
                          value={card.expiry}
                          onChange={(expiry) => setCard({ ...card, expiry })}
                        />
                        <Field
                          title="Security code"
                          type="password"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          maxLength={4}
                          value={card.cvc}
                          onChange={(cvc) => setCard({ ...card, cvc })}
                        />
                      </div>
                    </section>
                  )}
                </>
              )}
              {step === 3 && (
                <>
                  <div className="settings-info-row">
                    <span>
                      <strong>PayPal</strong>
                      <small>
                        Sync transactions, disputes, and evidence for this
                        business.
                      </small>
                    </span>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        if (paypal) setPaypal(false);
                        else setAuthorizing(true);
                      }}
                    >
                      {paypal ? 'Disconnect' : 'Connect PayPal'}
                    </button>
                  </div>
                  {paypal && <p role="status">PayPal connected</p>}
                  {authorizing && (
                    <div className="settings-action-panel">
                      <h3>Connect your PayPal account</h3>
                      <p>
                        Allow this team to read transactions and disputes and
                        receive account updates.
                      </p>
                      <div className="button-row">
                        <button
                          type="button"
                          className="button primary"
                          onClick={() => {
                            setPaypal(true);
                            setAuthorizing(false);
                          }}
                        >
                          Authorize connection
                        </button>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => setAuthorizing(false)}
                        >
                          Cancel connection
                        </button>
                      </div>
                    </div>
                  )}
                  <small className="setup-preview-note">
                    You can also connect PayPal later from Merchant settings →
                    Integrations.
                  </small>
                </>
              )}
              {step === 4 && (
                <>
                  <dl className="merchant-create-summary">
                    {[
                      ['Merchant name', details.displayName],
                      ['Contact', `${details.contactName} · ${details.email}`],
                      ['Business phone', details.phone],
                      [
                        'Business address',
                        [
                          address.street,
                          address.unit,
                          address.city,
                          address.region,
                          address.postalCode,
                          address.country,
                        ]
                          .filter(Boolean)
                          .join(', '),
                      ],
                      ['Time zone', details.timezone.replaceAll('_', ' ')],
                      ['Subscription', selectedPlan?.name || '—'],
                      [
                        'Payment method',
                        `Card ending in ${card.number.replace(/\s/g, '').slice(-4)}`,
                      ],
                      ['PayPal', paypal ? 'Connected' : 'Connect later'],
                    ].map(([title, value]) => (
                      <div key={title}>
                        <dt>{title}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="settings-action-panel">
                    <h3>Your team</h3>
                    <p>
                      {account.displayName} · {account.email}
                    </p>
                    <small>
                      You’ll be the admin. Invite members from Merchant settings
                      → Teams.
                    </small>
                  </div>
                </>
              )}
              {error && <p role="alert">{error}</p>}
              <div className="button-row merchant-create-actions">
                <button
                  type="submit"
                  className="button primary"
                  disabled={step === 2 && !selectedPlan}
                >
                  {step < 4 ? 'Continue' : 'Create team'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={step === 0 ? onClose : () => move(step - 1)}
                >
                  {step === 0 ? 'Cancel' : 'Back'}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </dialog>
  );
}
