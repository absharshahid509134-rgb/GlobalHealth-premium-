import React, { useState } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Send,
  Building2,
  FileQuestion,
  ExternalLink,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { useHospitalPortal } from '../../../context/HospitalContext';

interface Ticket {
  id: string;
  subject: string;
  category: 'Platform Technical Issue' | 'Regulatory & Verification' | 'Billing & Tariffs Sync' | 'Emergency Code Red Telemetry' | 'General Inquiry';
  priority: 'Urgent (STAT)' | 'High' | 'Normal' | 'Low';
  status: 'Open' | 'In Progress' | 'Awaiting Hospital Feedback' | 'Resolved';
  createdAt: string;
  updatedAt: string;
  assignedEngineer: string;
  lastMessage: string;
  messages: Array<{
    id: string;
    sender: string;
    senderRole: string;
    timestamp: string;
    text: string;
    isStaff: boolean;
  }>;
}

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 'TKT-2026-0814',
    subject: 'NABH Accreditation Re-Verification submission clarification',
    category: 'Regulatory & Verification',
    priority: 'High',
    status: 'In Progress',
    createdAt: '2026-10-08T09:30:00Z',
    updatedAt: '2026-10-09T14:15:00Z',
    assignedEngineer: 'GlobalHealth Compliance Team (Sarah Chen)',
    lastMessage: 'We received your uploaded NABH 5th Edition renewal certificates. Primary source verification with QCI registry in progress.',
    messages: [
      {
        id: 'msg-1',
        sender: 'Dr. Marcus Brody',
        senderRole: 'Hospital Administrator',
        timestamp: '2026-10-08T09:30:00Z',
        text: 'Uploaded our updated NABH institutional certificate valid until 2029 under Compliance Vault. Please advise on when the public badge reflects the update.',
        isStaff: false
      },
      {
        id: 'msg-2',
        sender: 'Sarah Chen',
        senderRole: 'GlobalHealth Compliance Specialist',
        timestamp: '2026-10-09T14:15:00Z',
        text: 'We received your uploaded NABH 5th Edition renewal certificates. Primary source verification with QCI registry in progress. ETA: 24 business hours.',
        isStaff: true
      }
    ]
  },
  {
    id: 'TKT-2026-0792',
    subject: 'Emergency Code Red telemetry webhook retry policy',
    category: 'Emergency Code Red Telemetry',
    priority: 'Urgent (STAT)',
    status: 'Resolved',
    createdAt: '2026-10-05T11:20:00Z',
    updatedAt: '2026-10-06T16:45:00Z',
    assignedEngineer: 'Platform Telemetry Ops (David Kumar)',
    lastMessage: 'Webhook backoff jitter configured. Live test payload confirmed by your trauma desk.',
    messages: [
      {
        id: 'msg-1',
        sender: 'Dr. Marcus Brody',
        senderRole: 'Hospital Administrator',
        timestamp: '2026-10-05T11:20:00Z',
        text: 'We require verification that Code Red STAT broadcasts trigger fallback SMS and redundant push channels during drill scenarios.',
        isStaff: false
      },
      {
        id: 'msg-2',
        sender: 'David Kumar',
        senderRole: 'GlobalHealth Telemetry Ops',
        timestamp: '2026-10-06T16:45:00Z',
        text: 'Webhook backoff jitter configured. Live test payload confirmed by your trauma desk. Emergency failover path verified.',
        isStaff: true
      }
    ]
  },
  {
    id: 'TKT-2026-0744',
    subject: 'Dual-tier tariff master revision publishing audit clarification',
    category: 'Billing & Tariffs Sync',
    priority: 'Normal',
    status: 'Resolved',
    createdAt: '2026-09-28T08:15:00Z',
    updatedAt: '2026-09-29T10:30:00Z',
    assignedEngineer: 'Finance Systems Desk (Elena Vance)',
    lastMessage: 'Two-tier governance workflow verified. The Medical Director cryptographic signature hash is permanently logged.',
    messages: [
      {
        id: 'msg-1',
        sender: 'Rajesh Nair',
        senderRole: 'Chief Financial Officer',
        timestamp: '2026-09-28T08:15:00Z',
        text: 'Can we configure automated email notifications when a tariff change proposal is submitted for Medical Director approval?',
        isStaff: false
      },
      {
        id: 'msg-2',
        sender: 'Elena Vance',
        senderRole: 'GlobalHealth Finance Systems',
        timestamp: '2026-09-29T10:30:00Z',
        text: 'Two-tier governance workflow verified. The Medical Director cryptographic signature hash is permanently logged and email dispatch is active.',
        isStaff: true
      }
    ]
  }
];

