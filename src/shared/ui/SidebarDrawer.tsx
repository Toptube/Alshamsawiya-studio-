import React, { useState } from 'react';
import { 
  X, HelpCircle, MessageCircle, Phone, Send, 
  CheckCircle2, Globe, Sun, Moon
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isArabic: boolean;
  toggleLanguage: () => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  onOpenGuide: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  isArabic,
  toggleLanguage,
  isDark,
  toggleDarkMode,
  onOpenGuide
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
      ? 'مرحباً م.حسام بسيوني، أحتاج دعماً أو استفساراً بخصوص ستوديو الشمساوية.'
      : 'Hello Eng. Hossam Basyouni, I need support regarding AlShams Studio.'
  )}`;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
    >
      <div 
        className={`fixed inset-y-0 ${isArabic ? 'start-0' : 'end-0'} max-w-full flex ${isArabic ? 'pe-10' : 'ps-10'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-screen max-w-sm bg-white dark:bg-[#0A1324] text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col border-s border-slate-200 dark:border-slate-800">
          
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#070E1A]">
            <div>
                <h3 className="text-sm font-bold text-[#0F2952] dark:text-white">
                  {isArabic ? 'ستوديو الشمساوية' : 'AlShams Studio'}
                </h3>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body - Only Guide, Support, Language, and Theme */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">

            {/* 1. Language & Theme Toggles */}
            <div className="bg-slate-50 dark:bg-[#0D182E] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isArabic ? 'تفضيلات الواجهة والمظهر' : 'Appearance & Language'}
              </span>

              {/* Language */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#D48B16]" />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {isArabic ? 'اللغة' : 'Language'}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => { if (!isArabic) toggleLanguage(); }}
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                      isArabic
                        ? 'bg-[#D48B16] text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    عربي
                  </button>
                  <button
                    onClick={() => { if (isArabic) toggleLanguage(); }}
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-colors cursor-pointer ${
                      !isArabic
                        ? 'bg-[#D48B16] text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Theme */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {isDark ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-[#0F2952]" />}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {isArabic ? 'المظهر' : 'Theme'}
                  </span>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                >
                  {isDark ? (isArabic ? 'الوضع الداكن' : 'Dark Mode') : (isArabic ? 'الوضع الفاتح' : 'Light Mode')}
                </button>
              </div>
            </div>

            {/* 2. User Guide Button */}
            <div className="bg-slate-50 dark:bg-[#0D182E] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  onOpenGuide();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl text-start font-bold text-slate-800 dark:text-white hover:bg-white dark:hover:bg-slate-800/80 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#D48B16]/15 text-[#D48B16]">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span>{isArabic ? 'دليل الاستخدام السريع' : 'Quick Guide'}</span>
                    <p className="text-[10px] text-slate-400 font-normal">
                      {isArabic ? 'شرح خطوات المسار (عزل، تحسين، مشاهد، لوحتي)' : 'Workflow steps guide'}
                    </p>
                  </div>
                </div>
                <span className="text-[#D48B16] text-xs">➔</span>
              </button>
            </div>

            {/* 3. الدعم والمساعدة المباشر (م. حسام بسيوني) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F2952] to-[#16386D] text-white border border-slate-700 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D48B16]/20 border border-[#D48B16]/40 flex items-center justify-center text-[#D48B16] font-bold text-xs shrink-0">
                  ح.ب
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">
                      {isArabic ? 'م. حسام بسيوني' : 'Eng. Hossam Basyouni'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
                  </div>
                  <div className="text-[11px] text-[#D48B16] font-medium">
                    {isArabic ? 'الدعم والمساعدة المباشر' : 'Direct Support'}
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono">
                    01000996059
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Call/Chat */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'واتساب' : 'WhatsApp'}</span>
                </a>
                <a
                  href="tel:+201000996059"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] border border-white/20 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'اتصال' : 'Call'}</span>
                </a>
              </div>

              {/* Send Direct In-App Message */}
              <div className="pt-2 border-t border-white/15">
                <span className="text-[11px] font-semibold text-slate-200 block mb-1.5">
                  {isArabic ? 'إرسال رسالة سريعة:' : 'Send message:'}
                </span>

                {ticketSent ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 flex items-center gap-2 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>{isArabic ? 'تم إرسال رسالتك بنجاح.' : 'Message sent.'}</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendTicket} className="space-y-2">
                    <textarea
                      rows={2}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder={
                        isArabic
                          ? 'اكتب استفسارك هنا...'
                          : 'Write your message...'
                      }
                      className="w-full p-2 rounded-xl border border-white/20 bg-black/30 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D48B16]"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-xl bg-[#D48B16] hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isArabic ? 'إرسال' : 'Send'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-center text-[11px] text-slate-400">
            {isArabic ? 'ستوديو الشمساوية · الشمس كرافت © 2026' : 'AlShams Craft Studio © 2026'}
          </div>

        </div>
      </div>
    </div>
  );
};
