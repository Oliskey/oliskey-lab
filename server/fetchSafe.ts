// Fetches a public web page for inspection without letting anyone use Lab to reach private networks (SSRF):
// only http/https on standard ports, every address (and every redirect) resolved and checked against private,
// loopback, link-local and cloud-metadata ranges, a 10-second limit and a 2 MB cap.
import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_V4: [string, number][] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];
const v4num = (ip: string) => ip.split('.').reduce((a, o) => (a << 8) + +o, 0) >>> 0;
export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return BLOCKED_V4.some(([base, bits]) => (v4num(ip) & (bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0)) === (v4num(base) & ((~0 << (32 - bits)) >>> 0)));
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x === '::' || x === '::1') return true;
    if (x.startsWith('::ffff:')) return isPrivateAddress(x.slice(7));
    return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(x);
  }
  return true;
}

export class FetchError extends Error {}

async function checkHost(u: URL) {
  if (!['http:', 'https:'].includes(u.protocol)) throw new FetchError('Only web addresses (http or https) can be inspected.');
  if (u.port && !['80', '443'].includes(u.port)) throw new FetchError('Only standard web ports can be inspected.');
  if (u.username || u.password) throw new FetchError('Addresses with passwords cannot be inspected.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true }).catch(() => { throw new FetchError('That address could not be found. Check the spelling.'); })).map((a) => a.address);
  if (!addrs.length || addrs.some(isPrivateAddress)) throw new FetchError('That address points to a private network and cannot be inspected.');
}

export async function fetchPage(raw: string): Promise<{ html: string; finalUrl: string; status: number; ms: number; bytes: number }> {
  let url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  const t0 = Date.now();
  for (let hop = 0; hop < 5; hop++) {
    await checkHost(url);
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 10000);
    let res: Response;
    try { res = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { 'user-agent': 'OliskeyLabInspector/1.0 (+https://lab.oliskey.com)', accept: 'text/html,*/*;q=0.5' } }); }
    catch { clearTimeout(timer); throw new FetchError('The website did not answer within 10 seconds.'); }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { clearTimeout(timer); url = new URL(res.headers.get('location')!, url); continue; }
    const reader = res.body?.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
    if (reader) {
      for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 2_000_000) { ctrl.abort(); break; } chunks.push(value); }
    }
    clearTimeout(timer);
    const html = Buffer.concat(chunks).toString('utf8');
    return { html, finalUrl: url.toString(), status: res.status, ms: Date.now() - t0, bytes };
  }
  throw new FetchError('The website redirects too many times.');
}
