# PlateRelay / Landscaping Theme Design Spec

This document provides a detailed Figma/Framer-style component breakdown and a React + Framer Motion skeleton that reproduces the identical motion graphics and styling applied to PlateRelay's vanilla HTML/CSS implementation.

## 1. Design Tokens & Styles

### Colors (Palette: Earth-inspired)
- **Backgrounds**: 
  - Base: `#fdfcf8` (Soft warm white/beige)
  - Surface: `#ffffff`
- **Primary (Greens)**:
  - Base: `#238b45` (Vibrant natural green)
  - Hover: `#1e753b`
  - Light: `#eaf0eb`
- **Accent (Oranges/Warm)**:
  - Base: `#dca368` (Soft terracotta)
  - Hover: `#c98a4d`
- **Text & UI**:
  - Main Text: `#3d3b38`
  - Muted Text: `#78756e`
  - Borders: `#e6e2da`

### Typography
- **Headings**: `Plus Jakarta Sans, sans-serif`
  - Font weights: `700`, `800`
  - Letter spacing: `-0.02em`
- **Body Text**: `Inter, sans-serif`
  - Font weights: `400`, `500`, `600`
  - Line height: `1.6`

### Shadows & Spacing
- **Shadows**:
  - Small (Cards): `0 4px 12px rgba(35, 139, 69, 0.05)`
  - Hover (Lift): `0 16px 40px -10px rgba(35, 139, 69, 0.15)`
- **Border Radius**:
  - Buttons: `10px` to `12px`
  - Cards: `20px`

---

## 2. React + Framer Motion Code Skeleton

If you decide to migrate your project to React in the future, here is the component structure with `framer-motion` variants to achieve the smooth interactions shown in the vanilla version.

### `App.jsx`
```jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSection from './components/HeroSection';
import AboutSection from './components/AboutSection';
import ServicesGrid from './components/ServicesGrid';
import FAQAccordion from './components/FAQAccordion';
import PotentialImpact from './components/PotentialImpact';
import OurVision from './components/OurVision';
import BlogSection from './components/BlogSection';
import Footer from './components/Footer';

function App() {
  return (
    <div className="bg-[#fdfcf8] text-[#3d3b38] min-h-screen font-inter">
      <Navbar /> // From the spec below
      
      <main>
        <HeroSection />
        <AboutSection />
        <ServicesGrid />
        <FAQAccordion />
        <PotentialImpact />
        <BlogSection />
      </main>

      <Footer />
    </div>
  );
}

export default App;
```

### `components/HeroSection.jsx`
```jsx
import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function HeroSection() {
  const { scrollY } = useScroll();
  // Parallax background effect
  const y = useTransform(scrollY, [0, 1000], [0, 150]);

  return (
    <motion.section 
      className="relative min-h-[85vh] flex flex-col justify-center items-center overflow-hidden"
    >
      <motion.div 
        className="absolute inset-0 bg-hero-pattern bg-cover bg-center z-0"
        style={{ y }}
      />
      
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 text-center px-4"
      >
        <h1 className="text-white text-5xl md:text-7xl font-jakarta font-bold tracking-tight mb-4">
          Crafting gardens,<br /> cultivating dreams
        </h1>
        <p className="text-white/90 text-xl max-w-2xl mx-auto mb-8">
          Turning surplus food and ordinary resources into beautiful, sustainable lifelines.
        </p>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-[#238b45] hover:bg-[#1e753b] text-white px-8 py-4 rounded-xl font-semibold shadow-lg"
        >
          Register
        </motion.button>
      </motion.div>
    </motion.section>
  );
}
```

### `components/ServicesGrid.jsx` (Staggered Animation Example)
```jsx
import React from 'react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

export default function ServicesGrid() {
  const services = [
    { title: "Real-Time Tracking", desc: "Food listings appear instantly on the platform. Once accepted, they update to prevent duplicates." },
    { title: "Simple Food Posting", desc: "Providers quickly post surplus food with details like quantity, location, and pickup time." },
    { title: "Verified Participants", desc: "Authentication ensures only registered NGOs and food providers can participate." }
  ];

  return (
    <section className="py-24 px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-jakarta font-bold mb-4">Platform Features</h2>
      </div>
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {services.map((service, idx) => (
          <motion.div 
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-white p-10 rounded-[20px] border border-[#e6e2da] shadow-sm hover:shadow-2xl transition-shadow"
          >
            <h3 className="text-2xl font-jakarta font-bold mb-4">{service.title}</h3>
            <p className="text-[#78756e]">{service.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
```

