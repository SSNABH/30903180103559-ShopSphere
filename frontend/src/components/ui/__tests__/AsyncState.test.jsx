import { fireEvent, render, screen } from '@testing-library/react';
import { EmptyState, ErrorState, LoadingState } from '../AsyncState.jsx';

describe('AsyncState components', () => {
  test('announces loading progress accessibly', () => {
    render(<LoadingState title="Loading products" description="Please wait" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading products');
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  test('shows an error and invokes retry', () => {
    const retry = vi.fn();
    render(<ErrorState title="Could not load" description="Network error" onRetry={retry} retryLabel="Retry" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  test('renders an empty-state action', () => {
    render(<EmptyState title="No products" description="Clear filters" action={<button>Reset</button>} />);
    expect(screen.getByText('No products')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
  });
});
