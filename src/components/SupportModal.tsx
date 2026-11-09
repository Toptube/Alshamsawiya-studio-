import React, { useState } from 'react';
import { X, MessageCircle, Phone, UserCheck, Send, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isArabic: boolean;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  isArabic
}) => {
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  if (!isOpen) return null;

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) return;
    setTicketSent(true);
    setTimeout(() => {
      setTicketMessage('');
      setTicketSent(false);
    }, 4000);
  };

  const whatsappUrl = `https://wa.me/201000996059?text=${encodeURIComponent(
    isArabic
      ? 'مرحباً م.حسام بسيوني، أحتاج دعماً فنياً أو استفساراً بخصوص ستوديو الشمساوية لإزالة وعزل الخلفيات.'
      : 'Hello Eng. Hossam Basyouni, I need technical support regarding AlShams Studio.'
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#0B1528] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070E1A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isArabic ? 'الدعم الفني المباشر 24/7 | ستوديو الشمساوية' : '24/7 Technical Support | AlShams Studio'}
              </h3>
              <p className="text-xs text-slate-400">
                {isArabic ? 'استجابة فورية لكافة الاستفسارات والدعم التقني' : 'Instant response for all inquiries and technical assistance'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Official Lead Engineer Profile Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0F2952] to-[#1E3A8A] text-white border border-slate-700 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-xl shrink-0">
                ح.ب
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white">
                    {isArabic ? 'م. حسام بسيوني' : 'Eng. Hossam Basyouni'}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    {isArabic ? 'متواجد الآن 24/7' : 'Online 24/7'}
                  </span>
                </div>
                <p className="text-xs text-amber-300 font-medium">
                  {isArabic ? 'مدير الدعم الفني وهندسة البرمجيات · مصر' : 'Technical Support Lead · Egypt'}
                </p>
                <div className="text-xs text-slate-300 font-mono">
                  01000996059 (+201000996059)
                </div>
              </div>
            </div>

            {/* Direct Connect Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{isArabic ? 'محادثة مباشرة عبر واتساب' : 'Direct WhatsApp Chat'}</span>
              </a>

              <a
                href="tel:+201000996059"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{isArabic ? 'اتصال هاتفي' : 'Phone Call'}</span>
              </a>
            </div>
          </div>

          {/* In-App Direct Ticket / Inquiry Form */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {isArabic ? 'إرسال استفسار مباشر داخل التطبيق' : 'Submit In-App Support Ticket'}
            </h4>

            {ticketSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {isArabic
                    ? 'تم إرسال استفسارك بنجاح إلى م. حسام بسيوني وسيتم الرد عليك في غضون دقائق.'
                    : 'Ticket sent successfully to Eng. Hossam Basyouni. Response within minutes.'}
                </span>
              </div>
            ) : (
              <form onSubmit={handleSendTicket} className="space-y-3">
                <textarea
                  rows={3}
                  value={ticketMessage}
                  onChange={(e) => setTicketMessage(e.target.value)}
                  placeholder={
                    isArabic
                      ? 'اكتب رسالتك أو استفسارك بخصوص عزل الخلفيات أو ضبط الإعدادات...'
                      : 'Type your question or issue regarding background removal...'
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070E1A] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  required
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'إرسال الاستفسار' : 'Submit Ticket'}</span>
                </button>
              </form>
            )}
          </div>

          {/* Privacy & Response time badge */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {isArabic ? 'متوسط سرعة الرد: أقل من 10 دقائق' : 'Avg Response: < 10 mins'}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              {isArabic ? 'بياناتك وخصوصيتك مشفرة ومحمية' : 'End-to-End Privacy Guaranteed'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
