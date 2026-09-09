'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Badge } from '@zyncat/ui/badge';
import { Button } from '@zyncat/ui/button';
import { TabPanel, Tabs } from '@zyncat/ui/tabs';
import { toast } from '@zyncat/ui/toast-store';
import { Tooltip } from '@zyncat/ui/tooltip';

import { DOCS, NEW_SLUGS, type Doc } from '../content/registry';
import type { PageSeo } from '../content/seo/types';
import { Faq } from './Faq';
import { Icon } from './icon';
import { CodeBlock, InstallationBox } from './kit';
import { PropsTable } from './PropsTable';
import { TableOfContents } from './TableOfContents';

export function PageView({ doc, seo }: { doc: Doc; seo?: PageSeo }) {
  const { slug, label, headline, blurb, HeroComponent, Playground, heroCode, props, types } = doc;

  const [heroTab, setHeroTab] = useState('preview');
  const [heroDir, setHeroDir] = useState<1 | -1 | 0>(0);
  const [heroKey, setHeroKey] = useState(0);

  const currentIndex = DOCS.findIndex((d) => d.slug === slug);
  const prevDoc = currentIndex > 0 ? DOCS[currentIndex - 1] : null;
  const nextDoc = currentIndex < DOCS.length - 1 ? DOCS[currentIndex + 1] : null;

  const heroItems = [{ value: 'preview', label: 'Preview' }];
  if (heroCode) heroItems.push({ value: 'code', label: 'Code' });

  const handleCopyPage = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      const pageSnippet =
        heroCode || `import { ${label} } from '@zyncat/ui/${slug}';\nimport '@zyncat/ui/${slug}.css';`;
      navigator.clipboard.writeText(pageSnippet);
      toast.success('Page code copied', { description: `${label} — ready to paste.` });
    }
  };

  const handleHeroReplay = () => {
    setHeroKey((k) => k + 1);
  };

  return (
    <div className="doc-layout" key={slug}>
      <article className="page">
        <header className="page__head">
          <div className="page__title-row">
            <h1 className="page__title">{headline ?? label}</h1>
            {doc.Content ? null : (
              <div className="page__actions">
                <Button variant="secondary" size="sm" onClick={handleCopyPage} aria-label="Copy page code">
                  <Icon name="copy" size="sm" />
                  Copy page
                </Button>
                <div className="page__nav-arrows">
                  {prevDoc ? (
                    <Tooltip content={prevDoc.label} placement="bottom">
                      <Link
                        href={`/${prevDoc.slug}`}
                        className="btn-icon-nav"
                        aria-label={`Previous component: ${prevDoc.label}`}
                      >
                        <Icon name="arrow-left" size="sm" />
                      </Link>
                    </Tooltip>
                  ) : (
                    <span className="btn-icon-nav btn-icon-nav--disabled">
                      <Icon name="arrow-left" size="sm" />
                    </span>
                  )}
                  {nextDoc ? (
                    <Tooltip content={nextDoc.label} placement="bottom">
                      <Link
                        href={`/${nextDoc.slug}`}
                        className="btn-icon-nav"
                        aria-label={`Next component: ${nextDoc.label}`}
                      >
                        <Icon name="arrow-right" size="sm" />
                      </Link>
                    </Tooltip>
                  ) : (
                    <span className="btn-icon-nav btn-icon-nav--disabled">
                      <Icon name="arrow-right" size="sm" />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="page__blurb">{seo?.lede ?? blurb}</p>
        </header>

        {doc.Content ? (
          <div className="doc-guide-content">
            <doc.Content />
          </div>
        ) : null}

        {Playground ? (
          <section className="playground-section" id="playground" aria-labelledby="playground-heading">
            <h2 id="playground-heading" className="visually-hidden">
              {label} playground
            </h2>
            <Playground />
          </section>
        ) : null}

        {HeroComponent ? (
          <section className="hero-preview" id="preview" aria-labelledby="preview-heading">
            <h2 id="preview-heading" className="visually-hidden">
              {label} preview
            </h2>
            <div className="hero-preview__tabs-bar">
              <Tabs
                items={heroItems}
                value={heroTab}
                onChange={(v, d) => {
                  setHeroTab(v);
                  setHeroDir(d);
                }}
                name={`hero-${slug}`}
                ariaLabel={`${label} demo view`}
                className="plate-tabs"
              />
              <div className="hero-preview__actions">
                {NEW_SLUGS.has(slug) ? (
                  <Badge tone="info" size="sm">
                    New in 0.11
                  </Badge>
                ) : null}
                <Tooltip content="Replay the demo" placement="bottom">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleHeroReplay}
                    aria-label="Restart component animation"
                  >
                    <Icon name="arrow-counter-clockwise" size="sm" />
                  </Button>
                </Tooltip>
              </div>
            </div>

            <TabPanel name={`hero-${slug}`} tab={heroTab} dir={heroDir}>
              {heroTab === 'preview' ? (
                <div className="hero-preview__canvas" key={heroKey}>
                  <div className="hero-preview__inner">
                    <HeroComponent />
                  </div>
                </div>
              ) : heroCode ? (
                <div className="hero-preview__code">
                  <CodeBlock code={heroCode} language="tsx" />
                </div>
              ) : null}
            </TabPanel>
          </section>
        ) : null}

        {!doc.Content ? <InstallationBox slug={slug} /> : null}

        {!doc.Content && heroCode ? (
          <section className="doc-section" id="usage" aria-labelledby="usage-heading">
            <div className="section-head">
              <h2 id="usage-heading" className="section-head__title">
                Usage
              </h2>
            </div>
            <CodeBlock code={heroCode} language="tsx" />
            <p className="section-note">
              Compose {label} in your application. No Tailwind or external styling library is required; every value
              resolves from Zyncat UI&apos;s token vocabulary.
            </p>
          </section>
        ) : null}

        {props && props.length > 0 ? (
          <section className="doc-section" id="props" aria-labelledby="props-heading">
            <div className="section-head">
              <h2 id="props-heading" className="section-head__title">
                {label} props
              </h2>
            </div>
            <PropsTable rows={props} title={label} />
            {types?.map((type) => (
              <PropsTable key={type.name} rows={type.rows} title={type.name} />
            ))}
          </section>
        ) : null}

        {seo?.faq?.length ? <Faq items={seo.faq} /> : null}

        <nav className="page-pagination" aria-label="Component navigation">
          {prevDoc ? (
            <Link href={`/${prevDoc.slug}`} className="pagination-card pagination-card--prev">
              <span className="pagination-card__sub">
                <Icon name="arrow-left" size="sm" /> Previous
              </span>
              <span className="pagination-card__title">{prevDoc.label}</span>
            </Link>
          ) : (
            <div className="pagination-card pagination-card--placeholder" />
          )}
          {nextDoc ? (
            <Link href={`/${nextDoc.slug}`} className="pagination-card pagination-card--next">
              <span className="pagination-card__sub">
                Next <Icon name="arrow-right" size="sm" />
              </span>
              <span className="pagination-card__title">{nextDoc.label}</span>
            </Link>
          ) : (
            <div className="pagination-card pagination-card--placeholder" />
          )}
        </nav>

        <footer className="page-footer">
          <span>Set in Geist &amp; Newsreader — animated by the house engine</span>
          <span className="page-footer__row">
            Zyncat UI · Rev 0.11 · MIT · Built by Tabsir Ahammed · Source on{' '}
            <a
              href="https://github.com/Tabsir99/zyncat-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="page-footer__link"
            >
              GitHub
            </a>
          </span>
        </footer>
      </article>

      <TableOfContents doc={doc} seo={seo} />
    </div>
  );
}
