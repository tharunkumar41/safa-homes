'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '../Header';
import Reveal from '../Reveal';

const posts = [
  {
    id: 'vastu-living-room',
    title: '5 Vastu Tips for a Harmonious Living Room',
    date: 'August 4, 2026',
    category: 'Vastu Guide',
    excerpt:
      'Your living room is the heart of your home – where family gathers and guests are welcomed. Here are five essential Vastu tips to create a harmonious, energy‑balanced space.',
    content: `
      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">1. Entrance</h3>
      <p>The main door (often opening into the living room) should ideally face north, east, or northeast. Keep it well‑lit, with an attractive nameplate and floral <em>toran</em>. Avoid a shoe rack right near the door.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">2. Direction of the living room</h3>
      <p>Prefer north, east, northeast, or northwest. If there's a connected dining area, place it east or southeast (closer to the kitchen). In open‑plan homes, a puja room works best northeast of the living room.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">3. Furniture layout</h3>
      <p>Prefer square or rectangular wooden pieces over odd or rounded shapes. Place heavy furniture (sofas, couches) in the west or southwest. The sofa can go against a north or east wall so people face those directions. Put the TV unit in the southeast.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">4. Colour scheme</h3>
      <p>Use neutrals like white, cream, or beige. Soft blue, green, or warm yellow also work well. Accent with turquoise, pink, or gold. Avoid black and dark red (said to absorb negative energy).</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">5. Living room décor</h3>
      <p>Keep the space clean and clutter‑free. Avoid art or accessories depicting sorrow; remove broken items, non‑working electronics, cracked mirrors/glass. Prefer nature‑themed artwork and real flowers (not dried, bonsai, or cactus). Good plants: money plant, spider plant, areca palm, snake plant, peace lily. A fish aquarium or water fountain suits the north, east, or northeast.</p>
    `,
  },
  {
    id: 'small-spaces-vastu',
    title: 'How to Optimise Small Spaces with Vastu',
    date: 'August 4, 2026',
    category: 'Space Planning',
    excerpt:
      'Living in a compact home doesn’t mean you have to compromise on Vastu principles. Here are essential tips for decluttering, furniture placement, colours, and room‑specific wins to create a balanced, spacious feel.',
    content: `
      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">1. Declutter Ruthlessly – Especially Northeast & the Center (Brahmasthan)</h3>
      <p>Clutter blocks energy fastest in small spaces. Keep the Northeast light, open, and free of heavy storage. Clear pathways from the main door. Use smart, under‑bed, or wall‑mounted storage instead of bulky pieces.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">2. Furniture Placement by Direction</h3>
      <p>Put heavy items (sofas, beds, wardrobes) in the South, West, or Southwest for stability. Keep North and East lighter and more open. Avoid heavy furniture in the Northeast. In studios, anchor sofas against a solid wall (preferably South/West) and use rugs or slim dividers to create zones.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">3. Entrance & Energy Flow</h3>
      <p>Keep the main door clean, well‑lit, and unobstructed – no shoe piles. Prefer North, East, or Northeast facing if possible; otherwise just maintain it well with a nameplate or simple auspicious symbol. The door should open freely.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">4. Colours, Light & Mirrors for Perceived Space</h3>
      <p>Use light neutrals (white, cream, beige, soft pastels) especially on North and East walls to make rooms feel larger. Maximise natural light and open East/North windows. Place mirrors on North or East walls to reflect light and expand the space visually – never facing the bed or main door.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">5. Room‑Specific Quick Wins</h3>
      <p><strong>Bedroom:</strong> Head toward South or East; bed against a solid wall (ideally Southwest zone). Use soft solid colours; cover wardrobe mirrors at night if they face the bed.</p>
      <p><strong>Kitchen:</strong> Aim for Southeast (or cook facing East); keep stove and sink separated if possible.</p>
      <p><strong>Living / Multipurpose:</strong> Sofa facing East/North where workable; keep centre open.</p>
      <p><strong>Overall:</strong> Good plants (money plant, areca, spider plant, tulsi) in suitable spots; avoid thorny/cactus types. Remove broken items and dead plants.</p>
    `,
  },
  {
    id: 'parametric-vastu-future',
    title: 'The Future of Home Design: Parametric Vastu',
    date: 'August 4, 2026',
    category: 'Technology',
    excerpt:
      'Parametric Vastu blends algorithmic design with ancient Vastu Shastra principles – using rules, parameters, and generative software to create layouts that are both tradition‑aware and performance‑optimised.',
    content: `
      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">What is Parametric Vastu?</h3>
      <p>Parametric Vastu blends algorithmic/parametric design (rules, parameters, and generative software that automatically update geometry when inputs change) with Vastu Shastra principles (directional energies, five elements, Vastu Purusha Mandala grid, proportions, and room placements). Tools like BIM, Grasshopper, AI generative platforms, and genetic algorithms explore many layout options that stay Vastu‑compliant while optimising for light, ventilation, energy use, site constraints, and modern living.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">Rules as Parameters</h3>
      <p>Code Vastu rules (e.g., kitchen in SE, master bedroom in SW, NE open and light, heavy mass in SW/S/W, central Brahmasthan clear) into the software. Change plot orientation, family size, or climate data and the model regenerates compliant options.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">AI + BIM Integration</h3>
      <p>Platforms analyse orientation, solar path, airflow, and energy performance while checking Vastu compliance. Adaptive frameworks explore iterations that respect tradition without rigid one‑size‑fits‑all plans.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">Performance + Harmony</h3>
      <p>Parametric tools optimise for sustainability (daylighting, passive cooling aligned with Vastu’s north/east openness and south/west massing) while keeping cultural and energetic balance.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">Personalisation &amp; Speed</h3>
      <p>Generate unique floor plans based on birth data, site conditions, or lifestyle inputs in seconds – useful for apartments, studios, or custom homes where full structural changes aren't possible.</p>
      <p>Examples in practice: computational temples or residences that use numerology/mandala geometry as generative parameters; AI Vastu plan generators; genetic algorithms that cluster rooms into NE/SE/NW/SW zones per Vastu then optimise adjacency and area.</p>
    `,
  },
  {
    id: 'kitchen-placement',
    title: 'Kitchen Placement: Why the South-East Matters',
    date: 'August 4, 2026',
    category: 'Vastu Guide',
    excerpt:
      'The kitchen is the home’s primary fire zone. In Vastu Shastra, the South‑East (Agneya) corner is the ideal placement – here’s why, along with practical layout rules and benefits.',
    content: `
      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">1. Elemental Harmony (Agni / Fire)</h3>
      <p>In Vastu Shastra the South‑East corner is governed by Agni, the fire element and deity. The kitchen is the home’s primary fire zone (cooking, heat, transformation). Placing it here aligns the activity with the directional energy, which is believed to support balanced prana, health, digestion, prosperity, and family harmony.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">2. Practical Morning Light &amp; Hygiene</h3>
      <p>A SE kitchen receives soft early sunlight during typical cooking hours. This lights the workspace, reduces dampness, improves hygiene (especially in older homes), and keeps the space comfortable. By afternoon the sun has moved, so it avoids the intense heat a west‑facing kitchen would get.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">3. Smoke, Wind &amp; House Comfort</h3>
      <p>Prevailing winds in much of India (often from the southwest) help carry cooking smells and smoke away from living and bedroom areas when the kitchen sits in the SE. This keeps the rest of the home fresher.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">4. Health, Wealth &amp; Daily Energy</h3>
      <p>Proper SE placement is linked to better digestive fire (agni in the body), vitality, financial continuity, reduced arguments, and overall positive atmosphere. Fire‑water clashes (stove next to sink) or wrong‑zone kitchens (especially NE) are said to create doshas affecting health or money.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">5. Layout Rules That Accompany It</h3>
      <ul>
        <li><strong>Stove placement:</strong> Preferably in the SE corner of the kitchen itself; cook faces East (or sometimes West).</li>
        <li><strong>Sink / water elements:</strong> Go North or North‑East side, kept a few feet away from the stove.</li>
        <li><strong>Heavy storage:</strong> Place in the South‑West of the kitchen.</li>
        <li><strong>Alternative:</strong> NW is the accepted alternative if SE is impossible; NE, SW, and the centre are strongly avoided.</li>
      </ul>
    `,
  },
  {
    id: 'plot-orientation',
    title: 'Choosing the Right Plot Orientation',
    date: 'August 4, 2026',
    category: 'Home Buying',
    excerpt:
      'The orientation of your plot is one of the most critical factors in Vastu. North, East, Northeast, South, and West-facing plots each have unique advantages – along with shape, slope, and practical climate considerations.',
    content: `
      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">1. North‑Facing Plots</h3>
      <p>Governed by Kubera (the lord of wealth). These plots attract financial growth, career opportunities, and overall prosperity. Soft daylight and good energy flow make them highly sought‑after for families and business owners.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">2. East‑Facing Plots</h3>
      <p>Linked to the rising sun (Suryamukhi). They bring morning light, health, vitality, knowledge, and positive beginnings. Ideal for scholars, professionals, and families with children.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">3. Northeast‑Facing (NE Corner) Plots</h3>
      <p>Considered the most auspicious (Ishanya zone). Associated with divine energy, wisdom, spiritual balance, and abundance. Road access from north + east is especially prized.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">4. Shape, Slope &amp; Practical Climate Sense</h3>
      <p>Prefer square or rectangular plots (length:width roughly 1:1 to 1:2). Ideal slope is gently downward toward the north or northeast (better drainage, morning light, positive energy flow) with the southwest higher and heavier. This also aligns with Indian climate needs: mild northern/eastern light while shielding from harsh southern/western heat.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">5. South‑ and West‑Facing Plots</h3>
      <p>Not automatically bad. South can offer stability with correct entrance and layout; West is linked to fame and recognition and works for certain professions. Both need careful design (higher south/west walls, proper entry placement) to balance energy.</p>
    `,
  },
  {
    id: 'sustainable-materials',
    title: 'Sustainable Materials for a Vastu Home',
    date: 'August 4, 2026',
    category: 'Eco-Design',
    excerpt:
      'Building a Vastu‑compliant home with sustainable, natural materials enhances energy flow, health, and climate performance. Discover the connection to the five elements, local sourcing, and what to avoid.',
    content: `
      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">1. Connection to the Five Elements (Panchabhutas)</h3>
      <p>Vastu favours materials that embody Earth, Water, Fire, Air, and Space. Natural options like clay, stone, wood, bamboo, and lime carry grounding, life‑affirming energy that synthetic plastics, vinyl, or heavily processed materials often lack or block.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">2. Health &amp; Indoor Air Quality</h3>
      <p>Breathable, non‑toxic materials (lime plaster, organic paints, hempcrete, untreated wood) regulate moisture, reduce toxins, and support positive prana flow. This aligns with Vastu’s emphasis on a healthy, harmonious living environment.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">3. Climate &amp; Energy Performance</h3>
      <p>Local stone, terracotta, mud, and bamboo provide natural thermal mass or insulation suited to Indian climates – keeping interiors cooler in summer and reducing reliance on artificial systems – while matching Vastu’s directional logic (heavier earth materials in SW for stability, lighter natural finishes in NE).</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">4. Local Sourcing &amp; Resonance</h3>
      <p>Materials from within a few hundred km of the site (Kota stone, local clay, regional bamboo) are preferred. They lower carbon footprint and are believed to keep the home energetically rooted to the land.</p>

      <h3 class="text-lg font-semibold mt-6 mb-2" style="color: var(--text)">5. Avoidance of Inert / Synthetic Materials</h3>
      <p>Plastics, acrylics, and many modern composites are generally discouraged as they can disrupt natural energy flow.</p>
    `,
  },
];

