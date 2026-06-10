export function updateOnboardingStatus(newStatus: 'PENDING' | 'COMPLETED'): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 300);
  });
}
