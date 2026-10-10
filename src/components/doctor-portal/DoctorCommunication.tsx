import React from 'react';
import { Bell, CheckCheck, ShieldAlert } from 'lucide-react';
import { useDoctorPortal, NotificationItem } from './doctorPortalData';
import { DoctorUnavailable } from './DoctorUnavailable';

export const DoctorCommunication: React.FC<{ section: 'messages' | 'notifications' | 'referrals' | 'documents' | 'insights' }> = ({ section }) => {
  if (section === 'notifications') return <NotificationsView />;
  const titles: Record<Exclude<typeof section, 'notifications'>, string> = {
    messages: 'Secure messaging unavailable',
    referrals: 'Referrals unavailable',
    documents: 'Professional documents unavailable',
    insights: 'Clinical analytics unavailable',
  };
  const messages: Record<Exclude<typeof section, 'notifications'>, string> = {
    messages: 'No verified clinician-to-patient or clinician-to-clinician messaging service is connected for this session.',
    referrals: 'No verified referral or receiving-provider workflow is connected for this session.',
    documents: 'No approved professional document storage service is connected for this session.',
    insights: 'No verified analytics service is connected for this session.',
  };
  return <DoctorUnavailable title={titles[section]} message={messages[section]} scope="No message, referral, document, analytics result, patient identifier, or status is fabricated or stored locally." />;
};

const NotificationsView: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDoctorPortal();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Notifications</h2>
          <p className="text-xs text-slate-500">Server-delivered account notifications. Notification content is kept separate from clinical record payloads.</p>
        </div>
        {unread > 0 && <button type="button" onClick={markAllNotificationsRead} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-medical-600 px-4 py-2 text-xs font-bold text-white hover:bg-medical-700"><CheckCheck className="h-3.5 w-3.5" /> Mark all as read</button>}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-soft" aria-label="Server notifications">
        {notifications.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No server notifications are available.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n: NotificationItem) => (
              <li key={n.id} className="flex items-start gap-3 p-4">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-slate-200' : 'bg-medical-600'}`} aria-label={n.read ? 'Read' : 'Unread'} />
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold ${n.read ? 'text-slate-500' : 'text-slate-800'}`}>{n.title}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{n.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{n.date}</p>
                </div>
                {!n.read && <button type="button" onClick={() => markNotificationRead(n.id)} className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-50">Mark read</button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500"><Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-medical-600" /> Email, push, or SMS notifications are not treated as patient consent. Patient decisions remain authoritative only in the authenticated patient workspace.</p>
      <p className="flex items-start gap-1.5 text-[11px] text-slate-400"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> No notification is proof of a clinical action, prescription transmission, or external integration.</p>
    </div>
  );
};
