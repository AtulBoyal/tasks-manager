import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProtectedRoute from '../../routes/ProtectedRoute';

vi.mock('../../components/LoginScreen', () => ({
  default: () => <div>Mock Login Screen</div>
}));

function MockChild() {
  return <div>Dashboard Loaded</div>;
}

describe('ProtectedRoute', () => {

  it('renders children when unlocked', () => {

    render(
      <ProtectedRoute
        isLocallyUnlocked={true}
        session={{ user: { id: 1 } }}
      >
        <MockChild />
      </ProtectedRoute>
    );

    expect(
      screen.getByText('Dashboard Loaded')
    ).toBeInTheDocument();

  });

  it('shows the login screen when locked', () => {
    render(
      <ProtectedRoute isLocallyUnlocked={false} session={{ user: { id: 1 } }}>
        <MockChild />
      </ProtectedRoute>
    );

    expect(screen.getByText('Mock Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Loaded')).not.toBeInTheDocument();
  });

  it('shows the login screen without a session even if unlocked', () => {
    render(
      <ProtectedRoute isLocallyUnlocked={true} session={null}>
        <MockChild />
      </ProtectedRoute>
    );

    expect(screen.getByText('Mock Login Screen')).toBeInTheDocument();
  });

});