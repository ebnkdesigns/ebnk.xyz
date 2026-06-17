document.addEventListener('DOMContentLoaded', async () => {
    const carousel = document.querySelector('.banner-carousel');
    const track = document.getElementById('carousel-track');
    const dotsContainer = document.getElementById('carousel-dots');

    if (!track || !dotsContainer) return;

    // Fetch banners
    let banners = [];
    try {
        const response = await fetch('https://ebnk.xyz/chnl/banners.json');
        banners = await response.json();
    } catch (error) {
        console.error('Failed to load banners:', error);
        return;
    }

    if (banners.length === 0) {
        carousel.style.display = 'none';
        return;
    }

    // Build slides and dots
    banners.forEach((banner, index) => {
        // Slide
        const slide = document.createElement('div');
        slide.className = `carousel-slide${index === 0 ? ' active' : ''}`;

        const link = document.createElement('a');
        link.href = banner.link || '#';
        if (banner.link && banner.link !== '#') {
            link.target = '_blank';
        }

        const img = document.createElement('img');
        img.src = banner.image;
        img.alt = banner.alt || '';

        link.appendChild(img);
        slide.appendChild(link);
        track.appendChild(slide);

        // Dot
        const dot = document.createElement('span');
        dot.className = `dot${index === 0 ? ' active' : ''}`;
        dot.dataset.index = index;
        dotsContainer.appendChild(dot);
    });

    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    const slideInterval = 5000;
    let touchStartX = 0;
    let touchEndX = 0;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));

        slides[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        let next = (currentSlide + 1) % slides.length;
        showSlide(next);
    }

    function prevSlide() {
        let prev = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(prev);
    }

    let interval = setInterval(nextSlide, slideInterval);

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            clearInterval(interval);
            showSlide(index);
            interval = setInterval(nextSlide, slideInterval);
        });
    });

    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            clearInterval(interval);
            prevSlide();
            interval = setInterval(nextSlide, slideInterval);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            clearInterval(interval);
            nextSlide();
            interval = setInterval(nextSlide, slideInterval);
        });
    }

    // Touch support for swiping
    if (carousel) {
        carousel.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
            clearInterval(interval);
        }, { passive: true });

        carousel.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleGesture();
            interval = setInterval(nextSlide, slideInterval);
        }, { passive: true });
    }

    function handleGesture() {
        if (touchEndX < touchStartX - 50) {
            nextSlide();
        }
        if (touchEndX > touchStartX + 50) {
            prevSlide();
        }
    }
});
