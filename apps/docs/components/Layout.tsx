'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Badge } from '@zyncat/ui/badge';
import { Button } from '@zyncat/ui/button';
import { Collapse } from '@zyncat/ui/collapse';
import { MotionDevtools } from '@zyncat/ui/motion-devtools';
import { ThemeSwitcher } from '@zyncat/ui/theme-switcher';
import { Toaster } from '@zyncat/ui/toast';

import { GROUPS, NEW_SLUGS } from '../content/registry';
import { CommandMenu } from './CommandMenu';
import { Icon } from './icon';

export function DocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    window.scrollTo(0, 0);
    setIsMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleGroup = (id: string) => {
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="docs-shell">
      <MotionDevtools persist={false} />
      <Toaster />
      <CommandMenu open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header className="navbar">
        <div className="navbar__inner">
          <div className="navbar__left">
            <Button
              variant="ghost"
              size="icon"
              className="navbar__mobile-toggle"
              onClick={() => setIsMobileNavOpen((o) => !o)}
              aria-label="Toggle navigation menu"
            >
              <Icon name={isMobileNavOpen ? 'x' : 'list'} size="md" />
            </Button>

            <Link href="/introduction" className="brand">
              <span className="brand__mark" />
              <span className="brand__name">Zyncat UI</span>
            </Link>
          </div>

          <div className="navbar__right">
            <nav className="navbar__nav" aria-label="Site">
              <Link
                href="/introduction"
                className={`navbar__nav-link ${
                  pathname === '/introduction' ||
                  pathname === '/installation' ||
                  pathname === '/theming' ||
                  pathname === '/mcp'
                    ? 'navbar__nav-link--active'
                    : ''
                }`}
              >
                Docs
              </Link>
              <Link
                href="/button"
                className={`navbar__nav-link ${
                  pathname !== '/' &&
                  pathname !== '/introduction' &&
                  pathname !== '/installation' &&
                  pathname !== '/theming' &&
                  pathname !== '/mcp'
                    ? 'navbar__nav-link--active'
                    : ''
                }`}
              >
                Components
              </Link>
              <a
                href="https://github.com/Tabsir99/zyncat-ui"
                target="_blank"
                rel="noopener noreferrer"
                className="navbar__nav-link"
              >
                GitHub
              </a>
            </nav>

            <ThemeSwitcher align="end" />

            <button
              type="button"
              className="search-btn"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search documentation"
            >
              <Icon name="magnifying-glass" size="sm" />
              <span className="search-btn__placeholder">Search the index</span>
              <kbd className="search-btn__kbd">⌘K</kbd>
            </button>
          </div>
        </div>
      </header>

      <div className="docs-container">
        <aside className={`sidebar ${isMobileNavOpen ? 'sidebar--open' : ''}`}>
          <div className="sidebar__inner">
            <nav className="sidebar__nav" aria-label="Documentation">
              {GROUPS.map((g) => {
                const isOpen = !closedGroups.has(g.id);
                return (
                  <div key={g.id} className="nav__group">
                    <button
                      type="button"
                      className="nav__head"
                      onClick={() => toggleGroup(g.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="nav__title">{g.title}</span>
                      <span className="nav__caret">
                        <Icon name="caret-down" size="sm" />
                      </span>
                    </button>
                    <Collapse open={isOpen}>
                      <div className="nav__items">
                        {g.docs.map((d) => {
                          const isNew = NEW_SLUGS.has(d.slug);
                          const isActive = pathname === `/${d.slug}`;
                          return (
                            <Link
                              key={d.slug}
                              href={`/${d.slug}`}
                              className={`nav__link${isActive ? ' nav__link--active' : ''}`}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              <span className="nav__link-label">{d.label}</span>
                              {isNew ? (
                                <Badge tone="info" size="sm">
                                  New
                                </Badge>
                              ) : null}
                            </Link>
                          );
                        })}
                      </div>
                    </Collapse>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {isMobileNavOpen ? (
          <div className="sidebar-backdrop" onClick={() => setIsMobileNavOpen(false)} aria-hidden />
        ) : null}

        <main className="main-content" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
