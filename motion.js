// motion.js - Vanilla JS Intersection Observer for scroll animations & micro-interactions

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Intersection Observer for elements fading or sliding in
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const motionObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('m-visible');
                // Unobserve after showing once to keep it visible
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all elements with motion classes
    const motionElements = document.querySelectorAll('.m-fade-up, .m-fade-in, .m-scale-up, .m-stagger');
    motionElements.forEach(el => motionObserver.observe(el));

    // 2. FAQ Accordion Logic
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const faqItem = btn.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Optional: Close all others first
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });

            // Toggle current snippet
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });

    // 3. Hero Parallax Effect
    const heroSection = document.querySelector('.parallax-hero');
    if (heroSection) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            // Create a slight parallax tracking on the hero background offset
            heroSection.style.backgroundPosition = `center ${scrollY * 0.4}px`;
        });
    }

    // 4. Auto-Scroll/Hover state for Reviews (Optional enhancement)
    const reviewScroll = document.querySelector('.reviews-scroll');
    if(reviewScroll) {
        let isDown = false;
        let startX;
        let scrollLeft;

        reviewScroll.addEventListener('mousedown', (e) => {
            isDown = true;
            startX = e.pageX - reviewScroll.offsetLeft;
            scrollLeft = reviewScroll.scrollLeft;
        });
        reviewScroll.addEventListener('mouseleave', () => {
            isDown = false;
        });
        reviewScroll.addEventListener('mouseup', () => {
            isDown = false;
        });
        reviewScroll.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - reviewScroll.offsetLeft;
            const walk = (x - startX) * 2; // scroll-fast
            reviewScroll.scrollLeft = scrollLeft - walk;
        });
    }

    // 5. Navbar Scroll & Mobile Menu Logic
    const navbar = document.getElementById('navbar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-links .nav-link');

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    if (mobileBtn && mobileMenu) {
        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.toggle('open');
            mobileMenu.classList.toggle('open');
            // Prevent body scroll when menu open
            document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
        });

        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileBtn.classList.remove('open');
                mobileMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // 6. Scroll Spy for Navbar Links
    const sectionMission = document.getElementById('mission');
    const sectionFeatures = document.getElementById('features');
    const navLinks = document.querySelectorAll('.desktop-links .nav-link, .mobile-links .nav-link');

    function updateActiveLinks() {
        let activeTarget = '';
        const scrollPos = window.scrollY + 150; // Offset

        if (sectionFeatures && scrollPos >= sectionFeatures.offsetTop) {
            // From platform features till bottom
            activeTarget = 'features';
        } else if (sectionMission && scrollPos >= sectionMission.offsetTop) {
            // From our mission till platform features
            activeTarget = 'mission';
        }

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            if(!href || href.includes('contact.html') || href.includes('login.html')) return;
            link.classList.remove('active');
            
            if (!activeTarget && window.scrollY < 150 && (href === '#' || href === 'index.html')) {
                link.classList.add('active'); // Home active at top
            } else if (activeTarget && href.includes('#' + activeTarget)) {
                link.classList.add('active');
            }
        });
    }

    if (sectionMission || sectionFeatures) {
        window.addEventListener('scroll', updateActiveLinks);
        updateActiveLinks(); // Run once on load
    }
});
