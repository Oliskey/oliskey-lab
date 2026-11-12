// App blueprint and automation plan, worked out from the Discovery answers:
//  - which dashboards the business's app needs (one per kind of person who uses it), on which device, with which screens;
//  - which routine work can run by itself, what it needs connected, how to set it up, and roughly how much time it saves.
// Plain rules, so the answer is explainable and the same every time; the AI may only reword it.
import type { DiscoveryAnswers, Sector } from './types';
import { guessSector } from './recommend';

export interface Dashboard { role: string; who: string; device: 'phone' | 'computer' | 'tablet' | 'phone and computer'; screens: string[]; why: string }
export interface Automation { id: string; title: string; when: string; then: string; saves: string; needs: string[]; steps: string[]; because: string }
export interface Blueprint { summary: string; dashboards: Dashboard[]; automations: Automation[]; existingProduct?: { name: string; url: string } }

const t = (a: DiscoveryAnswers) => [a.whatYouDo, a.challenges, ...(a.offers || []), ...(a.goals || [])].join(' ').toLowerCase();
const has = (list: string[] | undefined, ...w: string[]) => (list || []).some((x) => w.some((y) => x.toLowerCase().includes(y)));

const CUSTOMER: Record<Sector, Dashboard> = {
  restaurant: { role: 'Customer app', who: 'Your customers', device: 'phone', screens: ['Menu with prices', 'Order and pay', 'Track my order', 'Order again in one tap', 'Offers and rewards'], why: 'Customers order without waiting for a WhatsApp reply.' },
  retail: { role: 'Shop app', who: 'Your customers', device: 'phone', screens: ['Catalogue and search', 'Cart and checkout', 'My orders and delivery', 'Wishlist', 'Offers'], why: 'Customers buy at any hour and see stock before asking.' },
  school: { role: 'Parent and student apps', who: 'Parents and students', device: 'phone', screens: ['Attendance and results', 'Fees and payments', 'Assignments', 'Messages from school'], why: 'Families follow the school day from home.' },
  services: { role: 'Client app', who: 'Your clients', device: 'phone', screens: ['Request a quote', 'Book a date', 'Track the job', 'Pay invoices', 'Job history'], why: 'Clients know where their job is without calling.' },
  beauty: { role: 'Booking app', who: 'Your clients', device: 'phone', screens: ['Services and prices', 'Book a time with a stylist', 'Reminders', 'Pay a deposit', 'Rebook'], why: 'Fewer no-shows and an empty chair filled faster.' },
  health: { role: 'Patient app', who: 'Your patients', device: 'phone', screens: ['Book an appointment', 'Reminders', 'Visit history', 'Pay bills', 'Message the front desk'], why: 'Patients book and are reminded without phone calls.' },
  realestate: { role: 'Client app', who: 'Buyers and tenants', device: 'phone', screens: ['Listings with photos', 'Book a viewing', 'Saved properties', 'Enquiry status'], why: 'Serious enquiries arrive already qualified.' },
  ngo: { role: 'Supporter app', who: 'Donors and volunteers', device: 'phone', screens: ['Programmes and stories', 'Give', 'Volunteer sign-up', 'Impact updates'], why: 'Supporters see impact and give again.' },
  other: { role: 'Customer app', who: 'Your customers', device: 'phone', screens: ['What you offer', 'Ask or book', 'My requests', 'Pay'], why: 'Customers reach you and get answers faster.' },
};
const STAFF: Record<Sector, Dashboard[]> = {
  restaurant: [{ role: 'Kitchen dashboard', who: 'Cooks and kitchen staff', device: 'tablet', screens: ['Incoming orders', 'Preparation queue', 'Mark ready', 'Out-of-stock switch'], why: 'Every order reaches the kitchen in order, with nothing lost in chats.' }],
  retail: [{ role: 'Sales staff dashboard', who: 'Shop and sales staff', device: 'phone', screens: ['New orders', 'Stock lookup', 'Record a sale', 'Pack and dispatch'], why: 'Staff see what to pack and what is in stock.' }],
  school: [{ role: 'Teacher dashboard', who: 'Teachers', device: 'phone and computer', screens: ['Attendance', 'Gradebook', 'Assignments', 'Messages'], why: 'Teachers record once and parents see it.' }],
  services: [{ role: 'Team dashboard', who: 'Technicians and field staff', device: 'phone', screens: ['Jobs today', 'Job details and address', 'Update status with photos', 'Collect payment'], why: 'Jobs and proof of work are recorded on site.' }],
  beauty: [{ role: 'Stylist dashboard', who: 'Stylists and therapists', device: 'phone', screens: ['Today’s appointments', 'Client notes', 'Mark done', 'My earnings'], why: 'Each stylist sees their own day.' }],
  health: [{ role: 'Front desk dashboard', who: 'Reception staff', device: 'computer', screens: ['Today’s queue', 'Appointments', 'Check-in', 'Payments'], why: 'The queue runs from one screen.' }],
  realestate: [{ role: 'Agent dashboard', who: 'Agents', device: 'phone', screens: ['My leads', 'Viewing schedule', 'Follow-ups', 'Deal status'], why: 'No enquiry waits for an agent.' }],
  ngo: [{ role: 'Programme team dashboard', who: 'Programme staff', device: 'phone and computer', screens: ['Beneficiaries', 'Activities', 'Volunteers', 'Reports'], why: 'Field work is recorded as it happens.' }],
  other: [{ role: 'Staff dashboard', who: 'Your team', device: 'phone', screens: ['My tasks', 'Customer requests', 'Update status'], why: 'Everyone sees what to do next.' }],
};

