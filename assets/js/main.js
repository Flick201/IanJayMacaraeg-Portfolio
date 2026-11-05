/* =========================================================
   Ian Jay Macaraeg — Portfolio · motion + interaction engine
   GSAP + ScrollTrigger + SplitText + Flip + Lenis
   ========================================================= */
(() => {
    'use strict';

    /* ---------- helpers ---------- */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const html = document.documentElement;
    const reduced = html.classList.contains('reduced');
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const page = document.body.dataset.page || 'home';
    const EMAIL = 'macaraegianjay2003@gmail.com';
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const hasGSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
    if (!hasGSAP) html.classList.add('no-gsap');

    let lenis = null;
    const state = { scrollY: 0, velocity: 0, dir: 1 };

    const ICON = {
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
        prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
        next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
    };

    /* =========================================================
       Toast
       ========================================================= */
    let toastWrap;
    function toast(msg) {
        if (!toastWrap) {
            toastWrap = document.createElement('div');
            toastWrap.className = 'toast-wrap';
            toastWrap.setAttribute('role', 'status');
            toastWrap.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastWrap);
        }
        const el = document.createElement('div');
        el.className = 'toast';
        el.innerHTML = ICON.check + '<span></span>';
        el.lastChild.textContent = msg;
        toastWrap.appendChild(el);
        if (hasGSAP && !reduced) {
            gsap.fromTo(el, { y: 30, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.6)' });
            gsap.to(el, { y: 20, opacity: 0, duration: 0.4, delay: 2.4, onComplete: () => el.remove() });
        } else {
            setTimeout(() => el.remove(), 2800);
        }
    }

    async function copyEmail() {
        try { await navigator.clipboard.writeText(EMAIL); toast('Email copied to clipboard'); }
        catch (e) { window.location.href = 'mailto:' + EMAIL; }
    }

    /* =========================================================
       Theme
       ========================================================= */
    function setupTheme() {
        const btn = $('.theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', toggleTheme);
    }
    function toggleTheme() {
        const next = html.dataset.theme === 'light' ? 'dark' : 'light';
        const apply = () => {
            html.dataset.theme = next;
            try { localStorage.setItem('theme', next); } catch (e) {}
        };
        if (document.startViewTransition && !reduced) document.startViewTransition(apply);
        else apply();
    }

    /* =========================================================
       Smooth scroll (Lenis) + progress bar
       ========================================================= */
    function setupScroll() {
        if (!hasGSAP) return;
        gsap.registerPlugin(ScrollTrigger, ...(typeof SplitText !== 'undefined' ? [SplitText] : []), ...(typeof Flip !== 'undefined' ? [Flip] : []));
        const bar = $('.scroll-progress');
        if (!reduced && typeof Lenis !== 'undefined') {
            lenis = new Lenis({ duration: 1.15, easing: t => 1 - Math.pow(1 - t, 3), smoothWheel: true });
            lenis.on('scroll', e => {
                ScrollTrigger.update();
                state.velocity = e.velocity; state.dir = e.direction || state.dir; state.scrollY = e.scroll;
                onScrollUI();
            });
            gsap.ticker.add(time => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
            html.classList.add('lenis');
            // scrollbar drags, keyboard and anchor jumps scroll natively: keep ScrollTrigger in sync
            window.addEventListener('scroll', () => { state.scrollY = window.scrollY; ScrollTrigger.update(); }, { passive: true });
        } else {
            window.addEventListener('scroll', () => { state.scrollY = window.scrollY; onScrollUI(); }, { passive: true });
        }
        function onScrollUI() {
            const max = document.documentElement.scrollHeight - innerHeight;
            if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? clamp(state.scrollY / max, 0, 1) : 0) + ')';
            updateNavVisibility();
        }
        onScrollUI();
        const refresh = () => ScrollTrigger.refresh();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
        window.addEventListener('load', () => { refresh(); setTimeout(refresh, 600); });

        // in-page anchors
        document.addEventListener('click', e => {
            const a = e.target.closest('a[href^="#"]');
            if (!a || a.getAttribute('href') === '#') return;
            const target = $(a.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            scrollToEl(target);
        });
    }
    function scrollToEl(target, offset = -20) {
        if (lenis) lenis.scrollTo(target, { offset, duration: 1.4 });
        else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
    function lockScroll(lock) {
        if (lenis) lock ? lenis.stop() : lenis.start();
        document.body.style.overflow = lock ? 'hidden' : '';
    }

    /* =========================================================
       Navigation
       ========================================================= */
    let navEl, lastY = 0;
    function updateNavVisibility() {
        if (!navEl) return;
        const y = state.scrollY;
        const hide = y > 220 && y > lastY + 4 && !menuOpen;
        const show = y < lastY - 4 || y < 120;
        if (hide) navEl.classList.add('is-hidden');
        else if (show) navEl.classList.remove('is-hidden');
        lastY = y;
    }
    let menuOpen = false;
    function showNav() {
        if (!navEl) return;
        if (!hasGSAP || reduced) { navEl.classList.add('is-ready'); return; }
        gsap.to(navEl, { yPercent: 0, duration: 1, ease: 'power4.out', clearProps: 'transform', onComplete: () => navEl.classList.add('is-ready') });
    }
    function setupNav() {
        navEl = $('.nav');
        if (!navEl) return;
        const links = $$('.nav-links a');
        const ind = $('.nav-indicator');
        const wrap = $('.nav-links');
        const active = links.find(a => a.classList.contains('active'));
        const moveTo = (a, instant) => {
            if (!ind || !a) { if (ind) ind.style.opacity = 0; return; }
            const x = a.offsetLeft, w = a.offsetWidth;
            if (hasGSAP && !reduced && !instant) gsap.to(ind, { x, width: w, opacity: 1, duration: 0.5, ease: 'power3.out' });
            else { ind.style.transform = 'translateX(' + x + 'px)'; ind.style.width = w + 'px'; ind.style.opacity = 1; }
        };
        if (active) setTimeout(() => moveTo(active, true), 60);
        links.forEach(a => a.addEventListener('mouseenter', () => moveTo(a)));
        if (wrap) wrap.addEventListener('mouseleave', () => moveTo(active));
        window.addEventListener('resize', () => moveTo(active, true));
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => moveTo(active, true));

        // scramble hover
        links.forEach(a => {
            const orig = a.textContent;
            a.addEventListener('mouseenter', () => scramble(a, orig));
        });

        // mobile menu
        const btn = $('.menu-btn');
        const menu = $('.mobile-menu');
        if (btn && menu) {
            const items = $$('.mobile-menu a.big span');
            const toggle = open => {
                menuOpen = open;
                btn.setAttribute('aria-expanded', open);
                menu.setAttribute('aria-hidden', !open);
                lockScroll(open);
                if (!hasGSAP || reduced) { menu.style.visibility = open ? 'visible' : 'hidden'; menu.style.clipPath = open ? 'none' : ''; return; }
                if (open) {
                    menu.style.visibility = 'visible';
                    gsap.to(menu, { clipPath: 'circle(150% at calc(100% - 2.2rem) 2.2rem)', duration: 0.9, ease: 'power3.inOut' });
                    gsap.fromTo(items, { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: 'power4.out', stagger: 0.07, delay: 0.25 });
                } else {
                    gsap.to(menu, { clipPath: 'circle(0% at calc(100% - 2.2rem) 2.2rem)', duration: 0.7, ease: 'power3.inOut', onComplete: () => { menu.style.visibility = 'hidden'; } });
                }
            };
            btn.addEventListener('click', () => toggle(!menuOpen));
            document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) toggle(false); });
            $$('a', menu).forEach(a => a.addEventListener('click', () => { if (menuOpen) { menuOpen = false; lockScroll(false); } }));
        }
    }

    const SCRAMBLE = 'abcdefghijklmnopqrstuvwxyz#%&*+=';
    function scramble(el, text) {
        if (reduced || el._scr) return;
        el._scr = true;
        let f = 0;
        const total = 14;
        const id = setInterval(() => {
            f++;
            el.textContent = text.split('').map((c, i) => (i < (f / total) * text.length || c === ' ') ? c : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0]).join('');
            if (f >= total) { clearInterval(id); el.textContent = text; el._scr = false; }
        }, 28);
    }

    /* =========================================================
       Custom cursor
       ========================================================= */
    function setupCursor() {
        if (!fine || reduced || !hasGSAP) return;
        const ring = document.createElement('div'); ring.className = 'cursor';
        const label = document.createElement('span'); label.className = 'cursor-label'; ring.appendChild(label);
        const dot = document.createElement('div'); dot.className = 'cursor-dot';
        document.body.append(ring, dot);
        html.classList.add('has-cursor');
        const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
        const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
        const dx = gsap.quickTo(dot, 'x', { duration: 0.1 });
        const dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
        let shown = false;
        window.addEventListener('pointermove', e => {
            if (!shown) { shown = true; gsap.to([ring, dot], { opacity: 1, duration: 0.3 }); gsap.set([ring, dot], { x: e.clientX, y: e.clientY }); }
            rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
        }, { passive: true });
        document.addEventListener('pointerleave', () => gsap.to([ring, dot], { opacity: 0, duration: 0.2 }));
        document.addEventListener('pointerenter', () => shown && gsap.to([ring, dot], { opacity: 1, duration: 0.2 }));
        document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
        document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
        document.addEventListener('pointerover', e => {
            const lab = e.target.closest('[data-cursor]');
            if (lab) { label.textContent = lab.dataset.cursor; ring.classList.add('has-label'); ring.classList.remove('is-link'); return; }
            ring.classList.remove('has-label');
            ring.classList.toggle('is-link', !!e.target.closest('a, button, input, textarea, .filter, .acc-head'));
        });
    }

    /* =========================================================
       Magnetic + tilt + spotlight
       ========================================================= */
    function setupMagnetic() {
        if (!fine || reduced || !hasGSAP) return;
        $$('[data-magnetic]').forEach(el => {
            const strength = parseFloat(el.dataset.magnetic) || 0.35;
            const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * strength);
                yTo((e.clientY - (r.top + r.height / 2)) * strength);
            });
            el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    }
    function setupTilt(root = document) {
        if (!fine || reduced || !hasGSAP) {
            return;
        }
        $$('[data-tilt]', root).forEach(el => {
            if (el._tilt) return; el._tilt = true;
            const max = parseFloat(el.dataset.tilt) || 6;
            const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5, ease: 'power3' });
            const ry = gsap.quickTo(el, 'rotationY', { duration: 0.5, ease: 'power3' });
            gsap.set(el, { transformPerspective: 900 });
            el.addEventListener('pointermove', e => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
                ry((px - 0.5) * max * 2); rx(-(py - 0.5) * max * 2);
                el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
            });
            el.addEventListener('pointerleave', () => { rx(0); ry(0); });
        });
    }

    /* =========================================================
       Modals: video, lightbox, pdf
       ========================================================= */
    function youtubeInfo(src) {
        const m = typeof src === 'string' && src.match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|embed\/|watch\?v=))([\w-]+)/);
        return m ? { id: m[1], short: src.indexOf('/shorts/') !== -1 } : null;
    }
    function ytThumb(id, q = 'maxresdefault') { return 'https://i.ytimg.com/vi/' + id + '/' + q + '.jpg'; }

    let videoModal, pdfModal, lightbox, lastFocus;
    function buildModals() {
        videoModal = document.createElement('div');
        videoModal.className = 'modal'; videoModal.setAttribute('role', 'dialog'); videoModal.setAttribute('aria-modal', 'true'); videoModal.setAttribute('aria-label', 'Video player');
        videoModal.innerHTML = '<div class="modal-backdrop"></div><div class="modal-box"><button class="modal-close" aria-label="Close video">' + ICON.close + '</button><div class="modal-player"></div><div class="modal-info"><h4></h4><p></p></div></div>';
        pdfModal = document.createElement('div');
        pdfModal.className = 'modal'; pdfModal.setAttribute('role', 'dialog'); pdfModal.setAttribute('aria-modal', 'true'); pdfModal.setAttribute('aria-label', 'Document preview');
        pdfModal.innerHTML = '<div class="modal-backdrop"></div><div class="modal-box modal-box--pdf"><button class="modal-close" aria-label="Close preview">' + ICON.close + '</button><iframe title="Document preview"></iframe></div>';
        lightbox = document.createElement('div');
        lightbox.className = 'lightbox'; lightbox.setAttribute('role', 'dialog'); lightbox.setAttribute('aria-modal', 'true'); lightbox.setAttribute('aria-label', 'Image viewer');
        lightbox.innerHTML = '<div class="lb-top"><span class="lb-count"></span><button class="modal-close lb-close" aria-label="Close viewer">' + ICON.close + '</button></div><button class="lb-nav lb-prev" aria-label="Previous image">' + ICON.prev + '</button><div class="lb-stage"><img alt=""></div><button class="lb-nav lb-next" aria-label="Next image">' + ICON.next + '</button><div class="lb-bottom"><h4></h4><p></p></div>';
        document.body.append(videoModal, pdfModal, lightbox);

        $('.modal-backdrop', videoModal).addEventListener('click', closeVideo);
        $('.modal-close', videoModal).addEventListener('click', closeVideo);
        $('.modal-backdrop', pdfModal).addEventListener('click', closePdf);
        $('.modal-close', pdfModal).addEventListener('click', closePdf);
        $('.lb-close', lightbox).addEventListener('click', closeLightbox);
        $('.lb-prev', lightbox).addEventListener('click', () => stepLightbox(-1));
        $('.lb-next', lightbox).addEventListener('click', () => stepLightbox(1));
        lightbox.addEventListener('click', e => { if (e.target.classList.contains('lb-stage') || e.target === lightbox) closeLightbox(); });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { closeVideo(); closePdf(); closeLightbox(); }
            if (lightbox.classList.contains('open')) {
                if (e.key === 'ArrowLeft') stepLightbox(-1);
                if (e.key === 'ArrowRight') stepLightbox(1);
            }
        });
        // swipe
        let sx = null;
        const stage = $('.lb-stage', lightbox);
        stage.addEventListener('pointerdown', e => { sx = e.clientX; });
        stage.addEventListener('pointerup', e => { if (sx === null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) stepLightbox(d < 0 ? 1 : -1); });
    }
    function openModal(m) {
        lastFocus = document.activeElement; m.classList.add('open'); lockScroll(true);
        if (hasGSAP && !reduced) gsap.fromTo($('.modal-box', m) || $('.lb-stage', m), { y: 40, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.6, ease: 'power3.out' });
        const c = $('.modal-close', m); if (c) c.focus({ preventScroll: true });
    }
    function closeModal(m) {
        if (!m.classList.contains('open')) return false;
        m.classList.remove('open'); lockScroll(false);
        if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
        return true;
    }
    function openVideo(url, title, desc) {
        const info = youtubeInfo(url);
        if (!info) { window.open(url, '_blank', 'noopener'); return; }
        const player = $('.modal-player', videoModal);
        player.classList.toggle('is-short', info.short);
        player.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + info.id + '?autoplay=1&rel=0&playsinline=1" title="' + (title || 'Video').replace(/"/g, '&quot;') + '" allowfullscreen allow="autoplay; encrypted-media; picture-in-picture"></iframe>';
        $('h4', videoModal).textContent = title || '';
        $('.modal-info p', videoModal).textContent = desc || '';
        openModal(videoModal);
    }
    function closeVideo() { if (closeModal(videoModal)) $('.modal-player', videoModal).innerHTML = ''; }
    function openPdf(src) { $('iframe', pdfModal).src = src; openModal(pdfModal); }
    function closePdf() { if (closeModal(pdfModal)) $('iframe', pdfModal).removeAttribute('src'); }

    let lbItems = [], lbIndex = 0;
    function openLightbox(items, index) { lbItems = items; lbIndex = index; showLightbox(true); openModalLB(); }
    function openModalLB() { lastFocus = document.activeElement; lightbox.classList.add('open'); lockScroll(true); $('.lb-close', lightbox).focus({ preventScroll: true }); }
    function closeLightbox() { if (!lightbox.classList.contains('open')) return; lightbox.classList.remove('open'); lockScroll(false); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
    function showLightbox(first) {
        const it = lbItems[lbIndex]; if (!it) return;
        const img = $('.lb-stage img', lightbox);
        const set = () => { img.src = it.src; img.alt = it.alt || it.title; };
        if (hasGSAP && !reduced && !first) {
            gsap.to(img, { opacity: 0, x: -20, duration: 0.18, onComplete: () => { set(); gsap.fromTo(img, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }); } });
        } else { set(); if (hasGSAP && !reduced) gsap.fromTo(img, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power3.out' }); }
        $('.lb-count', lightbox).textContent = String(lbIndex + 1).padStart(2, '0') + ' / ' + String(lbItems.length).padStart(2, '0');
        $('.lb-bottom h4', lightbox).textContent = it.title || '';
        $('.lb-bottom p', lightbox).textContent = it.cat || '';
        [lbIndex + 1, lbIndex - 1].forEach(i => { const n = lbItems[(i + lbItems.length) % lbItems.length]; if (n) { const p = new Image(); p.src = n.src; } });
    }
    function stepLightbox(d) { if (!lbItems.length) return; lbIndex = (lbIndex + d + lbItems.length) % lbItems.length; showLightbox(false); }

    /* =========================================================
       Command palette
       ========================================================= */
    function go(href) {
        const a = document.createElement('a');
        a.href = href; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
    }
    function setupPalette() {
        const root = document.createElement('div');
        root.className = 'palette'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Command palette');
        root.innerHTML = '<div class="palette-backdrop"></div><div class="palette-box"><div class="palette-input">' + ICON.search + '<input type="text" placeholder="Type a command or search…" aria-label="Search commands" autocomplete="off" spellcheck="false"></div><div class="palette-list" role="listbox"></div><div class="palette-foot"><span><span class="kbd">↑↓</span> navigate</span><span><span class="kbd">↵</span> select</span><span><span class="kbd">esc</span> close</span></div></div>';
        document.body.appendChild(root);
        const input = $('input', root), list = $('.palette-list', root);
        const nav = href => () => go(href);
        const cmds = [
            { g: 'Pages', t: 'Home', k: 'Go to', run: nav('index.html') },
            { g: 'Pages', t: 'Projects', k: 'Go to', run: nav('projects.html') },
            { g: 'Pages', t: 'About', k: 'Go to', run: nav('about.html') },
            { g: 'Pages', t: 'Contact', k: 'Go to', run: nav('contact.html') },
            { g: 'Work', t: 'Watch videos', k: 'Projects', run: nav('projects.html#videos') },
            { g: 'Work', t: 'Photography', k: 'Projects', run: nav('projects.html#photography') },
            { g: 'Work', t: 'Logo design', k: 'Projects', run: nav('projects.html#logos') },
            { g: 'Work', t: 'Slides & documents', k: 'Projects', run: nav('projects.html#documents') },
            { g: 'Actions', t: 'Toggle light / dark theme', k: 'Theme', run: toggleTheme },
            { g: 'Actions', t: 'Copy email address', k: 'Copy', run: copyEmail },
            { g: 'Actions', t: 'Open my resume (PDF)', k: 'Open', run: () => window.open('uploads/docs/MacaraegIanJayP.pdf', '_blank', 'noopener') },
            { g: 'Actions', t: 'Send me a message', k: 'Contact', run: nav('contact.html') },
            { g: 'Social', t: 'LinkedIn', k: 'Open', run: () => window.open('https://www.linkedin.com/in/ian-jay-macaraeg-761606292/', '_blank', 'noopener') },
            { g: 'Social', t: 'Facebook', k: 'Open', run: () => window.open('https://www.facebook.com/jayiannnn', '_blank', 'noopener') },
            { g: 'Social', t: 'Instagram', k: 'Open', run: () => window.open('https://www.instagram.com/_yanjeiii/', '_blank', 'noopener') },
            { g: 'Social', t: 'Threads', k: 'Open', run: () => window.open('https://www.threads.com/@_yanjeiii', '_blank', 'noopener') },
            { g: 'Social', t: 'X (Twitter)', k: 'Open', run: () => window.open('https://x.com/yanjeiiii', '_blank', 'noopener') }
        ];
        let shown = [], sel = 0;
        function render() {
            const q = input.value.trim().toLowerCase();
            shown = cmds.filter(c => !q || (c.t + ' ' + c.g + ' ' + c.k).toLowerCase().includes(q));
            sel = 0; list.innerHTML = '';
            if (!shown.length) { list.innerHTML = '<div class="palette-empty">No results for “' + q.replace(/[<>&]/g, '') + '”</div>'; return; }
            let g = '';
            shown.forEach((c, i) => {
                if (c.g !== g) { g = c.g; const h = document.createElement('div'); h.className = 'palette-group'; h.textContent = g; list.appendChild(h); }
                const b = document.createElement('button');
                b.className = 'palette-item' + (i === 0 ? ' is-active' : ''); b.setAttribute('role', 'option');
                b.innerHTML = '<span></span><small></small>'; b.firstChild.textContent = c.t; b.lastChild.textContent = c.k;
                b.addEventListener('click', () => run(i));
                b.addEventListener('mousemove', () => setSel(i));
                list.appendChild(b);
            });
        }
        function setSel(i) { sel = i; $$('.palette-item', list).forEach((b, n) => b.classList.toggle('is-active', n === i)); const a = $('.palette-item.is-active', list); if (a) a.scrollIntoView({ block: 'nearest' }); }
        function run(i) { const c = shown[i]; if (!c) return; close(); setTimeout(c.run, 120); }
        function open() { root.classList.add('open'); lockScroll(true); input.value = ''; render(); input.focus(); if (hasGSAP && !reduced) gsap.fromTo($('.palette-box', root), { y: -20, scale: 0.97, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'power3.out' }); }
        function close() { if (!root.classList.contains('open')) return; root.classList.remove('open'); lockScroll(false); }
        input.addEventListener('input', render);
        input.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((sel + 1) % shown.length); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((sel - 1 + shown.length) % shown.length); }
            if (e.key === 'Enter') { e.preventDefault(); run(sel); }
        });
        $('.palette-backdrop', root).addEventListener('click', close);
        document.addEventListener('keydown', e => {
            const typing = /input|textarea/i.test((document.activeElement || {}).tagName || '');
            if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); root.classList.contains('open') ? close() : open(); }
            else if (e.key === '/' && !typing) { e.preventDefault(); open(); }
            else if (e.key === 'Escape') close();
        });
        $$('[data-palette]').forEach(b => b.addEventListener('click', open));
    }

    /* =========================================================
       Page transitions
       ========================================================= */
    function setupTransitions() {
        const curtain = $('.curtain'), word = $('.curtain-word');
        if (!curtain) return;
        const labels = { 'index.html': 'Home', '': 'Home', 'projects.html': 'Projects', 'about.html': 'About', 'contact.html': 'Contact' };
        if (html.classList.contains('pt-in') && hasGSAP && !reduced) {
            try { word.textContent = sessionStorage.getItem('ptLabel') || ''; } catch (e) {}
            gsap.set(curtain, { yPercent: 0 });
            html.classList.remove('pt-in');
            gsap.set(word, { opacity: 1 });
            curtain._intro = gsap.timeline({ delay: 0.1 })
                .to(word, { yPercent: -40, opacity: 0, duration: 0.5, ease: 'power3.in' })
                .to(curtain, { yPercent: -101, borderRadius: '0 0 50% 50% / 0 0 14% 14%', duration: 0.9, ease: 'power4.inOut' }, '-=0.15')
                .set(curtain, { yPercent: 101, borderRadius: '50% 50% 0 0 / 14% 14% 0 0' });
        } else html.classList.remove('pt-in');
        try { sessionStorage.removeItem('pt'); } catch (e) {}

        document.addEventListener('click', e => {
            if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = e.target.closest('a[href]');
            if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
            const url = new URL(a.href, location.href);
            if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
            if (url.pathname === location.pathname) return;       // same page (hash handled elsewhere)
            e.preventDefault();
            if (!hasGSAP || reduced) { location.href = a.href; return; }
            const file = url.pathname.split('/').pop();
            word.textContent = labels[file] || '';
            try { sessionStorage.setItem('pt', '1'); sessionStorage.setItem('ptLabel', labels[file] || ''); } catch (er) {}
            if (menuOpen) lockScroll(false);
            gsap.set(curtain, { yPercent: 101, borderRadius: '50% 50% 0 0 / 14% 14%' });
            gsap.timeline({ onComplete: () => { location.href = a.href; } })
                .to(curtain, { yPercent: 0, borderRadius: '0', duration: 0.8, ease: 'power4.inOut' })
                .fromTo(word, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, '-=0.35');
        });
        window.addEventListener('pageshow', e => { if (e.persisted && hasGSAP) { gsap.set(curtain, { yPercent: 101 }); gsap.set(word, { opacity: 0 }); lockScroll(false); } });
    }

    /* =========================================================
       Preloader (first visit per session)
       ========================================================= */
    function runPreloader() {
        return new Promise(resolve => {
            const pre = $('.preloader');
            if (!pre || !html.classList.contains('pre') || !hasGSAP || reduced) {
                if (pre) pre.remove(); html.classList.remove('pre');
                const lifting = $('.curtain') && $('.curtain')._intro;
                return lifting ? setTimeout(resolve, 650) : resolve();
            }
            const nameEl = $('.pre-name', pre);
            const text = nameEl.dataset.text || nameEl.textContent;
            nameEl.innerHTML = text.split('').map(c => c === ' ' ? '<span class="ch">&nbsp;</span>' : '<span class="ch">' + c + '</span>').join('');
            const count = $('.pre-count', pre), bar = $('.pre-bar', pre);
            const obj = { v: 0 };
            lockScroll(true);
            const tl = gsap.timeline({ onComplete: () => { pre.remove(); html.classList.remove('pre'); lockScroll(false); resolve(); } });
            tl.to($$('.ch', nameEl), { y: 0, duration: 0.9, ease: 'power4.out', stagger: 0.04 }, 0)
              .to(obj, { v: 100, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { count.textContent = String(Math.round(obj.v)).padStart(3, '0'); } }, 0)
              .to(bar, { scaleX: 1, duration: 1.7, ease: 'power2.inOut' }, 0)
              .to($$('.ch', nameEl), { y: '-105%', duration: 0.6, ease: 'power3.in', stagger: 0.02 }, 1.9)
              .to([count, $('.pre-top', pre), $('.pre-bottom', pre)], { opacity: 0, duration: 0.4 }, 1.9)
              .to(pre, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'power4.inOut' }, 2.3);
            gsap.set(pre, { clipPath: 'inset(0 0 0% 0)' });
        });
    }

    /* =========================================================
       Marquee with scroll-velocity boost
       ========================================================= */
    function setupMarquees() {
        if (!hasGSAP || reduced) return;
        $$('.marquee').forEach(m => {
            const track = $('.marquee-track', m);
            const first = track.firstElementChild;
            if (!first) return;
            const base = parseFloat(m.dataset.speed) || 1;
            const dirBase = m.dataset.dir === 'right' ? 1 : -1;
            const fill = () => {
                $$('[data-clone]', track).forEach(n => n.remove());
                const need = Math.ceil((window.innerWidth * 2) / Math.max(first.offsetWidth, 1));
                for (let i = 0; i < need; i++) { const c = first.cloneNode(true); c.setAttribute('data-clone', ''); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); }
            };
            fill();
            let x = 0, boost = 0;
            window.addEventListener('resize', fill);
            gsap.ticker.add((t, dt) => {
                const w = first.offsetWidth; if (!w) return;
                boost = lerp(boost, Math.min(Math.abs(state.velocity) * 0.9, 14), 0.08);
                const flip = (m.dataset.follow !== undefined) ? (state.dir >= 0 ? 1 : -1) : 1;
                x += dirBase * flip * (base * 0.5 + boost) * (dt / 16.67);
                if (x <= -w) x += w; if (x > 0) x -= w;
                track.style.transform = 'translate3d(' + x + 'px,0,0)';
            });
        });
    }

    /* =========================================================
       Generic scroll animations
       ========================================================= */
    function setupReveals(root = document) {
        if (!hasGSAP || reduced) return;
        // fade-up
        const els = $$('[data-reveal]', root).filter(e => !e._rv);
        els.forEach(e => e._rv = true);
        if (els.length) {
            gsap.set(els, { y: 40 });
            ScrollTrigger.batch(els, {
                start: 'top 90%', once: true,
                onEnter: batch => gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, overwrite: true })
            });
        }
        // clip image wipe
        $$('[data-clip]', root).forEach(e => {
            if (e._rv) return; e._rv = true;
            ScrollTrigger.create({ trigger: e, start: 'top 88%', once: true, onEnter: () => gsap.to(e, { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'power4.inOut', onComplete: () => { e.style.clipPath = 'none'; } }) });
        });
        // split text (lines, masked)
        if (typeof SplitText !== 'undefined') {
            $$('[data-split]', root).forEach(e => {
                if (e._sp) return; e._sp = true;
                const mode = e.dataset.split || 'lines';
                if (e.closest('.hero')) return;                 // hero handled in intro
                SplitText.create(e, {
                    type: mode === 'words' ? 'words,lines' : 'lines', mask: 'lines', autoSplit: true,
                    onSplit: self => gsap.from(mode === 'words' ? self.words : self.lines, {
                        yPercent: 115, duration: 1.1, ease: 'power4.out', stagger: mode === 'words' ? 0.03 : 0.12,
                        scrollTrigger: { trigger: e, start: 'top 88%', once: true }
                    })
                });
            });
        }
        // parallax images inside frames
        $$('[data-parallax-img]', root).forEach(f => {
            if (f._px) return; f._px = true;
            const img = $('img', f); if (!img) return;
            const amt = parseFloat(f.dataset.parallaxImg) || 8;
            gsap.fromTo(img, { yPercent: -amt }, { yPercent: amt, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
        // generic parallax (speed in percent of own height)
        $$('[data-parallax]', root).forEach(e => {
            if (e._px) return; e._px = true;
            const s = parseFloat(e.dataset.parallax) || 10;
            gsap.fromTo(e, { yPercent: s }, { yPercent: -s, ease: 'none', scrollTrigger: { trigger: e.parentElement || e, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
        // counters
        $$('[data-count]', root).forEach(e => {
            if (e._ct) return; e._ct = true;
            const end = parseFloat(e.dataset.count), o = { v: 0 }, suffix = e.dataset.suffix || '';
            const set = () => { e.firstChild.textContent = Math.round(o.v); };
            e.textContent = '0'; if (suffix) { const s = document.createElement('sup'); s.textContent = suffix; e.appendChild(s); }
            ScrollTrigger.create({ trigger: e, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', onUpdate: set }) });
        });
    }

    /* =========================================================
       Footer: clock, year
       ========================================================= */
    function setupFooter() {
        const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
        const clocks = $$('[data-clock]');
        if (clocks.length) {
            const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            const tick = () => { const t = fmt.format(new Date()); clocks.forEach(c => { c.textContent = t; }); };
            tick(); setInterval(tick, 1000);
        }
        $$('[data-copy-email]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); copyEmail(); }));
        $$('[data-top]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); lenis ? lenis.scrollTo(0, { duration: 1.6 }) : window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }));
    }

    /* =========================================================
       Confetti (contact success + easter egg)
       ========================================================= */
    function confetti(x, y, count = 120) {
        if (reduced) return;
        const cv = document.createElement('canvas');
        cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9950';
        cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
        const ctx = cv.getContext('2d');
        const colors = ['#ee6f5a', '#f2b66a', '#ece9d6', '#ffffff', '#c4503d'];
        const ps = Array.from({ length: count }, () => ({ x, y, vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 15 - 4, s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[(Math.random() * colors.length) | 0] }));
        let f = 0;
        (function frame() {
            ctx.clearRect(0, 0, cv.width, cv.height);
            ps.forEach(p => { p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.vx *= 0.99; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
            if (++f < 190) requestAnimationFrame(frame); else cv.remove();
        })();
    }
    function setupEasterEgg() {
        const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let i = 0;
        document.addEventListener('keydown', e => {
            i = (e.key === seq[i] || e.key.toLowerCase() === seq[i]) ? i + 1 : (e.key === seq[0] ? 1 : 0);
            if (i === seq.length) { i = 0; confetti(innerWidth / 2, innerHeight / 2, 220); toast('You found the secret — thanks for exploring!'); }
        });
    }

    /* =========================================================
       Shared hero intro for inner pages
       ========================================================= */
    function innerHeroIntro() {
        const hero = $('.page-hero');
        if (!hero || !hasGSAP || reduced) return;
        const h1 = $('h1', hero);
        const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        if (typeof SplitText !== 'undefined' && h1) {
            const sp = SplitText.create(h1, { type: 'chars,lines', mask: 'lines' });
            tl.from(sp.chars, { yPercent: 120, rotate: 6, duration: 1.1, stagger: 0.025 }, 0);
        } else if (h1) tl.from(h1, { y: 60, opacity: 0, duration: 1 }, 0);
        tl.fromTo($$('[data-hero]', hero), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, 0.35);
        gsap.to($$('.blob', hero), { y: 80, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }

    /* =========================================================
       Page: HOME
       ========================================================= */
    function initHome(introDone) {
        const hero = $('.hero');
        if (!hero) return;
        if (!hasGSAP || reduced) return initHomeStatic();

        /* hero intro */
        const h1 = $('.hero-title', hero);
        const sp = typeof SplitText !== 'undefined' ? SplitText.create(h1, { type: 'chars,lines', mask: 'lines' }) : null;
        if (sp) gsap.set(sp.chars, { yPercent: 125, rotate: 8 });
        const portraitImg = $('.portrait-frame img', hero);
        gsap.set('.portrait-frame', { clipPath: 'inset(100% 0 0 0)' });
        gsap.set('[data-hero]', { opacity: 0, y: 30 });
        gsap.set(['.chip-float', '.spin-badge'], { scale: 0, opacity: 0 });
        introDone.then(() => {
            const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
            showNav();
            if (sp) tl.to(sp.chars, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.035 }, 0.1);
            tl.to('[data-hero]', { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.5)
              .to('.portrait-frame', { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'power4.inOut' }, 0.3)
              .fromTo(portraitImg, { scale: 1.45 }, { scale: 1.12, duration: 1.8, ease: 'power3.out' }, 0.3)
              .to(['.chip-float', '.spin-badge'], { scale: 1, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'back.out(1.8)' }, 1.1);
        });

        /* role rotator */
        const win = $('.role-window');
        if (win) {
            const spans = $$('span', win);
            if (spans.length > 1) {
                spans.forEach(s => win.appendChild(s.cloneNode(true)));
                const h = () => spans[0].offsetHeight;
                const total = spans.length;
                const loop = gsap.timeline({ repeat: -1 });
                for (let i = 1; i <= total; i++) loop.to(win.children, { y: () => -h() * i, duration: 0.8, ease: 'power4.inOut' }, '+=1.6');
                loop.eventCallback('onRepeat', () => gsap.set(win.children, { y: 0 }));
            }
        }

        /* mouse parallax in hero */
        if (fine) {
            const layers = [
                { el: '.hero-word', k: -0.012 }, { el: '.blob.b1', k: 0.03 }, { el: '.blob.b2', k: -0.03 },
                { el: '.portrait-frame', k: 0.012 }, { el: '.chip-float.c1', k: 0.03 }, { el: '.chip-float.c2', k: -0.025 }, { el: '.chip-float.c3', k: 0.04 }, { el: '.spin-badge', k: -0.035 }
            ].map(l => { const el = $(l.el, hero); return el ? { k: l.k, xTo: gsap.quickTo(el, 'x', { duration: 1, ease: 'power3' }), yTo: gsap.quickTo(el, 'y', { duration: 1, ease: 'power3' }) } : null; }).filter(Boolean);
            hero.addEventListener('pointermove', e => {
                const dx = e.clientX - innerWidth / 2, dy = e.clientY - innerHeight / 2;
                layers.forEach(l => { l.xTo(dx * l.k * 3); l.yTo(dy * l.k * 3); });
            });
        }
        /* hero scroll-out */
        gsap.to('.hero-word', { scale: 1.25, xPercent: -8, opacity: 0.5, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.hero-grid', { yPercent: -10, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: hero, start: '20% top', end: 'bottom top', scrub: true } });

        /* statement: scrubbed words + drawn line */
        const st = $('.statement-text');
        if (st && typeof SplitText !== 'undefined') {
            const s = SplitText.create(st, { type: 'words', wordsClass: 'w' });
            gsap.fromTo(s.words, { opacity: 0.16 }, { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: st, start: 'top 82%', end: 'bottom 48%', scrub: true } });
        }
        const path = $('.statement-line path');
        if (path) {
            const len = path.getTotalLength();
            gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
            gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.statement', start: 'top 70%', end: 'bottom 30%', scrub: 1 } });
        }

        /* services: pinned horizontal scroll (desktop only) */
        const mm = gsap.matchMedia();
        mm.add('(min-width: 900px)', () => {
            const sec = $('.hscroll'), track = $('.hscroll-track'), prog = $('.hscroll-progress i'), cnt = $('.hscroll-count b');
            if (!sec || !track) return;
            const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 40);
            const cards = $$('.svc', track);
            gsap.timeline({
                scrollTrigger: {
                    trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
                    onUpdate: self => { if (cnt) cnt.textContent = String(Math.min(cards.length, Math.floor(self.progress * cards.length) + 1)).padStart(2, '0'); }
                }
            }).to(track, { x: () => -dist(), ease: 'none' }, 0).to(prog, { scaleX: 1, ease: 'none' }, 0);
            return () => { gsap.set(track, { clearProps: 'transform' }); };
        });

        /* video rail */
        setupRails();
        /* visual work images */
        $$('.work-item img').forEach(img => {
            gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
        /* CTA scrub */
        gsap.fromTo('.cta-title', { scale: 0.88 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top bottom', end: 'center center', scrub: true } });
        /* tools marquee rows are handled by setupMarquees */
    }
    function initHomeStatic() { setupRails(); }

    /* video rails (drag to scroll, arrows, progress, modal) */
    function setupRails() {
        $$('.rail-wrap').forEach(wrap => {
            const rail = $('.rail', wrap), bar = $('.rail-bar i', wrap);
            if (!rail) return;
            const upd = () => {
                const max = rail.scrollWidth - rail.clientWidth;
                const p = max > 0 ? rail.scrollLeft / max : 1;
                const vis = rail.clientWidth / rail.scrollWidth;
                if (bar) bar.style.transform = 'scaleX(' + clamp(vis + p * (1 - vis), 0.05, 1) + ')';
            };
            rail.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
            const step = () => (rail.querySelector('.vcard') || { offsetWidth: 300 }).offsetWidth + 16;
            $('.rail-prev', wrap) && $('.rail-prev', wrap).addEventListener('click', () => rail.scrollBy({ left: -step() * 2, behavior: reduced ? 'auto' : 'smooth' }));
            $('.rail-next', wrap) && $('.rail-next', wrap).addEventListener('click', () => rail.scrollBy({ left: step() * 2, behavior: reduced ? 'auto' : 'smooth' }));
            // drag
            let down = false, sx = 0, sl = 0, moved = 0;
            rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('is-dragging'); });
            window.addEventListener('pointermove', e => { if (!down) return; const d = e.clientX - sx; moved = Math.max(moved, Math.abs(d)); rail.scrollLeft = sl - d; });
            window.addEventListener('pointerup', () => { if (!down) return; down = false; rail.classList.remove('is-dragging'); });
            rail.addEventListener('click', e => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); moved = 0; } }, true);
            // entrance
            if (hasGSAP && !reduced) {
                gsap.from($$('.vcard', rail), { x: 80, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: rail, start: 'top 88%', once: true } });
            }
        });
        $$('.vcard[data-yt]').forEach(c => {
            c.addEventListener('click', () => openVideo(c.dataset.yt, c.dataset.title, c.dataset.desc));
            c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } });
        });
    }

    /* =========================================================
       Page: PROJECTS
       ========================================================= */
    function initProjects() {
        const grid = $('.pgrid'); if (!grid) return;
        const items = $$('.pitem', grid);
        const filters = $$('.filter');
        const docs = $('#documents');
        const empty = $('.empty-note');
        const GAP_ROW = 8;

        function layout() {
            items.forEach(it => {
                if (it.classList.contains('is-hidden')) return;
                const w = it.getBoundingClientRect().width;
                if (!w) return;
                const gap = parseFloat(getComputedStyle(it).marginBottom) || 0;
                const ratio = parseFloat(it.dataset.ratio) || 1;
                it.style.gridRowEnd = 'span ' + Math.ceil((w * ratio + gap) / GAP_ROW);
            });
        }
        // counts
        const cats = { all: items.length };
        items.forEach(it => { cats[it.dataset.cat] = (cats[it.dataset.cat] || 0) + 1; });
        filters.forEach(f => { const c = f.dataset.filter; const s = $('sup', f); if (s && cats[c] !== undefined) s.textContent = cats[c]; });

        function applyFilter(cat, animate) {
            filters.forEach(f => { const on = f.dataset.filter === cat; f.classList.toggle('active', on); f.setAttribute('aria-pressed', on); });
            if (cat === 'documents') {
                items.forEach(it => it.classList.add('is-hidden'));
                layout();
                if (empty) empty.style.display = 'none';
                if (docs) setTimeout(() => scrollToEl(docs, -90), 50);
                return;
            }
            const canFlip = animate && hasGSAP && !reduced && typeof Flip !== 'undefined';
            const state = canFlip ? Flip.getState(items.filter(i => !i.classList.contains('is-hidden'))) : null;
            let n = 0;
            items.forEach(it => { const show = cat === 'all' || it.dataset.cat === cat; it.classList.toggle('is-hidden', !show); if (show) { it.classList.add('in'); n++; } });
            layout();
            if (empty) empty.style.display = n ? 'none' : 'block';
            if (canFlip) {
                gsap.set(items, { clearProps: 'opacity,transform' });
                Flip.from(state, { duration: 0.8, ease: 'power3.inOut', stagger: 0.015, absolute: false, scale: false,
                    onEnter: els => gsap.fromTo(els, { opacity: 0, scale: 0.8, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.02 }),
                    onLeave: els => gsap.to(els, { opacity: 0, scale: 0.8, duration: 0.3 }) });
            }
            if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 900);
            try { history.replaceState(null, '', cat === 'all' ? location.pathname : '#' + cat); } catch (e) {}
        }
        filters.forEach(f => f.addEventListener('click', () => applyFilter(f.dataset.filter, true)));

        // initial
        items.forEach(it => { if (reduced || !hasGSAP) it.classList.add('in'); });
        const hashMap = { video: 'video', cert: 'cert', logo: 'logo', graphic: 'graphic', videos: 'video', '2d-art': 'art', art: 'art', photography: 'photo', photo: 'photo', certificates: 'cert', logos: 'logo', graphics: 'graphic', documents: 'documents' };
        const h = (location.hash || '').slice(1).toLowerCase();
        const startCat = hashMap[h] || 'all';
        layout();
        window.addEventListener('resize', layout);
        window.addEventListener('load', layout);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
        grid.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', layout, { once: true }); });
        if (startCat !== 'all') applyFilter(startCat, false);
        window.addEventListener('hashchange', () => applyFilter(hashMap[(location.hash || '').slice(1).toLowerCase()] || 'all', true));

        // reveal as they scroll in
        if (hasGSAP && !reduced) {
            ScrollTrigger.batch(items, {
                start: 'top 94%', once: true,
                onEnter: b => gsap.fromTo(b, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.07, overwrite: true, onComplete: () => b.forEach(el => el.classList.add('in')), clearProps: 'transform' })
            });
        }
        // open
        const visibleImages = () => items.filter(it => it.dataset.type === 'image' && !it.classList.contains('is-hidden'));
        items.forEach(it => {
            const card = $('.pcard', it);
            card.addEventListener('click', () => {
                if (it.dataset.type === 'video') return openVideo(it.dataset.yt, it.dataset.title, it.dataset.desc);
                const list = visibleImages();
                openLightbox(list.map(x => ({ src: x.dataset.lg, title: x.dataset.title, cat: x.dataset.catLabel, alt: $('img', x).alt })), list.indexOf(it));
            });
        });
        // docs
        $$('[data-pdf]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openPdf(b.dataset.pdf); }));
        // hero count-up of total works
        if (hasGSAP && !reduced) {
            $$('.doc').forEach(d => gsap.from(d, { y: 60, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: d, start: 'top 90%', once: true } }));
        }
    }

    /* =========================================================
       Page: ABOUT
       ========================================================= */
    function initAbout() {
        // accordion
        const items = $$('.acc-item');
        items.forEach((it, idx) => {
            const head = $('.acc-head', it), body = $('.acc-body', it);
            const open = (on, animate = true) => {
                it.classList.toggle('open', on); head.setAttribute('aria-expanded', on);
                if (!hasGSAP || reduced || !animate) { body.style.height = on ? 'auto' : '0'; return; }
                gsap.to(body, { height: on ? 'auto' : 0, duration: 0.7, ease: 'power3.inOut', onComplete: () => { if (hasGSAP) ScrollTrigger.refresh(); } });
            };
            head.addEventListener('click', () => {
                const will = !it.classList.contains('open');
                items.forEach(o => { if (o !== it && o.classList.contains('open')) { o.classList.remove('open'); $('.acc-head', o).setAttribute('aria-expanded', false); hasGSAP && !reduced ? gsap.to($('.acc-body', o), { height: 0, duration: 0.6, ease: 'power3.inOut' }) : ($('.acc-body', o).style.height = '0'); } });
                open(will);
            });
            if (idx === 0) open(true, false);
        });
        // tool filter with Flip
        const tabs = $$('.tool-tabs .filter'), cards = $$('.tool-card');
        tabs.forEach(t => t.addEventListener('click', () => {
            tabs.forEach(x => { x.classList.toggle('active', x === t); x.setAttribute('aria-pressed', x === t); });
            const cat = t.dataset.filter;
            const canFlip = hasGSAP && !reduced && typeof Flip !== 'undefined';
            const state = canFlip ? Flip.getState(cards.filter(c => !c.classList.contains('is-hidden'))) : null;
            cards.forEach(c => c.classList.toggle('is-hidden', cat !== 'all' && c.dataset.cat !== cat));
            if (canFlip) Flip.from(state, { duration: 0.7, ease: 'power3.inOut', stagger: 0.02,
                onEnter: els => gsap.fromTo(els, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)', stagger: 0.03 }),
                onLeave: els => gsap.to(els, { opacity: 0, scale: 0.7, duration: 0.3 }) });
        }));
        if (!hasGSAP || reduced) return;
        // stagger tool cards in
        ScrollTrigger.batch('.tool-card', { start: 'top 92%', once: true, onEnter: b => gsap.from(b, { y: 50, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.05, clearProps: 'all' }) });
        // journey line + items
        const jl = $('.journey-line');
        if (jl) gsap.to(jl, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.journey', start: 'top 70%', end: 'bottom 60%', scrub: true } });
        // about paragraph scrub
        $$('.about-copy p').forEach(p => {
            if (typeof SplitText === 'undefined') return;
            const s = SplitText.create(p, { type: 'words', wordsClass: 'w' });
            gsap.fromTo(s.words, { opacity: 0.2 }, { opacity: 1, ease: 'none', stagger: 0.05, scrollTrigger: { trigger: p, start: 'top 85%', end: 'bottom 55%', scrub: true } });
        });
        // values
        ScrollTrigger.batch('.value', { start: 'top 92%', once: true, onEnter: b => gsap.from(b, { y: 60, opacity: 0, rotate: 2, duration: 1, ease: 'power3.out', stagger: 0.1, clearProps: 'all' }) });
        // portrait stamp
        const stamp = $('.about-photo .stamp');
        if (stamp) gsap.from(stamp, { scale: 0, rotate: -40, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: stamp, start: 'top 92%', once: true } });
    }

    /* =========================================================
       Page: CONTACT
       ========================================================= */
    function initContact() {
        const form = $('#contactForm'); if (!form) return;
        const submitBtn = $('#submitBtn'), submitText = $('.submit-text', submitBtn);
        const okEl = $('#formSuccess'), errEl = $('#formError'), waitEl = $('#formWait');
        // spam protection (honeypot, fill-time, cooldown, optional Turnstile)
        const TURNSTILE_SITE_KEY = '0x4AAAAAAFbJBI_gZfSlPYk9';
        const EMAILJS_SERVICE_ID = 'service_1d2bn0s';
        const EMAILJS_TEMPLATE_ID = 'template_freowjp';
        const MIN_FILL_MS = 3000, COOLDOWN_MS = 60 * 1000;
        const loadedAt = Date.now();
        let turnstileToken = '';
        if (TURNSTILE_SITE_KEY) {
            window.onTurnstileLoad = function () {
                turnstile.render('#turnstileBox', { sitekey: TURNSTILE_SITE_KEY, callback: t => { turnstileToken = t; }, 'expired-callback': () => { turnstileToken = ''; } });
            };
            const ts = document.createElement('script');
            ts.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'; ts.async = true; ts.defer = true;
            document.head.appendChild(ts);
        }
        const lastSentAt = () => { try { return Number(localStorage.getItem('contactLastSent')) || 0; } catch (e) { return 0; } };
        const markSent = () => { try { localStorage.setItem('contactLastSent', String(Date.now())); } catch (e) {} };
        const setLoading = on => { submitBtn.disabled = on; submitText.textContent = on ? 'Sending…' : 'Send message'; };
        const showMsg = (el, ms = 6000) => { el.classList.add('show'); setTimeout(() => el.classList.remove('show'), ms); };

        // char counter
        const msg = $('#message'), cnt = $('.count', msg.parentElement);
        if (msg && cnt) { const u = () => { cnt.textContent = msg.value.length + ' / ' + msg.maxLength; }; msg.addEventListener('input', u); u(); }

        form.addEventListener('submit', e => {
            e.preventDefault();
            [okEl, errEl, waitEl].forEach(x => x.classList.remove('show'));
            const sparkle = () => { const r = submitBtn.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top, 140); };
            if (form.website.value || Date.now() - loadedAt < MIN_FILL_MS) { form.reset(); showMsg(okEl); return; }
            if (Date.now() - lastSentAt() < COOLDOWN_MS) { showMsg(waitEl); return; }
            if (TURNSTILE_SITE_KEY && !turnstileToken) { showMsg(errEl, 6000); return; }
            if (typeof emailjs === 'undefined') { showMsg(errEl, 8000); return; }
            setLoading(true);
            emailjs.sendForm(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, form)
                .then(() => {
                    markSent();
                    if (TURNSTILE_SITE_KEY && window.turnstile) { turnstile.reset(); turnstileToken = ''; }
                    form.reset(); if (cnt) cnt.textContent = '0 / ' + msg.maxLength;
                    setLoading(false); showMsg(okEl); sparkle(); toast('Message sent — talk soon!');
                })
                .catch(err => { console.error('EmailJS error:', err); setLoading(false); showMsg(errEl, 8000); });
        });
        if (hasGSAP && !reduced) {
            gsap.from('.field', { y: 40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.9 });
            gsap.from('.info-row', { x: -40, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.7 });
            gsap.from('.social', { scale: 0, duration: 0.7, ease: 'back.out(2)', stagger: 0.07, delay: 1 });
        }
    }

    /* =========================================================
       Boot
       ========================================================= */
    function boot() {
        buildModals();
        setupTheme();
        setupNav();
        setupFooter();
        setupPalette();
        setupEasterEgg();
        setupScroll();
        setupTransitions();
        setupCursor();
        setupMagnetic();
        setupTilt();

        const intro = runPreloader();
        if (hasGSAP && !reduced && navEl) gsap.set(navEl, { yPercent: -110 });
        if (!hasGSAP || reduced) {
            if (navEl) navEl.classList.add('is-ready');
        } else if (page !== 'home') {
            intro.then(() => { showNav(); innerHeroIntro(); });
        }
        if (hasGSAP) {
            setupReveals();
            setupMarquees();
        }
        if (page === 'home') initHome(intro);
        if (page === 'projects') initProjects();
        if (page === 'about') initAbout();
        if (page === 'contact') initContact();
        if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 300);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
