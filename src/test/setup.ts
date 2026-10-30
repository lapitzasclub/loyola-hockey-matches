import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

// jsdom no implementa scrollIntoView.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = () => {};
}
