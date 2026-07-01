import { defineConfig } from 'vitepress';

import { DOCS_SITE_URL, GITHUB_REPO, GITHUB_REPO_URL } from './repo.mjs';

const repo = GITHUB_REPO;

export default defineConfig({
  title: 'OACP',
  description:
    'Open Agent Collaboration Protocol — multi-agent task execution and collaboration you can see working live',
  lang: 'en-US',
  base: process.env.VITEPRESS_BASE ?? '/',
  cleanUrls: true,
  lastUpdated: false,

  /** Repo-root links (../ROADMAP, ../examples/…) are valid in GitHub but outside the docs tree. */
  ignoreDeadLinks: [/\.\.\//, /^http:\/\/localhost:\d+/],

  head: [['meta', { name: 'theme-color', content: '#3b82f6' }]],

  themeConfig: {
    logo: { text: 'OACP' },
    nav: [
      { text: 'Quick start', link: '/quick-start' },
      { text: 'What is OACP?', link: '/what-is-oacp' },
      { text: 'Guide', link: '/guide/overview' },
      { text: 'Examples', link: '/examples-gallery' },
      {
        text: 'GitHub',
        link: `https://github.com/${repo}`,
      },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is OACP?', link: '/what-is-oacp' },
          { text: 'Quick start', link: '/quick-start' },
          { text: 'Documentation overview', link: '/guide/overview' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Development guide', link: '/development' },
          { text: 'Documentation site', link: '/docs-site' },
        ],
      },
      {
        text: 'Protocol',
        collapsed: false,
        items: [
          { text: 'Protocol specification', link: '/protocol-spec' },
          { text: 'Message types', link: '/message-types' },
          { text: 'Message validation', link: '/message-validation' },
          { text: 'Agent identity', link: '/agent-identity' },
          { text: 'Security model', link: '/security-model' },
          { text: 'Agent lifecycle', link: '/agent-lifecycle' },
        ],
      },
      {
        text: 'Runtime & routing',
        items: [
          { text: 'Message bus', link: '/message-bus' },
          { text: 'Agent runtime', link: '/agent-runtime' },
          { text: 'Capability routing', link: '/capability-routing' },
          { text: 'Reliable delivery', link: '/reliable-delivery' },
          { text: 'Registry design', link: '/registry-design' },
        ],
      },
      {
        text: 'Networking',
        items: [
          { text: 'HTTP server', link: '/http-server' },
          { text: 'Remote client', link: '/remote-client' },
          { text: 'TypeScript SDK', link: '/sdk-typescript' },
          { text: 'Python SDK', link: '/sdk-python' },
          { text: 'Multi-agent pipeline', link: '/multi-agent-pipeline' },
        ],
      },
      {
        text: 'Collaboration',
        items: [
          { text: 'Memory system', link: '/memory-system' },
          { text: 'Delegation graph', link: '/delegation-graph' },
          { text: 'Subtask decomposition', link: '/subtask-decomposition' },
          { text: 'Workflow engine', link: '/workflow-engine' },
          { text: 'Failure recovery', link: '/failure-recovery' },
          { text: 'Observability', link: '/observability' },
        ],
      },
      {
        text: 'Demos & adoption',
        items: [
          { text: 'Demo v1', link: '/demo-v1' },
          { text: 'Demo v2', link: '/demo-v2' },
          { text: 'Startup team', link: '/startup-team' },
          { text: 'OACP Console', link: '/console' },
          { text: 'MCPLab guide', link: '/mcplab' },
          { text: 'MCPLab integration', link: '/mcplab-integration' },
          { text: 'MCPLab full-loop (Day 15)', link: '/mcplab-full-loop' },
          { text: 'Console API spec', link: '/console-spec' },
          { text: 'Observability client', link: '/observability-client' },
          { text: 'Observability SSE events', link: '/observability-events' },
          { text: 'Console message feed', link: '/console-message-feed' },
          { text: 'Console components', link: '/console-components' },
          { text: 'Console architecture', link: '/console-architecture' },
          { text: 'Console performance budget', link: '/console-performance-budget' },
          { text: 'Showcase QA checklist', link: '/console-showcase-qa-checklist' },
          { text: 'v1.0 build plan', link: '/version1' },
          { text: 'Playground (legacy)', link: '/playground' },
          { text: 'CLI', link: '/cli' },
          { text: 'Example gallery', link: '/examples-gallery' },
          { text: 'Integrations', link: '/integrations' },
          { text: 'LangChain adapter', link: '/integration-langchain' },
          { text: 'AutoGen adapter', link: '/integration-autogen' },
          { text: 'Integration testing', link: '/integration-testing' },
          { text: 'Load + security smoke (Day 55)', link: '/load-security-smoke' },
          { text: 'Demo scripts (Day 56)', link: '/demo-scripts' },
          { text: 'Launch demo (Day 57)', link: '/demo-video' },
          { text: 'Integration surfaces (Day 58)', link: '/integration-surfaces' },
          { text: 'Bring your own agents', link: '/bring-your-own-agents' },
          { text: 'Distribution guide', link: '/distribution' },
          { text: 'MCPLab guide', link: '/mcplab' },
        ],
      },
      {
        text: 'Community',
        items: [
          { text: 'Community & support', link: '/community' },
          { text: 'Migration v0.1 → v1.0', link: '/migration/v0.1-to-v1.0' },
          { text: 'Release v1.0.0-rc.1', link: '/releases/v1.0.0-rc.1' },
          { text: 'Release v1.0.0', link: '/releases/v1.0.0' },
          { text: 'Release v0.1.0-alpha', link: '/releases/v0.1.0-alpha' },
        ],
      },
      {
        text: 'Example docs',
        collapsed: true,
        items: [
          { text: 'Basic agent flow', link: '/examples/basic-agent-flow' },
          { text: 'Multi-agent task', link: '/examples/multi-agent-task' },
          { text: 'Autonomous team demo', link: '/examples/autonomous-team-demo' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: `https://github.com/${repo}` }],

    footer: {
      message: 'Apache-2.0 Licensed',
      copyright: 'Copyright © OACP contributors',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: `https://github.com/${repo}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },
});
