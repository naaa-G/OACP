/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OACP_API_BASE?: string;
  readonly VITE_OACP_API_KEY?: string;
  readonly VITE_OACP_API_PROXY?: string;
  readonly VITE_MCPLAB_LAB_URL?: string;
  readonly VITE_GRAPH_MODE?: 'legacy' | 'ops' | 'showcase';
  /** JSON object mapping fleet id → display label, e.g. `{"custom-demo":"Custom demo"}` */
  readonly VITE_OACP_CONSOLE_FLEETS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
