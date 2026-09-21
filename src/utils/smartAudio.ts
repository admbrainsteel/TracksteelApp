// ============================================================================
// Utilitário de Feedback Sonoro (Web Audio API) e Tátil para o Modo Smart
// Funciona 100% offline, sem carregar arquivos de áudio externos pesados.
// ============================================================================

class SmartAudioManager {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Carregar preferência salva
    try {
      const saved = localStorage.getItem('tracksteel_smart_sound');
      if (saved !== null) {
        this.soundEnabled = saved === 'true';
      }
    } catch {
      this.soundEnabled = true;
    }
  }

  private getContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch (e) {
      console.warn('Web Audio API não suportada neste dispositivo', e);
      return null;
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('tracksteel_smart_sound', String(enabled));
    } catch {
      // ignore
    }
  }

  public toggleSound(): boolean {
    const newState = !this.soundEnabled;
    this.setSoundEnabled(newState);
    if (newState) {
      this.playClick();
    }
    return newState;
  }

  /**
   * Bip de Sucesso (Apontamento Concluído)
   * Frequência harmônica dupla suave e ascendente (587Hz -> 880Hz, 120ms)
   */
  public playSuccess(): void {
    this.vibrate([70, 40, 70]);
    if (!this.soundEnabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;

      // Inicia em Ré5 (587Hz) e sobe para Lá5 (880Hz)
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      // Fade out suave para evitar estalo
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {
      console.warn('Erro ao tocar som de sucesso:', e);
    }
  }

  /**
   * Bip de Alerta ou Erro (Saldo insuficiente, conflito)
   * Frequência grave de aviso (220Hz, 180ms)
   */
  public playAlert(): void {
    this.vibrate([120, 80, 120]);
    if (!this.soundEnabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(180, now + 0.18);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn('Erro ao tocar som de alerta:', e);
    }
  }

  /**
   * Clique sonoro rápido para botões touch
   */
  public playClick(): void {
    this.vibrate(30);
    if (!this.soundEnabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;

      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Vibração Háptica para smartphones e tablets
   */
  public vibrate(pattern: number | number[]): void {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Navegadores sem suporte a vibração
    }
  }
}

export const smartAudio = new SmartAudioManager();
