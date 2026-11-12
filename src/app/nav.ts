import {
  BarChart3, Bot, Compass, CreditCard, GraduationCap, Hammer, Home, Layers, LayoutGrid, LayoutTemplate, Megaphone,
  MonitorSmartphone, Plug, Share2, ShieldCheck, Sparkles, TrendingUp, Users, Workflow, Zap,
} from 'lucide-react';

// The five hubs (the owner's approved phone design: Home, Build, Grow, Customers, More), and every product area of
// Oliskey Lab grouped the way an owner thinks: build, grow, run, account. `real` = working in real accounts in this
// release; the others are complete in the demo and say honestly when they arrive.
export interface Hub { to: string; label: string; icon: React.ElementType }
export const HUBS: Hub[] = [
  { to: '/app', label: 'Home', icon: Home },
  { to: '/app/build', label: 'Build', icon: Layers },
  { to: '/app/grow', label: 'Grow', icon: BarChart3 },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/more', label: 'More', icon: LayoutGrid },
];
/** which hub a page belongs to, so the right tab stays selected on detail pages */
export const hubOf = (path: string) => {
  if (/^\/app\/(build|studio|control|integrations)/.test(path)) return '/app/build';
  if (/^\/app\/(grow|social|marketing|insights)/.test(path)) return '/app/grow';
  if (path.startsWith('/app/customers')) return '/app/customers';
  if (path === '/app' || path === '/app/') return '/app';
  return '/app/more';
};

export interface NavItem { to: string; label: string; short: string; icon: React.ElementType; real: boolean; group: 'Build and connect' | 'Grow' | 'Run' | 'Account'; desc: string }
export const NAV: NavItem[] = [
  { to: '/app/discovery', label: 'Business Discovery', short: 'Discovery', icon: Compass, real: true, group: 'Build and connect', desc: 'Your business and your plan' },
  { to: '/app/studio', label: 'Website and App Studio', short: 'Studio', icon: LayoutTemplate, real: true, group: 'Build and connect', desc: 'Create, edit and publish' },
  { to: '/app/control', label: 'Digital Control Centre', short: 'Control Centre', icon: MonitorSmartphone, real: true, group: 'Build and connect', desc: 'Websites and apps, connected' },
  { to: '/app/integrations', label: 'Integrations', short: 'Integrations', icon: Plug, real: false, group: 'Build and connect', desc: 'Connect your tools' },
  { to: '/app/social', label: 'Social Media', short: 'Social', icon: Share2, real: true, group: 'Grow', desc: 'Accounts, posts and results' },
  { to: '/app/marketing', label: 'Marketing and Ads', short: 'Marketing', icon: Megaphone, real: false, group: 'Grow', desc: 'Campaigns and adverts' },
  { to: '/app/customers', label: 'Customers', short: 'Customers', icon: Users, real: true, group: 'Grow', desc: 'Manage leads and sales' },
  { to: '/app/insights', label: 'Analytics', short: 'Analytics', icon: BarChart3, real: false, group: 'Grow', desc: 'Track performance' },
  { to: '/app/digitise', label: 'Digitise', short: 'Digitise', icon: Zap, real: false, group: 'Run', desc: 'Paper work into simple forms' },
  { to: '/app/automation', label: 'Automation', short: 'Automation', icon: Workflow, real: false, group: 'Run', desc: 'Let routine work run itself' },
  { to: '/app/improve', label: 'Weekly Update', short: 'Weekly Update', icon: TrendingUp, real: false, group: 'Run', desc: 'Results and next steps' },
  { to: '/app/coach', label: 'Learning', short: 'Learning', icon: GraduationCap, real: false, group: 'Run', desc: 'Step-by-step guides' },
  { to: '/app/access', label: 'Settings and access', short: 'Settings', icon: ShieldCheck, real: true, group: 'Account', desc: 'Business, team and access' },
  { to: '/app/billing', label: 'Subscription', short: 'Subscription', icon: CreditCard, real: false, group: 'Account', desc: 'Plan, billing and usage' },
  { to: '/app/admin', label: 'Platform admin', short: 'Admin', icon: Bot, real: false, group: 'Account', desc: 'Oliskey staff only' },
];
export const AI_ICON = Sparkles;
export const BUILD_ICON = Hammer;
