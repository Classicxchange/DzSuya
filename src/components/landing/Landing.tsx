import { Closing, Faq, Onchain } from '@/components/landing/Closing'
import { Hero, LandingNav, type AppTab } from '@/components/landing/Hero'
import { DzIdSection, Features, How, MenuPreview, What } from '@/components/landing/Sections'

/** Public homepage: explains what DzSuya is and sends visitors into the app. */
export function Landing({ onOpen }: { onOpen: (tab: AppTab) => void }) {
  return (
    <div className="min-h-dvh bg-coal-900">
      <LandingNav onOpen={onOpen} />
      <main>
        <Hero onOpen={onOpen} />
        <What />
        <How />
        <MenuPreview onOpen={onOpen} />
        <DzIdSection onOpen={onOpen} />
        <Features />
        <Onchain />
        <Faq />
        <Closing onOpen={onOpen} />
      </main>
    </div>
  )
}
