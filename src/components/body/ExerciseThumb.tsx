import { MagicIcon } from '@/components/ui/MagicIcon';

/**
 * Miniatura de um exercício (imagem do Vercel Blob) ou, sem imagem, o ícone do haltere.
 * `<img>` simples: as imagens já vêm em WebP de 640 px e não passam pelo optimizador do Next.
 */
export function ExerciseThumb({ src, className = 'mg-ex-row__thumb' }: { src: string | null; className?: string }) {
  if (!src) {
    return (
      <span className={className} aria-hidden="true">
        <MagicIcon name="dumbbell" size="md" decorative />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt="" loading="lazy" decoding="async" width={48} height={48} />;
}
