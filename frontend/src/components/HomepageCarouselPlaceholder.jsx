import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../services/api.js';
import { validateUrl } from '../utils/validation.js';

const placeholderSlides = [
  {
    title: 'Banner image 01',
    caption: 'Homepage banner slot for a featured room, villa, or promo.'
  },
  {
    title: 'Banner image 02',
    caption: 'This can later rotate through admin-managed promotional slides.'
  },
  {
    title: 'Banner image 03',
    caption: 'Use this area for seasonal visuals, amenities, or announcements.'
  }
];

function SlideAction({ slide }) {
  if (!slide?.button_label) {
    return null;
  }

  if (slide.button_link?.startsWith('/')) {
    return (
      <Link to={slide.button_link} className="btn carousel-action-button">
        {slide.button_label}
      </Link>
    );
  }

  // Validate external URLs to prevent XSS/malicious links
  if (slide.button_link && !validateUrl(slide.button_link)) {
    return null; // Don't render invalid URLs
  }

  return (
    <a href={slide.button_link || '#'} className="btn carousel-action-button">
      {slide.button_label}
    </a>
  );
}

function HomepageCarouselPlaceholder() {
  const [slides, setSlides] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousSlide, setPreviousSlide] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    async function loadSlides() {
      try {
        const data = await apiGet('/homepage-slides');
        setSlides(Array.isArray(data) ? data : []);
      } catch (error) {
        setSlides([]);
      }
    }

    loadSlides();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setPreviousSlide(slides[activeIndex] || null);
      setIsTransitioning(true);
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [slides, activeIndex]);

  useEffect(() => {
    if (!isTransitioning) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setPreviousSlide(null);
      setIsTransitioning(false);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [isTransitioning]);

  const activeSlide = slides[activeIndex] || null;
  const previewSlides = slides.length ? slides : placeholderSlides;

  return (
    <aside className="homepage-carousel" aria-label="Homepage carousel placeholder">
      <div className="carousel-display">
        {previousSlide?.image_url ? (
          <div
            className={`carousel-background-layer previous${isTransitioning ? ' is-visible' : ''}`}
            style={{ backgroundImage: `linear-gradient(180deg, rgba(15, 24, 22, 0.18), rgba(15, 24, 22, 0.68)), url("${previousSlide.image_url}")` }}
          />
        ) : null}

        {activeSlide?.image_url ? (
          <div
            className={`carousel-background-layer current${isTransitioning ? ' is-transitioning' : ' is-visible'}`}
            style={{ backgroundImage: `linear-gradient(180deg, rgba(15, 24, 22, 0.18), rgba(15, 24, 22, 0.68)), url("${activeSlide.image_url}")` }}
          />
        ) : null}

        <div className={`carousel-display-overlay${isTransitioning ? ' is-transitioning' : ''}`}>
          <h2>{activeSlide?.title || 'Admin-managed homepage images'}</h2>
          <p>
            {activeSlide?.subtitle || 'This space is reserved for a homepage image carousel that can be managed from the admin side later.'}
          </p>
          <SlideAction slide={activeSlide} />
        </div>
      </div>

      <div className="carousel-indicators" aria-hidden="true">
        {previewSlides.map((slide, index) => (
          <span
            key={slide.title}
            className={index === activeIndex ? 'is-active' : ''}
          />
        ))}
      </div>
    </aside>
  );
}

export default HomepageCarouselPlaceholder;
