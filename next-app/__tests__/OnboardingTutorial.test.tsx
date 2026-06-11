import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingTutorial from '../components/OnboardingTutorial';
import OnboardingPage from '../app/onboarding/page';
import confetti from 'canvas-confetti';

// Mock confetti
jest.mock('canvas-confetti', () => jest.fn());

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock Header to isolate the test from actual layout components
jest.mock('../components/Header', () => {
  return function MockHeader() {
    return <header data-testid="mock-header">Header</header>;
  };
});

describe('Onboarding Tutorial Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Setup local storage mock state
    Storage.prototype.getItem = jest.fn(() => 'completed');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('Test 1: Ensure Search and Filters are NOT in the document (Cognitive load reduction)', () => {
    render(<OnboardingPage />);
    
    // We explicitly expect no generic "Search" or "Filter" elements
    const searchElements = screen.queryAllByText(/search/i);
    const filterElements = screen.queryAllByText(/filter/i);
    
    // No exact inputs or buttons for search/filter should exist on this page
    expect(searchElements.length).toBe(0);
    expect(filterElements.length).toBe(0);
  });

  it('Test 2: Clicking the Mock Card updates the Checklist state to viewed', () => {
    render(<OnboardingTutorial />);
    
    // Initially uncheck-viewed should be present
    expect(screen.getByTestId('uncheck-viewed')).toBeInTheDocument();
    expect(screen.queryByTestId('check-viewed')).not.toBeInTheDocument();

    const mockCard = screen.getByTestId('mock-assignment-card');
    fireEvent.click(mockCard);

    // After click, it should change to check-viewed
    expect(screen.getByTestId('check-viewed')).toBeInTheDocument();
    expect(screen.queryByTestId('uncheck-viewed')).not.toBeInTheDocument();
    
    // And the detail view should be open
    expect(screen.getByTestId('mock-detail-view')).toBeInTheDocument();
  });

  it('Test 3: Clicking Submit triggers the 500ms delay, calls confetti(), and renders "Enter Classroom"', () => {
    render(<OnboardingTutorial />);
    
    // 1. Click card to open detail view
    const mockCard = screen.getByTestId('mock-assignment-card');
    fireEvent.click(mockCard);

    // 2. Click submit button
    const submitBtn = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitBtn);

    // Immediately after click, the button should say "Processing..."
    expect(screen.getByRole('button', { name: 'Processing...' })).toBeInTheDocument();
    
    // Check-submitted should NOT be checked yet
    expect(screen.getByTestId('uncheck-submitted')).toBeInTheDocument();
    
    // Confetti should not be called yet
    expect(confetti).not.toHaveBeenCalled();

    // 3. Fast-forward time by 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Confetti should have been called
    expect(confetti).toHaveBeenCalledWith(expect.objectContaining({
      particleCount: 100,
    }));

    // Checklist should now be marked as submitted
    expect(screen.getByTestId('check-submitted')).toBeInTheDocument();

    // The "Enter Classroom" button should be rendered
    expect(screen.getByRole('button', { name: 'Enter Classroom' })).toBeInTheDocument();
  });
});
