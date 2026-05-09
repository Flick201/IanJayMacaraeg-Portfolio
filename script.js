const track = document.querySelector('.video-track');
const cards = document.querySelectorAll('.video-card');
const prevBtn = document.querySelector('.carousel-btn.prev');
const nextBtn = document.querySelector('.carousel-btn.next');

let index = 0;
let visibleCards = getVisibleCards();
const totalCards = cards.length;

function getVisibleCards() {
    if (window.innerWidth >= 992) return 3; // desktop
    if (window.innerWidth >= 768) return 2; // tablet
    return 1; // mobile
}

function updateCarousel() {
    visibleCards = getVisibleCards();
    const offset = -(index * (100 / visibleCards));
    track.style.transform = `translateX(${offset}%)`;
}

nextBtn.addEventListener('click', () => {
    index++;
    if (index > totalCards - visibleCards) {
        index = 0; // wrap around
    }
    updateCarousel();
});

prevBtn.addEventListener('click', () => {
    index--;
    if (index < 0) {
        index = totalCards - visibleCards; // wrap around
    }
    updateCarousel();
});

// Recalculate on resize
window.addEventListener('resize', () => {
    index = 0; // reset to start when resizing
    updateCarousel();
});

// Init
updateCarousel();