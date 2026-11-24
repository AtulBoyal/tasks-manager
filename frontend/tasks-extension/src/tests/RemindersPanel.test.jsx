import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RemindersPanel from '../RemindersPanel';
import { DEFAULT_REMINDER_SETTINGS } from '../reminders';

describe('RemindersPanel', () => {
  it('shows the defaults', async () => {
    render(<RemindersPanel onBack={vi.fn()} />);

    expect(await screen.findByLabelText('Desktop reminders')).toBeChecked();
    expect(screen.getByLabelText('Deadline reminder time')).toHaveValue('09:00');
    expect(screen.getByLabelText('Minutes before a contest')).toHaveValue('60');
  });

  it('saves settings and re-plans reminders', async () => {
    chrome.runtime.sendMessage.mockResolvedValue({ ok: true, scheduled: 3 });
    render(<RemindersPanel onBack={vi.fn()} />);

    fireEvent.change(await screen.findByLabelText('Deadline reminder time'), { target: { value: '18:30' } });
    fireEvent.change(screen.getByLabelText('Minutes before a contest'), { target: { value: '15' } });
    fireEvent.click(screen.getByText('Save'));

    expect(await screen.findByRole('status')).toHaveTextContent('Saved · 3 upcoming reminders');
    expect(chrome.storage.local.data.reminderSettings).toEqual({
      ...DEFAULT_REMINDER_SETTINGS,
      deadlineTime: '18:30',
      contestLeadMinutes: 15
    });
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'SYNC_REMINDERS' });
  });

  it('disables the details when reminders are off', async () => {
    render(<RemindersPanel onBack={vi.fn()} />);

    fireEvent.click(await screen.findByLabelText('Desktop reminders'));

    expect(screen.getByLabelText('Deadline reminder time')).toBeDisabled();
    expect(screen.getByLabelText('Minutes before a contest')).toBeDisabled();

    fireEvent.click(screen.getByText('Save'));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved · reminders are off');
  });

  it('loads previously saved settings', async () => {
    await chrome.storage.local.set({ reminderSettings: { deadlineTime: '07:15', contests: false } });
    render(<RemindersPanel onBack={vi.fn()} />);

    expect(await screen.findByLabelText('Deadline reminder time')).toHaveValue('07:15');
    expect(screen.getByLabelText('Minutes before a contest')).toBeDisabled();
  });

  it('goes back', async () => {
    const onBack = vi.fn();
    render(<RemindersPanel onBack={onBack} />);

    fireEvent.click(await screen.findByText('← Back'));
    expect(onBack).toHaveBeenCalled();
  });
});
