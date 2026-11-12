import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { SiteRenderer, type LeadInput } from '../components/SiteRenderer';
import { getDemoApi, useApp } from '../app/context';
import { ErrorState, LoadingBlock } from '../components/ui';
import type { SiteContent } from '../../shared/types';

/** /preview/:siteId/:versionId — a version shown inside the Studio's device frames (owners only).
 *  /s/:slug/* — a published website, open to everyone. In the demo, both come from the demo account. */
export default function Preview() {
  const { siteId, versionId, slug } = useParams();
  const { api } = useApp();
  const loc = useLocation();
  const nav = useNavigate();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState('');
  const isPublic = !!slug;

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        if (!isPublic) {
          const d = await api.site(siteId!);
          const v = d.versions.find((x) => x.id === versionId) || d.draft;
          if (!off) setContent(v.content);
        } else if (api.demo) {
          const sites = await api.sites(); const s = sites.find((x) => x.slug === slug && x.liveVersionId);
          if (!s) throw new Error('This website is not published yet.');
          const d = await api.site(s.id); if (!off) setContent(d.live!.content);
        } else {
          const r = await fetch(`/api/public/sites/${encodeURIComponent(slug!)}`);
          if (!r.ok) throw new Error(r.status === 404 ? 'This website does not exist or is not published yet.' : 'This website could not load.');
          const c = (await r.json()) as SiteContent; if (!off) setContent(c);
        }
      } catch (e) { if (!off) setError((e as Error).message); }
    })();
    return () => { off = true; };
  }, [api, siteId, versionId, slug, isPublic]);

  // in the Studio, the editor sends unsaved edits here so the preview follows every keystroke
  useEffect(() => {
    if (isPublic) return;
    const h = (e: MessageEvent) => { if (e.origin === location.origin && e.data?.type === 'lab-preview') setContent(e.data.content as SiteContent); };
    window.addEventListener('message', h); return () => window.removeEventListener('message', h);
  }, [isPublic]);
  // published sites keep their page in the address, so links and the back button work
  useEffect(() => { if (isPublic) setPage(loc.pathname.split('/').slice(3).join('/')); }, [isPublic, loc.pathname]);
  useEffect(() => { if (content) document.title = content.seo.title; }, [content]);

  const onLead = async (l: LeadInput) => {
    if (api.demo) { getDemoApi().addLead(l); return; }
    const target = isPublic ? slug! : siteId!;
    const r = await fetch(`/api/public/sites/${encodeURIComponent(target)}/leads${isPublic ? '' : '?by=id'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(l), credentials: 'same-origin' });
    if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error || 'Your message could not be sent. Please try again.');
  };

  if (error) return <div className="page-x py-16"><ErrorState message={error} /></div>;
  if (!content) return <div className="page-x py-16"><LoadingBlock /></div>;
  return <SiteRenderer content={content} page={page} preview={!isPublic} onLead={onLead}
    onNavigate={(p) => { if (isPublic) nav(`/s/${slug}${p ? `/${p}` : ''}`); else setPage(p); window.scrollTo(0, 0); }} />;
}
