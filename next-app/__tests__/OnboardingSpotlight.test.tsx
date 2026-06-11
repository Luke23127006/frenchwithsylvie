import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import OnboardingSpotlight from '../components/OnboardingSpotlight';

describe('OnboardingSpotlight', () => {
  let changePasswordBtn: HTMLButtonElement;
  const mockOnNextStep = jest.fn();

  beforeEach(() => {
    // Setup a mock target element in the DOM
    changePasswordBtn = document.createElement('button');
    changePasswordBtn.id = 'change-password-btn';
    changePasswordBtn.click = jest.fn(); // Mock the click method
    // Mock getBoundingClientRect
    changePasswordBtn.getBoundingClientRect = jest.fn(() => ({
      bottom: 100,
      left: 200,
      top: 50,
      right: 300,
      width: 100,
      height: 50,
      x: 200,
      y: 50,
      toJSON: () => {}
    }));
    document.body.appendChild(changePasswordBtn);
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.removeChild(changePasswordBtn);
  });

  it('Test 1: The Spotlight and Tooltip are rendered automatically when the onboarding step is active', () => {
    const { rerender } = render(
      <OnboardingSpotlight isActive={false} onNextStep={mockOnNextStep} />
    );

    // Should not render when inactive
    expect(screen.queryByTestId('spotlight-backdrop')).not.toBeInTheDocument();
    expect(screen.queryByTestId('spotlight-tooltip')).not.toBeInTheDocument();

    rerender(
      <OnboardingSpotlight isActive={true} onNextStep={mockOnNextStep} />
    );

    // Should render when active
    expect(screen.getByTestId('spotlight-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('spotlight-tooltip')).toBeInTheDocument();
    expect(screen.getByText('Secure your account! Please update your default password.')).toBeInTheDocument();
    
    // Check if the target element styles were updated
    expect(changePasswordBtn.style.zIndex).toBe('61');
    expect(changePasswordBtn.style.position).toBe('relative');
  });

  it('Test 2: Clicking "Update Now" triggers a click on the target button', () => {
    render(
      <OnboardingSpotlight isActive={true} onNextStep={mockOnNextStep} />
    );

    const updateNowBtn = screen.getByRole('button', { name: 'Update Now' });
    fireEvent.click(updateNowBtn);

    expect(changePasswordBtn.click).toHaveBeenCalledTimes(1);
  });

  it('Test 3: Clicking "I\'ll change later" calls the onNextStep callback', () => {
    render(
      <OnboardingSpotlight isActive={true} onNextStep={mockOnNextStep} />
    );

    const skipBtn = screen.getByRole('button', { name: "I'll change later" });
    fireEvent.click(skipBtn);

    expect(mockOnNextStep).toHaveBeenCalledTimes(1);
  });
});
