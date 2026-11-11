import React from 'react';
import SegmentedFilters from './SegmentedFilters';
const options = ['All transactions', 'Incomplete', 'Needs review'];
export default function TransactionFilters({ value, onChange }) {
  return (
    <SegmentedFilters
      value={value}
      onChange={onChange}
      options={options}
      label="Filter transactions"
      onArrowDown={() =>
        document.querySelector('.transactions-table tbody tr')?.focus()
      }
    />
  );
}
