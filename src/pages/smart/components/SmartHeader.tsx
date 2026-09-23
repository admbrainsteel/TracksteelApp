import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Volume2, VolumeX, LogOut, ArrowLeft, Sun, Moon, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { smartAudio } from '@/utils/smartAudio';
import { Button } from '@/components/ui/button';
import { SmartNotificationsModal, useSmartNotificationsAlert } from './SmartNotificationsModal';

interface SmartHeaderProps {
  titulo?: string;
  subtitulo?: string;
  mostrarVoltar?: boolean;
  onVoltar?: () => void;
}

export const SmartHeader: React.FC<SmartHeaderProps> = ({
  titulo = 'MODO SMART',
  subtitulo,
  mostrarVoltar = false,
  onVoltar,
}) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [soundOn, setSoundOn] = useState<boolean>(() => smartAudio.isSoundEnabled());
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const { unreadCount, hasNewAlert, clearAlert } = useSmartNotificationsAlert();

  // Detecta se está efetivamente em modo escuro
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const handleToggleSound = () => {
    const novoEstado = smartAudio.toggleSound();
    setSoundOn(novoEstado);
  };

  const handleToggleTheme = () => {
    smartAudio.playClick();
    const novoTema = isDark ? 'light' : 'dark';
    setTheme(novoTema);
  };

  const handleVoltarAoModoCompleto = () => {
    smartAudio.playClick();
    try {
      localStorage.setItem('tracksteel_app_mode', 'complete');
    } catch {
      // ignore
    }
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    smartAudio.playClick();
    if (window.confirm('Deseja realmente encerrar a sessão?')) {
      await signOut();
      navigate('/auth');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white shadow-sm transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-2.5 sm:px-3 py-2 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Lado Esquerdo: Botão Voltar ou Logo/Status */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          {mostrarVoltar && onVoltar ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                smartAudio.playClick();
                onVoltar();
              }}
              className="h-10 px-2 sm:px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl border border-slate-300 dark:border-slate-700 active:scale-95 text-xs sm:text-sm font-bold flex items-center gap-1 shrink-0 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Voltar</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 dark:bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-600 dark:bg-amber-500"></span>
              </span>
              <div className="leading-tight min-w-0 flex-1">
                <h1 className="text-sm sm:text-base font-black tracking-wider text-amber-700 dark:text-amber-400 uppercase truncate">
                  {titulo}
                </h1>
                {subtitulo && (
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium truncate">
                    {subtitulo}
                  </p>
                )}
              </div>
            </div>
          )}

          {mostrarVoltar && (
            <div className="leading-tight min-w-0 flex-1">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 uppercase truncate">
                {titulo}
              </h1>
              {subtitulo && (
                <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400 font-extrabold tracking-wide truncate">
                  {subtitulo}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Lado Direito: Ações de Controle e Comutação */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Alternador de Tema Claro / Escuro (Sincronizado) */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className={`h-10 w-8 sm:w-9 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-750'
                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
            title={isDark ? 'Mudar para Modo Claro (Tons Pastéis)' : 'Mudar para Modo Escuro'}
            aria-label="Alternar tema visual"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Notificações de Apontamentos de Produção */}
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              clearAlert();
              setIsNotificationsOpen(true);
            }}
            className={`relative h-10 w-8 sm:w-9 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
              hasNewAlert
                ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950/70 dark:border-amber-600/50 dark:text-amber-400'
                : 'bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
            title="Notificações de Apontamentos de Produção"
          >
            <Bell className={`h-4 w-4 ${hasNewAlert ? 'animate-bounce text-amber-600 dark:text-amber-400' : ''}`} />
            {hasNewAlert && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
            {unreadCount > 0 && !hasNewAlert && (
              <span className="absolute -top-1 -right-1 px-1 min-w-[15px] h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[8px] font-mono font-bold flex items-center justify-center border border-slate-300 dark:border-slate-600 pointer-events-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Controle de Som / Áudio */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`h-10 w-8 sm:w-9 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
              soundOn
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-600/50 dark:text-emerald-400'
                : 'bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-400'
            }`}
            title={soundOn ? 'Som ativo (BIP habilitado)' : 'Mudo'}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* BOTÃO CRUCIAL DE COMUTAÇÃO: VOLTAR AO MODO COMPLETO */}
          <Button
            type="button"
            variant="outline"
            onClick={handleVoltarAoModoCompleto}
            className="h-10 px-2 sm:px-2.5 gap-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white border-blue-600 hover:border-blue-500 dark:border-blue-500 dark:hover:border-blue-400 font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-all shrink-0"
            title="Sair do Modo Smart e abrir o sistema completo (Dashboard / 3D / Cadastros)"
          >
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Completo</span>
          </Button>

          {/* Botão de Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="h-10 w-8 sm:w-9 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-rose-100 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-red-900/60 dark:border-slate-700 dark:hover:border-red-600/50 dark:text-slate-400 dark:hover:text-red-300 transition-colors active:scale-90 shrink-0"
            title={`Sair do sistema (${user?.email || 'Operador'})`}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Modal de Notificações de Apontamentos */}
      <SmartNotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </header>
  );
};
