jest.mock('@/components/Header', () => () => null);

import { metadata } from '../app/layout';

describe('RootLayout Metadata', () => {
  it('should have the correct favicon and apple touch icon set', () => {
    // We cast to any or check properties since Metadata types can be complex
    const icons = metadata.icons as any;
    
    expect(icons).toBeDefined();
    expect(icons.icon).toBe('/logo.jpg');
    expect(icons.apple).toBe('/logo.jpg');
  });
});
