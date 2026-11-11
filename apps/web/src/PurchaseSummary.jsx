import React from 'react';
import ProductThumbnail from './ProductThumbnail';
import {
  date,
  label,
  money,
  transactionName,
  transactionSubtitle,
} from './lib/format';
const Row = ({ name, children }) => (
  <div>
    <dt>{name}</dt>
    <dd>{children ?? '—'}</dd>
  </div>
);
export default function PurchaseSummary({ order: transaction }) {
  const order = transaction.order;
  return (
    <section className="card purchase-summary">
      <div className="card-heading">
        <h2>Transaction summary</h2>
      </div>
      <div className="product featured">
        <ProductThumbnail />
        <div>
          <strong>{transactionName(transaction)}</strong>
          <small>{transactionSubtitle(transaction)}</small>
        </div>
      </div>
      <h3 className="payment-details-title">Payment details</h3>
      <dl>
        <Row name="Amount">{money(transaction.amount)}</Row>
        <Row name="Payment received">{date(transaction.capturedAt)}</Row>
        <Row name="PayPal transaction ID">{transaction.paypalCaptureId}</Row>
        <Row name="PayPal order">{transaction.paypalOrderId}</Row>
        <Row name="Invoice">
          {transaction.invoiceId?.trim() || 'Not invoiced'}
        </Row>
        <Row name="Payment status">{label(transaction.status)}</Row>
      </dl>
      {transaction.orderLink.reason && (
        <p>{label(transaction.orderLink.reason)}</p>
      )}

      {order && (
        <>
          <div className="summary-section">
            <h3>Amount breakdown</h3>
            <dl>
              <Row name="Shipping">
                {money({
                  currencyCode: order.currencyCode,
                  value: order.shippingAmount,
                })}
              </Row>
              <Row name="Tax">
                {money({
                  currencyCode: order.currencyCode,
                  value: order.taxAmount,
                })}
              </Row>
              <Row name="Discount">
                {money({
                  currencyCode: order.currencyCode,
                  value: order.discountAmount,
                })}
              </Row>
              <Row name="Order total">
                {money({
                  currencyCode: order.currencyCode,
                  value: order.totalAmount,
                })}
              </Row>
            </dl>
          </div>
          <div className="summary-section">
            <h3>
              Item details <span className="muted">{order.items.length}</span>
            </h3>
            {order.items.map((item, index) => (
              <div className="summary-item" key={index}>
                <strong>
                  {item.description || 'Item details unavailable'}
                </strong>
                <dl>
                  <Row name="SKU">{item.sku}</Row>
                  <Row name="Quantity">{item.quantity}</Row>
                  <Row name="Unit price">
                    {money({
                      currencyCode: order.currencyCode,
                      value: item.unitAmount,
                    })}
                  </Row>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