export default function BlogPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const togglePost = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen font-sans relative overflow-x-hidden bg-grid" style={{ color: 'var(--text)', background: 'var(--bg)' }}>
      <Header />

      {/* ===== HERO ===== */}
      <section className="max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-12 relative z-10 text-center">
        <Reveal>
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Insights &amp; <span className="dim-bracket">Vastu Guides</span>
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-lg md:text-xl max-w-2xl mx-auto mt-6 font-light leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Explore articles, tips, and expert advice on building a home that’s beautiful, balanced, and <span className="text-accent">Vastu‑compliant</span>.
          </p>
        </Reveal>
      </section>

      {/* ===== BLOG POSTS ===== */}
      <section className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        <div className="space-y-8">
          {posts.map((post) => (
            <Reveal key={post.id} className="rounded-3xl glass-panel p-6 md:p-8 transition-all hover:shadow-lg">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Category & Date */}
                <div className="md:w-40 shrink-0">
                  <span
                    className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    {post.category}
                  </span>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{post.date}</p>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h2 className="text-2xl font-display font-bold mb-2">{post.title}</h2>
                  <div
                    className="prose prose-sm max-w-none"
                    style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{
                      __html: expandedId === post.id ? post.content : post.excerpt,
                    }}
                  />
                  <button
                    onClick={() => togglePost(post.id)}
                    className="mt-4 text-sm font-semibold hover:underline transition"
                    style={{ color: 'var(--accent)' }}
                  >
                    {expandedId === post.id ? '⬆ Show less' : '📖 Read more'}
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <Footer />
    </div>
  );
}

// ===== FOOTER =====
function Footer() {
  return (
    <footer className="max-w-6xl mx-auto px-6 py-16 relative z-10">
      <div className="grid md:grid-cols-4 gap-8 border-t pt-10" style={{ borderColor: 'var(--border)' }}>
        <div>
          <Link href="/" className="font-display font-bold text-xl">SafaHomes</Link>
          <div className="mt-4">
            <Link href="/generator" className="btn-primary text-sm px-6 py-3">Get started for free</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-4">Product</h4>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <li><Link href="/products">Features</Link></li>
            <li><Link href="/dashboard">My Projects</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-4">Company</h4>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/enquiry">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-4">Social</h4>
          <div className="flex gap-3">
            <a href="#" className="p-2 rounded-full" style={{ background: 'var(--surface)' }}>🐦</a>
            <a href="#" className="p-2 rounded-full" style={{ background: 'var(--surface)' }}>📘</a>
            <a href="#" className="p-2 rounded-full" style={{ background: 'var(--surface)' }}>📸</a>
          </div>
          <div className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            <a href="mailto:info@safahomes.com">info@safahomes.com</a>
          </div>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t text-xs text-center" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        © {new Date().getFullYear()} SafaHomes. All rights reserved.
      </div>
    </footer>
  );
}