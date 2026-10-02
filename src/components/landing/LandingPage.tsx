import { AmbientBackground } from '@/components/shell/AmbientBackground';
import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { Pillars } from './Pillars';
import { DayRhythm } from './DayRhythm';
import { SkySection } from './SkySection';
import { GrimoireSection } from './GrimoireSection';
import { GlowSection } from './GlowSection';
import { InstallSection } from './InstallSection';
import { Faq } from './Faq';
import { FinalCta } from './FinalCta';
import { LandingFooter } from './LandingFooter';

/** Página pública (`/` sem sessão): uma ideia por secção, pré-visualizações reais em markup estático. */
export function LandingPage() {
  return (
    <>
      <AmbientBackground />
      <div className="mg-landing">
        <LandingNav />
        <main id="main">
          <Hero />
          <Pillars />
          <DayRhythm />
          <SkySection />
          <GrimoireSection />
          <GlowSection />
          <InstallSection />
          <Faq />
          <FinalCta />
        </main>
        <LandingFooter />
      </div>
    </>
  );
}