export function buildBlueprint(a: DiscoveryAnswers): Blueprint {
  const sector = a.sector || guessSector(a);
  const text = t(a);
  const solo = a.teamSize === 'just me';
  const delivers = /deliver|dispatch|rider|logistics/.test(text);
  const dashboards: Dashboard[] = [CUSTOMER[sector]];
  if (!solo) dashboards.push(...STAFF[sector]);
  if (delivers && ['restaurant', 'retail', 'services', 'other'].includes(sector)) dashboards.push({ role: 'Delivery dashboard', who: 'Riders and drivers', device: 'phone', screens: ['My deliveries', 'Address and map', 'Mark delivered', 'Cash collected'], why: 'Customers are told where their order is without calling.' });
  dashboards.push({ role: solo ? 'Owner dashboard' : 'Owner and admin dashboard', who: solo ? 'You' : 'You and your managers', device: 'phone and computer', screens: ['Today at a glance', 'Orders and enquiries', 'Prices and products', ...(solo ? [] : ['Team and permissions']), 'Money in and out', 'Reports'], why: 'One place to see and run the whole business.' });

  const automations: Automation[] = [];
  const add = (x: Automation) => { if (!automations.some((y) => y.id === x.id)) automations.push(x); };
  const wa = has(a.timeConsumers, 'whatsapp', 'enquir') || has(a.howFound, 'whatsapp') || has(a.socials, 'whatsapp');
  if (wa) add({ id: 'auto-reply', title: 'Reply to every enquiry instantly', when: 'A customer messages on WhatsApp or sends the website form', then: 'They get an instant reply with your prices and a link to order; the enquiry is saved in Customers', saves: 'About 1–2 hours a day', needs: ['WhatsApp Business number', 'Your website'], because: 'You said answering WhatsApp takes much of your time.', steps: ['Connect your WhatsApp Business number in Integrations.', 'Write the reply in your own words (Lab suggests one from your answers).', 'Choose when it runs — always, or only outside opening hours.', 'Send a test message from your own phone, then switch it on.'] });
  add({ id: 'lead-alert', title: 'Never miss a new enquiry', when: 'A new enquiry arrives', then: 'You are told on WhatsApp or email, and reminded if nobody has replied within 2 hours', saves: 'Fewer lost customers', needs: ['Your website'], because: 'The first business to answer usually wins the customer.', steps: ['Choose where alerts go: WhatsApp, email or both.', 'Set the reminder time (2 hours is a good start).', 'Switch it on — it works for every form on your website.'] });
  if (has(a.timeConsumers, 'notebook', 'order', 'paper') || /order/.test(text)) add({ id: 'orders', title: 'Take orders without the notebook', when: 'A customer orders on the website or app', then: 'The order appears in one list (and on the kitchen or staff screen) with its status', saves: 'About 30–60 minutes a day', needs: ['Your website or app'], because: 'You said orders are written in a notebook and get lost.', steps: ['List your items and prices in the Studio.', 'Turn on online ordering for your website.', 'Decide who sees new orders (you, kitchen or staff).', 'Place one test order and mark it through each status.'] });
  if (has(a.timeConsumers, 'posting', 'social') || (a.socials || []).length) add({ id: 'schedule', title: 'Post on a schedule', when: 'You approve a week of posts', then: 'They publish at the best times on each connected account', saves: 'About 3 hours a week', needs: ['Connected social accounts'], because: 'Posting by hand every day is easy to drop when you are busy.', steps: ['Connect your social accounts.', 'Pick how often to post (3 times a week is a good start).', 'Approve the suggested posts, or add your own photos.', 'Check the results every Friday in Grow.'] });
  if (has(a.timeConsumers, 'payment', 'chasing')) add({ id: 'pay-remind', title: 'Chase payments automatically', when: 'An invoice is unpaid on its due date', then: 'The customer gets a polite reminder with a payment link, and a receipt once paid', saves: 'About 2 hours a week', needs: ['Paystack or Flutterwave account'], because: 'You said chasing payments takes your time.', steps: ['Connect Paystack or Flutterwave in Integrations.', 'Choose the reminder days (on the due date, then 3 days after).', 'Approve the reminder wording.', 'Send yourself a test invoice.'] });
  if (has(a.timeConsumers, 'stock')) add({ id: 'stock', title: 'Low-stock alerts', when: 'An item falls below the level you set', then: 'You get an alert and a suggested reorder list', saves: 'Fewer sold-out days', needs: ['Daily stock form'], because: 'You said keeping stock records takes time.', steps: ['Set up the daily stock form in Digitise.', 'Set a minimum level for each item.', 'Choose who receives the alert.'] });
  if (has(a.timeConsumers, 'booking', 'appointment') || ['beauty', 'health', 'services'].includes(sector)) add({ id: 'book-remind', title: 'Booking reminders', when: 'A booking is 24 hours away', then: 'The customer gets a reminder with a link to confirm or move it', saves: 'Fewer no-shows', needs: ['Online booking'], because: 'Reminders cut missed appointments.', steps: ['Turn on booking in the Studio and set your hours.', 'Approve the reminder message.', 'Choose WhatsApp, SMS or email.'] });
  if (has(a.timeConsumers, 'invoice')) add({ id: 'invoices', title: 'Automatic invoices and receipts', when: 'An order is confirmed or paid', then: 'An invoice or receipt is created and sent with your logo', saves: 'About 2 hours a week', needs: ['Payments connected'], because: 'You said making invoices takes time.', steps: ['Add your business details and logo.', 'Choose numbering (for example INV-0001).', 'Switch on sending by WhatsApp or email.'] });
  add({ id: 'review', title: 'Ask happy customers for a review', when: 'An order is delivered or a job is marked done', then: 'The customer gets a thank-you with a link to review you on Google', saves: 'More reviews, more trust', needs: ['Google Business Profile'], because: 'Reviews help new customers choose you.', steps: ['Connect your Google Business Profile.', 'Approve the thank-you message.', 'Choose the delay (a few hours after delivery works well).'] });
  if (has(a.goals, 'more customers', 'more orders') || /regular|repeat|office|lunch/.test(text)) add({ id: 'win-back', title: 'Bring customers back', when: 'A regular customer has not ordered for 30 days', then: 'They get a friendly message with something new or a small offer — only if they agreed to messages', saves: 'More repeat orders', needs: ['Customers list'], because: 'Selling again to a past customer costs far less than finding a new one.', steps: ['Turn on “agree to messages” on your website form.', 'Choose the quiet period (30 days is a good start).', 'Approve the message and any offer.'] });

  const n = dashboards.length;
  const school = sector === 'school';
  return {
    summary: `${a.businessName || 'Your business'} needs ${n} ${n === 1 ? 'dashboard' : 'dashboards'} — ${dashboards.map((d) => d.who.toLowerCase()).join(', ')} — and ${automations.length} jobs can run by themselves.`,
    dashboards, automations: automations.slice(0, 8),
    existingProduct: school ? { name: 'Oliskey School', url: 'https://www.oliskey.com/school' } : undefined,
  };
}
