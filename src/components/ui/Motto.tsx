import { Sparkle } from 'lucide-react';

interface MottoProps {
  text: string;
}

/** Rodapé decorativo com estrelas ("Pequenas escolhas, grandes transformações."). */
export function Motto({ text }: MottoProps) {
  return (
    <footer className="mg-motto">
      <span className="mg-motto__line" aria-hidden="true" />
      <Sparkle className="mg-motto__star" strokeWidth={1.5} aria-hidden="true" />
      <p className="mg-motto__text">{text}</p>
      <Sparkle className="mg-motto__star" strokeWidth={1.5} aria-hidden="true" />
      <span className="mg-motto__line" aria-hidden="true" />
    </footer>
  );
}
