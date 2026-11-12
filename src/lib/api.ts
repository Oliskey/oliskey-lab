// One data interface for the whole app. The real server (HttpApi) and the in-browser demo (DemoApi) both implement it,
// so every screen behaves the same in the demo and in a real account.
import type {
  AuditEntry, DigitalProduct, FocusItem, Metrics, Discovery, DiscoveryAnswers, Grant, InspectionReport, Lead, Permission, Session, Site,
  SiteContent, SiteVersion, SocialAccount, SocialPlatform, Strategy,
} from '../../shared/types';

export interface SiteDetail { site: Site; versions: SiteVersion[]; draft: SiteVersion; live: SiteVersion | null }
export interface Api {
  readonly demo: boolean;
  session(): Promise<Session | null>;
  signUp(input: { name: string; email: string; password: string; business: string }): Promise<Session>;
  signIn(input: { email: string; password: string }): Promise<Session>;
  signOut(): Promise<void>;

  discovery(): Promise<Discovery>;
  saveDiscovery(answers: DiscoveryAnswers, step: number): Promise<Discovery>;
  completeDiscovery(): Promise<Strategy>;
  strategy(): Promise<Strategy | null>;

  sites(): Promise<Site[]>;
  createSite(): Promise<Site>;
  site(id: string): Promise<SiteDetail>;
  saveDraft(id: string, content: SiteContent, note: string): Promise<SiteDetail>;
  requestApproval(id: string): Promise<SiteDetail>;
  approveAndPublish(id: string): Promise<SiteDetail>;
  restoreVersion(id: string, versionId: string): Promise<SiteDetail>;

  products(): Promise<DigitalProduct[]>;
  connectProduct(input: { type: DigitalProduct['type']; name: string; url: string }): Promise<DigitalProduct>;
  inspect(productId: string): Promise<InspectionReport>;
  lastInspection(productId: string): Promise<InspectionReport | null>;
  startDomainCheck(productId: string): Promise<DigitalProduct>;
  checkDomain(productId: string): Promise<{ product: DigitalProduct; found: boolean; message: string }>;
  disconnectProduct(productId: string): Promise<void>;

  grants(): Promise<Grant[]>;
  grant(productId: string, permission: Permission): Promise<Grant>;
  revoke(grantId: string): Promise<void>;

  leads(): Promise<Lead[]>;
  setLeadStatus(id: string, status: Lead['status']): Promise<Lead>;

  social(): Promise<SocialAccount[]>;
  requestSocial(platform: SocialPlatform): Promise<SocialAccount>;

  audit(): Promise<AuditEntry[]>;
  metrics(): Promise<Metrics>;
  focus(): Promise<FocusItem[]>;
  setFocus(id: string, done: boolean): Promise<FocusItem[]>;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

/** The real server: same-origin JSON API with an http-only session cookie. */
export class HttpApi implements Api {
  readonly demo = false;
  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`/api${path}`, { method, credentials: 'same-origin', headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    } catch {
      throw new ApiError('No connection. Check your internet and try again.', 0);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError((data as { error?: string }).error || 'Something went wrong. Please try again.', res.status);
    return data as T;
  }
  session() { return this.call<{ session: Session | null }>('GET', '/session').then((r) => r.session); }
  signUp(i: { name: string; email: string; password: string; business: string }) { return this.call<Session>('POST', '/auth/sign-up', i); }
  signIn(i: { email: string; password: string }) { return this.call<Session>('POST', '/auth/sign-in', i); }
  signOut() { return this.call<void>('POST', '/auth/sign-out'); }
  discovery() { return this.call<Discovery>('GET', '/discovery'); }
  saveDiscovery(answers: DiscoveryAnswers, step: number) { return this.call<Discovery>('PUT', '/discovery', { answers, step }); }
  completeDiscovery() { return this.call<Strategy>('POST', '/discovery/complete'); }
  strategy() { return this.call<{ strategy: Strategy | null }>('GET', '/strategy').then((r) => r.strategy); }
  sites() { return this.call<Site[]>('GET', '/sites'); }
  createSite() { return this.call<Site>('POST', '/sites'); }
  site(id: string) { return this.call<SiteDetail>('GET', `/sites/${id}`); }
  saveDraft(id: string, content: SiteContent, note: string) { return this.call<SiteDetail>('PUT', `/sites/${id}/draft`, { content, note }); }
  requestApproval(id: string) { return this.call<SiteDetail>('POST', `/sites/${id}/request-approval`); }
  approveAndPublish(id: string) { return this.call<SiteDetail>('POST', `/sites/${id}/publish`); }
  restoreVersion(id: string, versionId: string) { return this.call<SiteDetail>('POST', `/sites/${id}/restore`, { versionId }); }
  products() { return this.call<DigitalProduct[]>('GET', '/products'); }
  connectProduct(i: { type: DigitalProduct['type']; name: string; url: string }) { return this.call<DigitalProduct>('POST', '/products', i); }
  inspect(id: string) { return this.call<InspectionReport>('POST', `/products/${id}/inspect`); }
  lastInspection(id: string) { return this.call<{ report: InspectionReport | null }>('GET', `/products/${id}/inspection`).then((r) => r.report); }
  startDomainCheck(id: string) { return this.call<DigitalProduct>('POST', `/products/${id}/domain/start`); }
  checkDomain(id: string) { return this.call<{ product: DigitalProduct; found: boolean; message: string }>('POST', `/products/${id}/domain/check`); }
  disconnectProduct(id: string) { return this.call<void>('DELETE', `/products/${id}`); }
  grants() { return this.call<Grant[]>('GET', '/grants'); }
  grant(productId: string, permission: Permission) { return this.call<Grant>('POST', '/grants', { productId, permission }); }
  revoke(id: string) { return this.call<void>('DELETE', `/grants/${id}`); }
  leads() { return this.call<Lead[]>('GET', '/leads'); }
  setLeadStatus(id: string, status: Lead['status']) { return this.call<Lead>('PATCH', `/leads/${id}`, { status }); }
  social() { return this.call<SocialAccount[]>('GET', '/social'); }
  requestSocial(platform: SocialPlatform) { return this.call<SocialAccount>('POST', `/social/${platform}`); }
  audit() { return this.call<AuditEntry[]>('GET', '/audit'); }
  metrics() { return this.call<Metrics>('GET', '/metrics'); }
  focus() { return this.call<FocusItem[]>('GET', '/focus'); }
  setFocus(id: string, done: boolean) { return this.call<FocusItem[]>('PUT', `/focus/${encodeURIComponent(id)}`, { done }); }
}