### `components/FAQAccordion.jsx` (Height Animation)
```jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FAQAccordion() {
  const [activeIdx, setActiveIdx] = useState(null);
  
  const faqs = [
    { q: "Who can post surplus food?", a: "Restaurants, hotels, college messes, and event organizers can post surplus food that is safe for consumption." },
    { q: "Who can collect the food?", a: "Verified NGOs and volunteer organizations registered on the platform can accept pickup requests." },
    { q: "How do NGOs know where food is available?", a: "PlateRelay shows food listings in real time along with location and contact details of the provider." },
    { q: "What happens after food is collected?", a: "The NGO confirms pickup in the system, ensuring transparency and accurate tracking of food donations." }
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-jakarta font-bold mb-4">Frequently Asked Questions</h2>
      </div>
      {faqs.map((faq, idx) => {
        const isActive = activeIdx === idx;
        return (
          <div key={idx} className="border-b border-[#e6e2da]">
            <button 
              onClick={() => setActiveIdx(isActive ? null : idx)}
              className="w-full text-left py-6 text-xl font-semibold flex justify-between items-center"
            >
              {faq.q}
              <motion.span animate={{ rotate: isActive ? 45 : 0 }}>
                +
              </motion.span>
            </button>
            <AnimatePresence>
              {isActive && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <p className="pb-6 text-[#78756e]">{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
```

### `components/Navbar.jsx` (Responsive & Inverted Variants)
```jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar({ heroInverted = true }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Decide navbar styling based on scroll and inverted prop
  const isDarkText = scrolled || !heroInverted;
  const navBg = scrolled ? 'rgba(255, 255, 255, 0.98)' : 'transparent';
  const textColor = isDarkText ? '#3d3b38' : '#ffffff';
  
  return (
    <>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'shadow-[0_4px_20px_rgba(35,139,69,0.08)] border-b border-[#e6e2da]' : ''}`}
        style={{ backgroundColor: navBg, backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-7xl mx-auto px-8 h-[80px] flex justify-between items-center">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-[#238b45] flex items-center justify-center text-white font-bold text-xl shadow-lg">
              P
            </div>
            <span className="font-jakarta font-bold text-xl" style={{ color: textColor }}>
              PlateRelay
            </span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex gap-8 items-center">
            {['Home', 'About', 'Services', 'Contact'].map((item) => (
              <motion.a 
                key={item} 
                href={`#${item.toLowerCase()}`}
                whileHover={{ scale: 1.05 }}
                className="relative font-medium text-[0.95rem]"
                style={{ color: textColor }}
              >
                {item}
              </motion.a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <motion.a 
              href="/login"
              whileHover={{ scale: 1.05 }}
              className="hidden md:block relative font-medium text-[0.95rem]"
              style={{ color: textColor }}
            >
              Log In
            </motion.a>
            <motion.button 
              whileHover={{ scale: 1.04, boxShadow: '0 8px 20px rgba(35,139,69,0.25)' }}
              whileTap={{ scale: 0.95 }}
              className="hidden md:block bg-[#238b45] hover:bg-[#1e753b] text-white px-7 py-3 rounded-xl font-semibold transition-colors"
            >
              Sign Up
            </motion.button>

            {/* Hamburger */}
            <button 
              className="md:hidden flex flex-col justify-between w-7 h-5 z-[1001]"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <motion.span 
                animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 9 : 0 }}
                className="w-full h-0.5 rounded-full origin-center" 
                style={{ backgroundColor: menuOpen ? '#3d3b38' : textColor }} 
              />
              <motion.span 
                animate={{ opacity: menuOpen ? 0 : 1 }}
                className="w-full h-0.5 rounded-full" 
                style={{ backgroundColor: menuOpen ? '#3d3b38' : textColor }} 
              />
              <motion.span 
                animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -9 : 0 }}
                className="w-full h-0.5 rounded-full origin-center" 
                style={{ backgroundColor: menuOpen ? '#3d3b38' : textColor }} 
              />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#ffffff] z-[999] flex items-center justify-center pointer-events-auto"
          >
            <motion.div 
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center gap-6"
            >
              {['Home', 'About', 'Services', 'Contact'].map((item) => (
                <a 
                  key={item} 
                  href={`#${item.toLowerCase()}`}
                  onClick={() => setMenuOpen(false)}
                  className="text-2xl font-medium text-[#3d3b38]"
                >
                  {item}
                </a>
              ))}
              <a 
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-2xl font-medium text-[#3d3b38] mt-4"
              >
                Log In
              </a>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                className="mt-2 bg-[#238b45] text-white px-8 py-4 rounded-xl w-full max-w-[250px] font-semibold"
              >
                Sign Up
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```
