import { defineConfig, presetUno, presetAttributify, transformerDirectives, transformerVariantGroup } from 'unocss'

export default defineConfig({
  content: {
    filesystem: ['src/**/*.{ts,tsx,js,jsx,html}'],
  },
  presets: [
    presetUno(),
    presetAttributify(),
  ],
  shortcuts: {
    'size-full': 'w-full h-full',
  },
  rules: [
    ['content-stretch', { 'align-content': 'stretch' }],
  ],
  safelist: [
    'dark',
    'scroll-auto-hide',
    'sb-scrolling',
    'hide-scrollbar',
    'prose-preview',
    'doc-tiptap-content',
  ],
  theme: {
    colors: {
      background: 'var(--background)',
      foreground: 'var(--foreground)',
      card: 'var(--card)',
      'card-foreground': 'var(--card-foreground)',
      popover: 'var(--popover)',
      'popover-foreground': 'var(--popover-foreground)',
      primary: 'var(--primary)',
      'primary-foreground': 'var(--primary-foreground)',
      secondary: 'var(--secondary)',
      'secondary-foreground': 'var(--secondary-foreground)',
      muted: 'var(--muted)',
      'muted-foreground': 'var(--muted-foreground)',
      accent: 'var(--accent)',
      'accent-foreground': 'var(--accent-foreground)',
      destructive: 'var(--destructive)',
      'destructive-foreground': 'var(--destructive-foreground)',
      border: 'var(--border)',
      input: 'var(--input)',
      'input-background': 'var(--input-background)',
      ring: 'var(--ring)',
      sidebar: 'var(--sidebar)',
      'sidebar-foreground': 'var(--sidebar-foreground)',
      'sidebar-primary': 'var(--sidebar-primary)',
      'sidebar-primary-foreground': 'var(--sidebar-primary-foreground)',
      'sidebar-accent': 'var(--sidebar-accent)',
      'sidebar-accent-foreground': 'var(--sidebar-accent-foreground)',
      'sidebar-border': 'var(--sidebar-border)',
      'sidebar-ring': 'var(--sidebar-ring)',
    },
    borderRadius: {
      sm: 'calc(var(--radius) - 4px)',
      md: 'calc(var(--radius) - 2px)',
      lg: 'var(--radius)',
      xl: 'calc(var(--radius) + 4px)',
    },
  },
  preflights: [
    {
      getCSS: () => `
        *,::before,::after{box-sizing:border-box;border-width:0;border-style:solid;border-color:var(--border);outline-color:color-mix(in oklab,var(--ring) 50%,transparent)}
        html{font-size:var(--font-size)}
        body{margin:0;background:var(--background);color:var(--foreground)}
        h1{font-size:1.5rem;font-weight:var(--font-weight-medium);line-height:1.5}
        h2{font-size:1.25rem;font-weight:var(--font-weight-medium);line-height:1.5}
        h3{font-size:1.125rem;font-weight:var(--font-weight-medium);line-height:1.5}
        h4,label,button{font-size:1rem;font-weight:var(--font-weight-medium);line-height:1.5}
        input{font-size:1rem;font-weight:var(--font-weight-normal);line-height:1.5}
      `,
    },
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
})
