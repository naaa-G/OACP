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
          { text: 'Playground', link: '/playground' },
          { text: 'CLI', link: '/cli' },
          { text: 'Example gallery', link: '/examples-gallery' },
          { text: 'Integrations', link: '/integrations' },
          { text: 'LangChain adapter', link: '/integration-langchain' },
          { text: 'AutoGen adapter', link: '/integration-autogen' },
          { text: 'Integration testing', link: '/integration-testing' },
        ],
      },
      {
        text: 'Launch & adoption',
        items: [
          { text: 'Launch kit', link: '/launch-kit' },
          { text: 'Launch day (Day 30)', link: '/launch-day' },
          { text: 'Post-launch runbook', link: '/post-launch' },
          { text: 'Community & support', link: '/community' },
          { text: 'Release v0.1.0-alpha', link: '/releases/v0.1.0-alpha' },
          { text: 'Demo video script', link: '/demo-video-script' },
          { text: 'Screenshots guide', link: '/screenshots' },
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
