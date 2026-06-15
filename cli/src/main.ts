#!/usr/bin/env node
import { parseRunCommandArgs, printRunHelp, runRunCommand } from './commands/run.js';
import { parseServeCommandArgs, printServeHelp, runServeCommand } from './commands/serve.js';
import { parseTraceCommandArgs, printTraceHelp, runTraceCommand } from './commands/trace.js';
import { printRootHelp } from './output.js';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (command === undefined || command === '--help' || command === '-h' || command === 'help') {
    printRootHelp();
    return;
  }

  const rest = argv.slice(1);

  if (command === 'run') {
    const parsed = parseRunCommandArgs(rest);
    if (parsed === 'help') {
      printRunHelp();
      return;
    }
    process.exitCode = await runRunCommand(parsed);
    return;
  }

  if (command === 'trace') {
    const parsed = parseTraceCommandArgs(rest);
    if (parsed === 'help') {
      printTraceHelp();
      return;
    }
    process.exitCode = await runTraceCommand(parsed);
    return;
  }

  if (command === 'serve') {
    const parsed = parseServeCommandArgs(rest);
    if (parsed === 'help') {
      printServeHelp();
      return;
    }
    process.exitCode = await runServeCommand(parsed);
    return;
  }

  if (command.startsWith('-')) {
    console.error(`Unknown global option: ${command}`);
    printRootHelp();
    process.exitCode = 2;
    return;
  }

  // Convenience: `oacp "build todo app"` → `oacp run "build todo app"`
  const parsed = parseRunCommandArgs([command, ...rest]);
  if (parsed === 'help') {
    printRunHelp();
    return;
  }
  process.exitCode = await runRunCommand(parsed);
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(`[oacp] ${error.message}`);
  } else {
    console.error('[oacp]', error);
  }
  process.exit(1);
});
