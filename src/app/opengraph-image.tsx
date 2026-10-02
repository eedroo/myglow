import { ImageResponse } from 'next/og';

/**
 * Imagem de partilha da página pública (F10): fundo creme, lua dourada e o nome. Como nos emails, as cores
 * são constantes aqui (o gerador de imagens não lê CSS variables) — alinhadas com o tema claro.
 */
export const alt = 'MYGLOW';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const COLORS = { cream: '#FBF7EF', cream2: '#F4ECDD', gold: '#C9A25C', goldDeep: '#9C7632', ink: '#3B2F1E', muted: '#6F5F47' };

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: `radial-gradient(ellipse at 20% 0%, ${COLORS.cream} 0%, ${COLORS.cream2} 75%)`, color: COLORS.ink,
        }}
      >
        <div
          style={{
            width: 168, height: 168, borderRadius: 999, display: 'flex', position: 'relative',
            background: `linear-gradient(135deg, #F3DFAE 0%, #D4AE66 55%, ${COLORS.goldDeep} 100%)`,
            boxShadow: '0 0 80px rgba(233, 196, 120, 0.6)',
          }}
        >
          <div style={{ position: 'absolute', top: -14, left: 46, width: 168, height: 168, borderRadius: 999, background: COLORS.cream }} />
        </div>
        <div style={{ marginTop: 48, fontSize: 104, letterSpacing: 28, fontFamily: 'Georgia, serif' }}>MYGLOW</div>
        <div style={{ marginTop: 12, fontSize: 34, color: COLORS.muted, fontFamily: 'Georgia, serif' }}>✦ ☾ ✦</div>
      </div>
    ),
    size,
  );
}
