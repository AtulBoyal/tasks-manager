import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import QuickAddModal from '../../components/QuickAddModal';

const renderModal = () => {
  const onQuickAdd = vi.fn();
  const onClose = vi.fn();
  render(<QuickAddModal isOpen onClose={onClose} onQuickAdd={onQuickAdd} />);
  return { onQuickAdd, onClose, input: screen.getByLabelText('Task') };
};

describe('QuickAddModal', () => {
  it('shows no preview until something is typed', () => {
    renderModal();
    expect(screen.queryByText(/Will add:/)).not.toBeInTheDocument();
  });

  it('previews what will be created', () => {
    const { input } = renderModal();

    fireEvent.change(input, {
      target: { value: 'submit lab tomorrow !urgent #os every week https://moodle.example.edu/x' }
    });

    const preview = within(screen.getByRole('status', { name: 'Quick add preview' }));

    expect(preview.getByText('submit lab')).toBeInTheDocument();
    expect(preview.getByText('📅 Tomorrow')).toBeInTheDocument();
    expect(preview.getByText('🔴 Urgent')).toBeInTheDocument();
    expect(preview.getByText('🔁 Weekly')).toBeInTheDocument();
    expect(preview.getByText('#os')).toBeInTheDocument();
    expect(preview.getByText('🔗 moodle.example.edu')).toBeInTheDocument();
  });

  it('shows defaults for plain text', () => {
    const { input } = renderModal();

    fireEvent.change(input, { target: { value: 'buy milk' } });

    expect(screen.getByText('📅 No deadline')).toBeInTheDocument();
    expect(screen.getByText('🟡 Normal')).toBeInTheDocument();
  });

  it('submits the raw text and closes', () => {
    const { input, onQuickAdd, onClose } = renderModal();

    fireEvent.change(input, { target: { value: '  gym friday !later  ' } });
    fireEvent.submit(input.closest('form'));

    expect(onQuickAdd).toHaveBeenCalledWith('gym friday !later');
    expect(onClose).toHaveBeenCalled();
  });
});
