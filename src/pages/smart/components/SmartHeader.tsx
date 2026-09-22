import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Volume2, VolumeX, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { smartAudio } from '@/utils/smartAudio';
import { Button } from '@/components/ui/button';

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
  const [soundOn, setSoundOn] = useState<boolean>(() => smartAudio.isSoundEnabled());

  const handleToggleSound = () => {
    const novoEstado = smartAudio.toggleSound();
    setSoundOn(novoEstado);
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
    <header className="sticky top-0 z-50 w-full bg-slate-900 border-b border-slate-800 text-white shadow-md">
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
              className="h-10 px-2 sm:px-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-100 rounded-xl border border-slate-700 active:scale-95 text-xs sm:text-sm font-bold flex items-center gap-1 shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Voltar</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <div className="leading-tight min-w-0 flex-1">
                <h1 className="text-sm sm:text-base font-black tracking-wider text-amber-400 uppercase truncate">
                  {titulo}
                </h1>
                {subtitulo && (
                  <p className="text-[11px] sm:text-xs text-slate-300 font-medium truncate">
                    {subtitulo}
                  </p>
                )}
              </div>
            </div>
          )}

          {mostrarVoltar && (
            <div className="leading-tight min-w-0 flex-1">
              <h1 className="text-xs sm:text-sm font-black text-slate-100 uppercase truncate">
                {titulo}
              </h1>
              {subtitulo && (
                <p className="text-[11px] sm:text-xs text-amber-400 font-extrabold tracking-wide truncate">
                  {subtitulo}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Lado Direito: Ações de Controle e Comutação */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Controle de Som / Áudio */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`h-10 w-8 sm:w-9 rounded-xl flex items-center justify-center border transition-all active:scale-90 ${
              soundOn
                ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-400'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
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
            className="h-10 px-2 sm:px-2.5 gap-1 bg-blue-600 hover:bg-blue-500 text-white border-blue-500 hover:border-blue-400 font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-all shrink-0"
            title="Sair do Modo Smart e abrir o sistema completo (Dashboard / 3D / Cadastros)"
          >
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>Completo</span>
          </Button>

          {/* Botão de Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="h-10 w-8 sm:w-9 rounded-xl flex items-center justify-center bg-slate-800 hover:bg-red-900/60 border border-slate-700 hover:border-red-600/50 text-slate-400 hover:text-red-300 transition-colors active:scale-90 shrink-0"
            title={`Sair do sistema (${user?.email || 'Operador'})`}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
