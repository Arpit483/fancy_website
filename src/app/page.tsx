import { WalkableAtlasWorld } from '@/components/World/WalkableAtlasWorld';
import { AccessibleContent } from '@/components/AccessibleContent';

export default function Home() {
  return (
    <main className="w-full h-full min-h-screen relative overflow-hidden bg-[#0a0a0a]">
      {/* Visually hidden accessible HTML content for SEO crawlers */}
      <AccessibleContent />

      {/* Full Walkable Atlas World Experience */}
      <WalkableAtlasWorld />
    </main>
  );
}
