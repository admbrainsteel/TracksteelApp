import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook para gerenciar e compensar a presença do cabeçalho / targa do BrainSteel Hub.
 * - Detecta se o banner do SDK (#brainsteel-guard-banner) está ativo.
 * - Sincroniza a variável CSS --hub-banner-height para que sidebars e layouts se ajustem.
 * - Oculta automaticamente o banner quando no Modo Smart (/smart).
 */
export function useHubBanner() {
  const location = useLocation();
  const isSmartMode = location.pathname.startsWith('/smart');

  useEffect(() => {
    function updateBannerState() {
      const banner = document.getElementById('brainsteel-guard-banner');
      const isBannerPresent = Boolean(banner);

      if (isSmartMode) {
        document.body.classList.add('modo-smart-active');
        document.body.classList.remove('has-hub-banner');
        document.documentElement.style.setProperty('--hub-banner-height', '0px');
        document.body.style.paddingTop = '0px';
      } else if (isBannerPresent) {
        document.body.classList.remove('modo-smart-active');
        document.body.classList.add('has-hub-banner');
        document.documentElement.style.setProperty('--hub-banner-height', '34px');
        document.body.style.paddingTop = '34px';
      } else {
        document.body.classList.remove('modo-smart-active');
        document.body.classList.remove('has-hub-banner');
        document.documentElement.style.setProperty('--hub-banner-height', '0px');
        document.body.style.paddingTop = '0px';
      }
    }

    updateBannerState();

    // Observa inserções dinâmicas do banner pelo script SDK do Hub
    const observer = new MutationObserver(() => {
      updateBannerState();
    });

    observer.observe(document.body, { childList: true, subtree: false });

    return () => {
      observer.disconnect();
    };
  }, [isSmartMode]);
}
