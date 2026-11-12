import { describe, expect, it } from 'vitest';
import { recommend, guessSector } from '../shared/recommend';
import { generateSite, validateSite } from '../shared/generate';
import { analyse } from '../shared/inspect';
import { isPrivateAddress } from '../server/fetchSafe';

describe('recommendation', () => {
  it('never recommends a store app to a simple service business', () => {
    const s = recommend({ businessName: 'Tola Prints', whatYouDo: 'Printing and branding', hasWebsite: 'no', hasApp: 'no' });
    expect(s.products.find((p) => p.kind === 'android')!.verdict).toBe('not_now');
    expect(s.products.find((p) => p.kind === 'ios')!.verdict).toBe('not_now');
    expect(s.journey).toBe('build');
  });
  it('connects instead of rebuilding when a website exists', () => {
    const s = recommend({ businessName: 'X', hasWebsite: 'yes', websiteUrl: 'x.com' });
    expect(s.journey).toBe('connect'); expect(s.products[0].why).toMatch(/do not rebuild/);
  });
  it('recognises sectors', () => { expect(guessSector({ whatYouDo: 'Hair salon and nails' })).toBe('beauty'); expect(guessSector({ whatYouDo: 'Party catering' })).toBe('restaurant'); });
});

describe('website generator', () => {
  const site = generateSite({ businessName: 'Ada Foods', whatYouDo: 'meals and catering', offers: ['Jollof', 'Small chops'], customerLocation: 'Lekki' });
  it('makes a valid site with a contact form and no invented reviews or prices', () => {
    expect(validateSite(site)).toEqual([]);
    const all = JSON.stringify(site);
    expect(all).not.toMatch(/testimonial/); expect(all).not.toMatch(/₦/);
    expect(site.pages.map((p) => p.slug)).toEqual(['', 'menu', 'about', 'contact']);
  });
  it('skips the offers page when there are no offers', () => { expect(generateSite({ businessName: 'Z' }).pages.some((p) => p.slug === 'services')).toBe(false); });
  it('rejects a site with no home page or contact', () => { expect(validateSite({ ...site, pages: site.pages.slice(1, 3) }).length).toBeGreaterThan(0); });
});

describe('inspection', () => {
  const good = '<html lang="en"><head><title>Ada Foods — catering in Lekki</title><meta name="description" content="Home-style Nigerian meals, small chops and party catering in Lekki and Victoria Island."><meta name="viewport" content="width=device-width"><meta property="og:title" content="Ada"><meta property="og:image" content="x.jpg"><link rel="canonical" href="https://ada.com/"><script type="application/ld+json">{}</script></head><body><h1>Ada</h1><img src="a.jpg" alt="Jollof"><a href="tel:0800">Call</a></body></html>';
  it('scores a well-built page highly', () => { expect(analyse(good, { url: 'https://ada.com', finalUrl: 'https://ada.com', status: 200, ms: 300, bytes: 2000 }).score).toBe(100); });
  it('finds the problems on a poor page', () => {
    const r = analyse('<html><head></head><body><img src="a.jpg"><h1>a</h1><h1>b</h1></body></html>', { url: 'http://x.com', finalUrl: 'http://x.com', status: 200, ms: 2500, bytes: 1000 });
    const bad = r.checks.filter((c) => !c.ok).map((c) => c.id);
    expect(bad).toEqual(expect.arrayContaining(['https', 'viewport', 'title', 'desc', 'h1', 'alt', 'contact', 'speed']));
    expect(r.score).toBeLessThan(40);
  });
});

describe('private address blocking', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.9', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '0.0.0.0'])('blocks %s', (ip) => expect(isPrivateAddress(ip)).toBe(true));
  it.each(['8.8.8.8', '104.16.1.1', '2606:4700::1111'])('allows %s', (ip) => expect(isPrivateAddress(ip)).toBe(false));
});
