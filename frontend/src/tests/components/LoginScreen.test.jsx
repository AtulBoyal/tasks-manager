import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginScreen from '../../components/LoginScreen';

vi.mock('../../services/authService', () => ({
  authService: { signInWithGoogle: vi.fn(), signOut: vi.fn() }
}));

const session = { user: { id: 'user-1', email: 'me@example.com' } };

const renderCreatePin = (onCreatePin = vi.fn().mockResolvedValue(true)) => {
  render(
    <LoginScreen
      session={session}
      hasPin={false}
      onCreatePin={onCreatePin}
      isLoading={false}
      lockedUntil={0}
    />
  );
  return onCreatePin;
};

describe('LoginScreen: create PIN', () => {
  it('explains that the PIN is per device and Google protects the data', () => {
    renderCreatePin();

    expect(screen.getByText('Create a Vault PIN for this device')).toBeInTheDocument();
    expect(screen.getByText(/on this device only/)).toBeInTheDocument();
    expect(screen.getByText(/protected by your Google account/)).toBeInTheDocument();
    expect(screen.getByText(/Sign in\s+with Google again/)).toBeInTheDocument();
  });

  it('enables the button only when both PINs match and are long enough', () => {
    const onCreatePin = renderCreatePin();
    const button = screen.getByRole('button', { name: 'Create PIN & Unlock' });

    fireEvent.change(screen.getByLabelText('New PIN'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: '123' } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText('New PIN'), { target: { value: '4821' } });
    expect(button).toBeDisabled();
    expect(screen.getByText('PINs do not match.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Confirm PIN'), { target: { value: '4821' } });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(onCreatePin).toHaveBeenCalledWith('4821', '4821');
  });

  it('does not offer Forgot PIN or fingerprint before a PIN exists', () => {
    renderCreatePin();

    expect(screen.queryByText('Forgot PIN?')).not.toBeInTheDocument();
    expect(screen.queryByText(/Unlock with Fingerprint/)).not.toBeInTheDocument();
  });
});
