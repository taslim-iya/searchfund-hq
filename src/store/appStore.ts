import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ── Types ── */
export type InternStatus = 'active' | 'onboarding' | 'paused' | 'completed';
export type TaskStatus = 'pending' | 'in-progress' | 'review' | 'done' | 'blocked';
export type TaskType = 'research' | 'analysis' | 'contact-find' | 'outreach' | 'follow-up' | 'general';
export type CompanyStage = 'imported' | 'researching' | 'enriched' | 'outreach-ready' | 'outreach-sent' | 'replied' | 'meeting' | 'passed';
export type OutreachStatus = 'draft' | 'pending-review' | 'approved' | 'sent' | 'replied' | 'bounced';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export interface Intern {
  id: string;
  name: string;
  email: string;
  role: string; // e.g. "Research Analyst", "Outreach Associate"
  status: InternStatus;
  startDate: string;
  tasksAssigned: number;
  tasksCompleted: number;
  avatar: string;
  notes: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string; // intern ID or 'unassigned'
  companyId: string; // linked company if applicable
  dueDate: string;
  completedAt: string;
  comments: TaskComment[];
  createdAt: string;
}

export interface TaskComment {
  id: string;
  authorId: string; // 'owner' for Taslim, intern ID for interns
  authorName: string;
  text: string;
  timestamp: string;
}

export interface Company {
  id: string;
  name: string;
  website: string;
  sector: string;
  subsector: string;
  companiesHouseNumber: string;
  revenue: string;
  employees: string;
  location: string;
  postcode: string;
  description: string;
  incorporatedDate: string;
  companyType: string;
  registeredAddress: string;
  // Contact info
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerLinkedin: string;
  ownerRole: string;
  // Enrichment
  stage: CompanyStage;
  score: number;
  enrichmentData: EnrichmentData;
  // Outreach
  outreachMessage: string;
  outreachStatus: OutreachStatus;
  outreachSentAt: string;
  outreachReply: string;
  // Meta
  assignedTo: string; // intern ID
  source: string;
  tags: string[];
  notes: string;
  report: string; // full enrichment report
  createdAt: string;
  enrichedAt: string;
}

export interface EnrichmentData {
  websiteSummary: string;
  recentNews: string[];
  keyPeople: { name: string; role: string; linkedin: string }[];
  competitors: string[];
  strengths: string[];
  opportunities: string[];
  socialPresence: { platform: string; url: string }[];
  financials: string;
  techStack: string[];
}

export interface Message {
  id: string;
  from: string; // 'owner' or intern name
  fromId: string;
  to: string; // 'all', intern ID, or 'owner'
  text: string;
  companyId: string; // if about a specific company
  timestamp: string;
  read: boolean;
}

export interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface WatchlistItem {
  companyNumber: string;
  companyName: string;
  addedAt: string;
  lastChecked: string;
  lastChanges: number;
  notes: string;
}

export interface AppConfig {
  companiesHouseKey: string;
  openaiKey: string;
  apolloKey: string;
  ownerName: string;
  ownerEmail: string;
  fundName: string;
  emailSignature: string;
  outreachTemplate: string;
}

interface AppState {
  interns: Intern[];
  tasks: Task[];
  companies: Company[];
  messages: Message[];
  activity: ActivityItem[];
  config: AppConfig;
  watchlist: WatchlistItem[];

  // Watchlist
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (companyNumber: string) => void;
  updateWatchlistItem: (companyNumber: string, patch: Partial<WatchlistItem>) => void;

  // Interns
  addIntern: (i: Intern) => void;
  updateIntern: (id: string, patch: Partial<Intern>) => void;
  removeIntern: (id: string) => void;