export const SupportView: React.FC = () => {
  const { currentHospital, currentUser, currentRole } = useHospitalPortal();
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>(INITIAL_TICKETS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);

  // New ticket state
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<Ticket['category']>('Platform Technical Issue');
  const [newPriority, setNewPriority] = useState<Ticket['priority']>('Normal');
  const [newMessage, setNewMessage] = useState('');

  // Reply state
  const [replyText, setReplyText] = useState('');

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const filteredTickets = tickets.filter((t) => {
    const matchQuery =
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    const newTkt: Ticket = {
      id: `TKT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: newSubject.trim(),
      category: newCategory,
      priority: newPriority,
      status: 'Open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedEngineer: 'GlobalHealth Enterprise Triage Desk',
      lastMessage: newMessage.trim(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: currentUser?.name || 'Hospital Authority Staff',
          senderRole: currentRole,
          timestamp: new Date().toISOString(),
          text: newMessage.trim(),
          isStaff: false
        }
      ]
    };

    setTickets([newTkt, ...tickets]);
    setSelectedTicketId(newTkt.id);
    setNewSubject('');
    setNewMessage('');
    setShowNewModal(false);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: currentUser?.name || 'Hospital Authority Staff',
      senderRole: currentRole,
      timestamp: new Date().toISOString(),
      text: replyText.trim(),
      isStaff: false
    };

    const updated = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: 'Open' as const,
          updatedAt: new Date().toISOString(),
          lastMessage: replyText.trim(),
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    });

    setTickets(updated);
    setReplyText('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCEBE4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#17221E]">
              Hospital Enterprise Support & Incident Desk
            </h1>
            <span className="text-xs font-mono font-bold bg-[#E8F7F1] text-[#008F68] px-2 py-0.5 rounded border border-[#BDE4D5]">
              SLA 24/7 Dedicated
            </span>
          </div>
          <p className="text-xs text-[#52635C]">
            Direct Escalation to GlobalHealth Platform Engineers, Regulatory Advisors & Telemetry Operations
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#008F68] hover:bg-[#007A59] text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Open Support Ticket</span>
        </button>
      </div>

      {/* Support KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#52635C] uppercase tracking-wider">Active Tickets</span>
            <div className="p-2 rounded-xl bg-[#E8F7F1] text-[#008F68]">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#17221E] font-mono mt-2">
            {tickets.filter((t) => t.status !== 'Resolved').length}
          </div>
          <p className="text-[11px] text-[#52635C] mt-1">Pending resolution / in flight</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#52635C] uppercase tracking-wider">SLA Response Time</span>
            <div className="p-2 rounded-xl bg-[#EAF6FB] text-[#287EA8]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#17221E] font-mono mt-2">&lt; 15 mins</div>
          <p className="text-[11px] text-[#287EA8] font-semibold mt-1">Dedicated Tier-1 Enterprise channel</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#52635C] uppercase tracking-wider">Assigned Facility</span>
            <div className="p-2 rounded-xl bg-[#F6FBF8] text-[#52635C]">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-[#17221E] truncate mt-2">{currentHospital?.name}</div>
          <p className="text-[11px] font-mono text-[#52635C] mt-1">{currentHospital?.id}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#DCEBE4] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#52635C] uppercase tracking-wider">Resolved Tickets</span>
            <div className="p-2 rounded-xl bg-[#E8F7F1] text-[#008F68]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#008F68] font-mono mt-2">
            {tickets.filter((t) => t.status === 'Resolved').length}
          </div>
          <p className="text-[11px] text-[#52635C] mt-1">100% SLA satisfaction score</p>
        </div>
      </div>

      {/* Main Grid: Ticket List + Selected Ticket Conversation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#52635C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket number, subject or topic..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68] cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredTickets.map((t) => {
              const isSelected = t.id === selectedTicketId;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-white border-[#008F68] shadow-sm ring-1 ring-[#008F68]/30'
                      : 'bg-white border-[#DCEBE4] hover:border-[#008F68]/40 hover:bg-[#F6FBF8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-[#52635C] bg-[#F1FAF6] px-1.5 py-0.5 rounded border border-[#DCEBE4]">
                      {t.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          t.priority === 'Urgent (STAT)'
                            ? 'bg-[#FFF1F1] text-[#D64545] border border-[#F2CCCC]'
                            : t.priority === 'High'
                            ? 'bg-[#FFF7E6] text-[#A86E00] border border-[#FED88B]'
                            : 'bg-[#F1FAF6] text-[#52635C]'
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          t.status === 'Resolved'
                            ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                            : t.status === 'In Progress'
                            ? 'bg-[#EAF6FB] text-[#287EA8] border border-[#C5E4F3]'
                            : 'bg-[#FFF7E6] text-[#A86E00] border border-[#FED88B]'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-[#17221E] line-clamp-1">{t.subject}</h3>
                  <p className="text-[11px] text-[#52635C] line-clamp-2 leading-relaxed">{t.lastMessage}</p>

                  <div className="flex items-center justify-between text-[10px] text-[#687971] pt-1 border-t border-[#F1FAF6]">
                    <span>{t.category}</span>
                    <span className="font-mono">{new Date(t.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Ticket Detail & Conversation View */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#DCEBE4] shadow-xs p-5 flex flex-col justify-between space-y-4 min-h-[550px]">
          {selectedTicket ? (
            <>
              {/* Ticket Top Info */}
              <div className="border-b border-[#DCEBE4] pb-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-[#F1FAF6] px-2 py-0.5 rounded border border-[#DCEBE4] text-[#17221E]">
                      {selectedTicket.id}
                    </span>
                    <span className="text-xs font-bold text-[#008F68] bg-[#E8F7F1] px-2 py-0.5 rounded border border-[#BDE4D5]">
                      {selectedTicket.category}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedTicket.status === 'Resolved'
                        ? 'bg-[#E8F7F1] text-[#008F68] border border-[#BDE4D5]'
                        : 'bg-[#EAF6FB] text-[#287EA8] border border-[#C5E4F3]'
                    }`}
                  >
                    {selectedTicket.status}
                  </span>
                </div>

                <h2 className="text-sm sm:text-base font-bold text-[#17221E]">{selectedTicket.subject}</h2>

                <div className="flex items-center justify-between text-[11px] text-[#52635C] pt-1">
                  <span>Assigned: <strong className="text-[#17221E]">{selectedTicket.assignedEngineer}</strong></span>
                  <span className="font-mono">Created: {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto space-y-3 py-2 max-h-[360px] pr-1">
                {selectedTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl space-y-1.5 ${
                      m.isStaff
                        ? 'bg-[#EAF6FB] border border-[#C5E4F3] ml-4'
                        : 'bg-[#F6FBF8] border border-[#DCEBE4] mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-[#17221E]">{m.sender}</strong>
                        <span className="text-[10px] text-[#52635C]">({m.senderRole})</span>
                        {m.isStaff && (
                          <span className="text-[9px] font-bold bg-[#287EA8] text-white px-1.5 py-0.2 rounded">
                            GlobalHealth Staff
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#687971] font-mono">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-[#17221E] leading-relaxed whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="pt-3 border-t border-[#DCEBE4] space-y-2">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply to GlobalHealth engineering & compliance desk..."
                  className="w-full p-3 text-xs bg-[#F6FBF8] border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68] resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#52635C]">
                    All correspondence is archived in the immutable hospital audit trail.
                  </span>
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#008F68] hover:bg-[#007A59] disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Reply</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-[#52635C]">
              Select a ticket from the left column to view its active communication thread.
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17221E]/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#DCEBE4] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCEBE4] pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-[#008F68]" />
                <h3 className="text-base font-bold text-[#17221E]">Open Enterprise Support Ticket</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-[#52635C] hover:text-[#17221E] text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#52635C] mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Inpatient ICU Bed sync disparity or tariff approval query"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#52635C] mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68] cursor-pointer"
                  >
                    <option value="Platform Technical Issue">Platform Technical Issue</option>
                    <option value="Regulatory & Verification">Regulatory & Verification</option>
                    <option value="Billing & Tariffs Sync">Billing & Tariffs Sync</option>
                    <option value="Emergency Code Red Telemetry">Emergency Code Red Telemetry</option>
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#52635C] mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68] cursor-pointer"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent (STAT)">Urgent (STAT)</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#52635C] mb-1">Incident Description *</label>
                <textarea
                  rows={4}
                  required
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Provide precise details, steps taken, patient IDs (anonymized), or error messages..."
                  className="w-full p-3 text-xs bg-white border border-[#D8E7E0] rounded-xl text-[#17221E] focus:outline-none focus:border-[#008F68] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCEBE4]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-xs font-bold text-[#52635C] hover:bg-[#F1FAF6] rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#008F68] hover:bg-[#007A59] rounded-xl transition shadow-xs cursor-pointer"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
