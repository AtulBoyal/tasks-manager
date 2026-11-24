import { describe, it, expect } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RecurrenceEditor from '../../components/RecurrenceEditor';

let latest = {};

function Harness({ initialRecurrence = 'none', initialRule = null, lastDate = '' }) {
  const [recurrence, setRecurrence] = useState(initialRecurrence);
  const [rule, setRule] = useState(initialRule);
  latest = { recurrence, rule };
  return (
    <RecurrenceEditor
      recurrence={recurrence}
      setRecurrence={setRecurrence}
      rule={rule}
      setRule={setRule}
      lastDate={lastDate}
    />
  );
}

const frequency = () => screen.getByRole('combobox');

describe('RecurrenceEditor', () => {
  it('shows only the frequency picker for one-off tasks', () => {
    render(<Harness />);

    expect(frequency()).toHaveValue('none');
    expect(screen.queryByLabelText('Repeat every')).not.toBeInTheDocument();
  });

  it('builds "every 2 weeks on Mon, Wed"', () => {
    render(<Harness />);

    fireEvent.change(frequency(), { target: { value: 'weekly' } });
    fireEvent.change(screen.getByLabelText('Repeat every'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Monday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Wednesday' }));

    expect(screen.getByText('Every 2 weeks on Mon, Wed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'true');
    expect(latest).toMatchObject({ recurrence: 'weekly', rule: { interval: 2, weekdays: [1, 3] } });
  });

  it('defaults weekly to the deadline weekday', () => {
    // 25 Nov 2026 is a Wednesday
    render(<Harness initialRecurrence="weekly" lastDate="2026-11-25" />);

    expect(screen.getByRole('button', { name: 'Wednesday' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Weekly on Wed')).toBeInTheDocument();
  });

  it('asks for days when weekly has no deadline and no days picked', () => {
    render(<Harness initialRecurrence="weekly" />);

    expect(screen.getByText(/pick days, or set a deadline/)).toBeInTheDocument();
  });

  it('suggests the deadline day for monthly and explains short months', () => {
    render(<Harness initialRecurrence="monthly" lastDate="2027-01-31" />);

    expect(screen.getByLabelText('Day of month')).toHaveAttribute('placeholder', '31');
    expect(screen.getByText(/Monthly on day 31/)).toBeInTheDocument();
    expect(screen.getByText(/shorter months use their last day/)).toBeInTheDocument();
  });

  it('shows "every 3 days" for daily', () => {
    render(<Harness initialRecurrence="daily" />);

    fireEvent.change(screen.getByLabelText('Repeat every'), { target: { value: '3' } });

    expect(screen.getByText('Every 3 days')).toBeInTheDocument();
  });
});