  // Tasks
  addTask: (t: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  addTaskComment: (taskId: string, comment: TaskComment) => void;
  removeTask: (id: string) => void;

  // Companies
  addCompany: (c: Company) => void;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  removeCompany: (id: string) => void;
  importCompanies: (companies: Company[]) => void;

  // Messages
  addMessage: (m: Message) => void;
  markRead: (id: string) => void;

  // Activity
  addActivity: (a: ActivityItem) => void;

  // Config
  updateConfig: (patch: Partial<AppConfig>) => void;
}

function emptyEnrichment(): EnrichmentData {
  return { websiteSummary: '', recentNews: [], keyPeople: [], competitors: [], strengths: [], opportunities: [], socialPresence: [], financials: '', techStack: [] };
}

export function emptyCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: crypto.randomUUID(), name: '', website: '', sector: '', subsector: '',
    companiesHouseNumber: '', revenue: '', employees: '', location: '', postcode: '',
    description: '', incorporatedDate: '', companyType: '', registeredAddress: '',
    ownerName: '', ownerEmail: '', ownerPhone: '', ownerLinkedin: '', ownerRole: '',
    stage: 'imported', score: 0, enrichmentData: emptyEnrichment(),
    outreachMessage: '', outreachStatus: 'draft', outreachSentAt: '', outreachReply: '',
    assignedTo: '', source: 'manual', tags: [], notes: '', report: '',
    createdAt: new Date().toISOString(), enrichedAt: '', ...overrides,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      interns: [],
      tasks: [],
      companies: [],
      messages: [],
      activity: [],
      watchlist: [],
      config: {
        companiesHouseKey: '',
        openaiKey: '',
        apolloKey: '',
        ownerName: 'Taslim',
        ownerEmail: '',
        fundName: '',
        emailSignature: '',
        outreachTemplate: `Hi {ownerName},\n\nI came across {companyName} and was impressed by {strength}.\n\nWe're a search fund focused on acquiring and operating great SMEs in {sector}. I'd love to learn more about your business and explore whether there might be a fit.\n\nWould you be open to a 15-minute introductory call?\n\nBest regards,\n{senderName}`,
      },

      addToWatchlist: (item) => set((s) => ({ watchlist: [...s.watchlist.filter(w => w.companyNumber !== item.companyNumber), item] })),
      removeFromWatchlist: (num) => set((s) => ({ watchlist: s.watchlist.filter(w => w.companyNumber !== num) })),
      updateWatchlistItem: (num, patch) => set((s) => ({ watchlist: s.watchlist.map(w => w.companyNumber === num ? { ...w, ...patch } : w) })),

      addIntern: (i) => set((s) => ({ interns: [...s.interns, i] })),
      updateIntern: (id, patch) => set((s) => ({ interns: s.interns.map(i => i.id === id ? { ...i, ...patch } : i) })),
      removeIntern: (id) => set((s) => ({ interns: s.interns.filter(i => i.id !== id) })),

      addTask: (t) => set((s) => ({ tasks: [...s.tasks, t] })),
      updateTask: (id, patch) => set((s) => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t) })),
      addTaskComment: (taskId, comment) => set((s) => ({
        tasks: s.tasks.map(t => t.id === taskId ? { ...t, comments: [...t.comments, comment] } : t),
      })),
      removeTask: (id) => set((s) => ({ tasks: s.tasks.filter(t => t.id !== id) })),

      addCompany: (c) => set((s) => ({ companies: [...s.companies, c] })),
      updateCompany: (id, patch) => set((s) => ({ companies: s.companies.map(c => c.id === id ? { ...c, ...patch } : c) })),
      removeCompany: (id) => set((s) => ({ companies: s.companies.filter(c => c.id !== id) })),
      importCompanies: (companies) => set((s) => ({ companies: [...s.companies, ...companies] })),

      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      markRead: (id) => set((s) => ({ messages: s.messages.map(m => m.id === id ? { ...m, read: true } : m) })),

      addActivity: (a) => set((s) => ({ activity: [a, ...s.activity].slice(0, 300) })),
      updateConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
    }),
    { name: 'searchfund-hq-store' }
  )
);
