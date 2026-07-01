import { ConsoleProviders } from './providers/ConsoleProviders.js';
import { ConsoleErrorBoundary } from './components/ConsoleErrorBoundary.js';
import { ConsoleLayout } from './layout/ConsoleLayout.js';

export function App() {
  return (
    <ConsoleErrorBoundary>
      <ConsoleProviders>
        <ConsoleLayout />
      </ConsoleProviders>
    </ConsoleErrorBoundary>
  );
}
