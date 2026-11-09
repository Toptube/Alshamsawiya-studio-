import React, { useState } from 'react';
import { 
  X, FileSpreadsheet, BarChart3, AlertTriangle, 
  HelpCircle, Sparkles, MessageCircle, Phone, Send, 
  CheckCircle2, ShieldCheck, Volume2, VolumeX, Wifi, WifiOff,
  ExternalLink, Layers, Wand2, Globe
} from 'lucide-react';
import { RembgSettings, ErrorLogEntry, StudioStats } from '../types';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  settings: RembgSettings;
  updateSettings: (partial: Partial<RembgSettings>) => void;
  errorCount: number;
  stats: StudioStats;
  isArabic: boolean;
  toggleLanguage: () => void;
  onOpenGuide: () => void;
  onOpenUpdates: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  settings,
  updateSettings,
  errorCount,
  stats,
  isArabic,
  toggleLanguage,
  onOpenGuide,
  onOpenUpdates
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
      ? 'مرحباً م.حسام بسيوني، أحتاج دعماً فنياً أو استفساراً بخصوص ستوديو الشمساوية.'
      : 'Hello Eng. Hossam Basyouni, I need technical support regarding AlShams Studio.'
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
        <div className="w-screen max-w-md bg-white dark:bg-[#0A1324] text-slate-800 dark:text-slate-100 shadow-2xl flex flex-col border-s border-slate-200 dark:border-slate-800">
          
          {/* Drawer Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#070E1A]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white shadow-xs p-0.5 border border-amber-500/30">
                <img 
                  src="/assets/aistudio/1790755753712_87b037e0.png" 
                  alt="AlShams Craft Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'القائمة الجانبية وإدارة النظام' : 'Studio Control Panel'}
                </h3>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                  {isArabic ? 'ستوديو الشمساوية · الشمس كرافت' : 'AlShams Craft Studio v2.4'}
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

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">

            {/* Quick Engine, Language & Preferences */}
            <div className="bg-slate-50 dark:bg-[#0D182E] p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                {isArabic ? 'وضع المعالجة وتفضيلات النظام' : 'Engine & System Preferences'}
              </span>

              {/* Language Switcher */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {isArabic ? 'لغة الواجهة (Language)' : 'Interface Language'}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-white dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => { if (!isArabic) toggleLanguage(); }}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors ${
                      isArabic
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    عربي
                  </button>
                  <button
                    onClick={() => { if (isArabic) toggleLanguage(); }}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors ${
                      !isArabic
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* Offline / Server Engine Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.engineMode === 'server' ? (
                    <Wifi className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <WifiOff className="w-4 h-4 text-blue-400" />
                  )}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {settings.engineMode === 'server'
                      ? isArabic ? 'محرك الذكاء الاصطناعي الذكي' : 'Smart Neural Engine'
                      : isArabic ? 'وضع غير متصل بالإنترنت (أوفلاين)' : '100% Offline Mode'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    updateSettings({
                      engineMode: settings.engineMode === 'server' ? 'offline' : 'server',
                    })
                  }
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors ${
                    settings.engineMode === 'server'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {isArabic ? 'تبديل' : 'Switch'}
                </button>
              </div>

              {/* Audio Chimes */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {settings.soundAlerts ? (
                    <Volume2 className="w-4 h-4 text-amber-500" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-slate-600 dark:text-slate-300">
                    {isArabic ? 'التنبيه الصوتي عند الاكتمال' : 'Audio Chime Alerts'}
                  </span>
                </div>
                <button
                  onClick={() => updateSettings({ soundAlerts: !settings.soundAlerts })}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    settings.soundAlerts ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                </button>
              </div>
            </div>

            {/* Navigation Sections */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                {isArabic ? 'الأقسام والتقارير' : 'Sections & Documentation'}
              </span>

              {/* Removal */}
              <button
                onClick={() => {
                  setActiveTab('removal');
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-start font-semibold transition-all ${
                  activeTab === 'removal'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>{isArabic ? 'إزالة وعزل الخلفية' : 'Background Removal'}</span>
                </div>
              </button>

              {/* Generator */}
              <button
                onClick={() => {
                  setActiveTab('generator');
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-start font-semibold transition-all ${
                  activeTab === 'generator'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Wand2 className="w-4 h-4 text-amber-500" />
                  <span>{isArabic ? 'توليد الخلفيات الذكية' : 'Background Generator'}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                  {isArabic ? 'جديد' : 'New'}
                </span>
              </button>

              {/* Reports */}
              <button
                onClick={() => {
                  setActiveTab('reports');
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-start font-semibold transition-all ${
                  activeTab === 'reports'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>{isArabic ? 'التقارير وتوثيق المسارات' : 'Reports & Paths (CSV)'}</span>
                </div>
              </button>

              {/* Analytics */}
              <button
                onClick={() => {
                  setActiveTab('analytics');
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-start font-semibold transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span>{isArabic ? 'لوحة الأداء اليومي والإحصائيات' : 'Daily Analytics'}</span>
                </div>
              </button>

              {/* Errors */}
              <button
                onClick={() => {
                  setActiveTab('errors');
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-start font-semibold transition-all ${
                  activeTab === 'errors'
                    ? 'bg-rose-500/15 text-rose-500 font-bold border border-rose-500/30'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>{isArabic ? 'سجل الأخطاء والتشخيص' : 'Error Log'}</span>
                </div>
                {errorCount > 0 && (
                  <span className="text-[10px] bg-rose-500 text-white rounded-full px-1.5 py-0.5 font-bold">
                    {errorCount}
                  </span>
                )}
              </button>
            </div>

            {/* Technical Support & Direct Message (م.حسام بسيوني) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0F2952] to-[#1E3A8A] text-white border border-slate-700 space-y-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0">
                  ح.ب
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white">
                      {isArabic ? 'م. حسام بسيوني' : 'Eng. Hossam Basyouni'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Online" />
                  </div>
                  <div className="text-[11px] text-amber-300 font-medium">
                    {isArabic ? 'مسؤول الدعم الفني المباشر 24/7' : 'Lead Technical Support'}
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono">
                    01000996059 (+201000996059)
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
                  {isArabic ? 'إرسال رسالة مباشرة للدعم الفني:' : 'Send message to support:'}
                </span>

                {ticketSent ? (
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 flex items-center gap-2 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>{isArabic ? 'تم إرسال رسالتك بنجاح وسيتواصل معك م. حسام قريباً.' : 'Message sent to Eng. Hossam.'}</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendTicket} className="space-y-2">
                    <textarea
                      rows={2}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder={
                        isArabic
                          ? 'اكتب رسالتك أو استفسارك هنا...'
                          : 'Write your message or inquiry here...'
                      }
                      className="w-full p-2.5 rounded-xl border border-white/20 bg-black/30 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isArabic ? 'إرسال الرسالة' : 'Send Message'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Bottom Actions: Guide & Updates */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-500">
              <button
                onClick={() => {
                  onOpenGuide();
                  onClose();
                }}
                className="flex items-center gap-1.5 hover:text-amber-500 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{isArabic ? 'دليل الاستخدام' : 'User Guide'}</span>
              </button>

              <button
                onClick={() => {
                  onOpenUpdates();
                  onClose();
                }}
                className="flex items-center gap-1.5 hover:text-amber-500 transition-colors font-mono"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>v2.4.0</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
