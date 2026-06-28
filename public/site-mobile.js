/* =====================================================================
   Messianic Mandate — Shared mobile drawer navigation
   Builds an OK-style slide-in drawer (icon/title/subtitle cards, CTA,
   social row) and injects a hamburger trigger. Self-contained: works on
   every page regardless of that page's own nav markup.
   ===================================================================== */
(function () {
    if (window.__mmDrawerInit) return;
    window.__mmDrawerInit = true;

    // Navigation model — absolute (in-folder) links so the drawer behaves
    // identically from any page in /public.
    var NAV = [
        { t: 'Home',            s: 'Welcome & latest',        i: 'fa-house',           h: 'index.html#home' },
        { t: 'About',           s: 'Our story & beliefs',     i: 'fa-circle-info',     h: 'about_church.html' },
        { t: 'Ministries',      s: 'Dimensions of faith',     i: 'fa-hands-praying',   h: 'index.html#ministries' },
        { t: 'Calendar',        s: 'Feasts & appointed times',i: 'fa-calendar-day',    h: 'index.html#calendar' },
        { t: 'Weekly Torah',    s: 'Parashah readings',       i: 'fa-book-open',       h: 'index.html#torah' },
        { t: 'Watch Live',      s: 'Sermons & live stream',   i: 'fa-play',            h: 'watch.html' },
        { t: 'Prayer Request',  s: 'Submit to the Upper Room',i: 'fa-hand-holding-heart', h: 'prayer_request.html' },
        { t: 'Giving',          s: 'Partner & support',       i: 'fa-gift',            h: 'giving.html' },
        { t: 'Store',           s: 'Books & materials',       i: 'fa-bag-shopping',    h: 'items.html' },
        { t: 'Register',        s: 'Join / volunteer',        i: 'fa-user-plus',       h: 'register.html' }
    ];

    var SOCIAL = [
        { i: 'fa-facebook-f', h: 'https://facebook.com/messianicmovement', a: 'Facebook' },
        { i: 'fa-instagram',  h: 'https://instagram.com/messianicmovement', a: 'Instagram' },
        { i: 'fa-twitter',    h: 'https://twitter.com/messianicmvmt', a: 'Twitter / X' },
        { i: 'fa-youtube',    h: 'https://youtube.com/@messianicmovement', a: 'YouTube' }
    ];

    var LOGO = 'images/logowtb.png';

    function el(tag, cls, html) {
        var e = document.createElement(tag);
        if (cls) e.className = cls;
        if (html != null) e.innerHTML = html;
        return e;
    }

    function build() {
        // Burger
        var burger = el('button', null, '<span></span><span></span><span></span>');
        burger.id = 'mmBurger';
        burger.type = 'button';
        burger.setAttribute('aria-label', 'Open menu');

        // Backdrop
        var backdrop = el('div');
        backdrop.id = 'mmBackdrop';

        // Drawer
        var drawer = el('div');
        drawer.id = 'mmDrawer';
        drawer.setAttribute('role', 'dialog');
        drawer.setAttribute('aria-label', 'Site navigation');

        // Header
        var head = el('div', 'mm-head');
        head.innerHTML =
            '<div class="mm-head-logo"><img src="' + LOGO + '" alt="Messianic Mandate"></div>' +
            '<div class="mm-head-text">' +
                '<div class="mm-head-title">Messianic Mandate</div>' +
                '<div class="mm-head-sub">Powered by WHARM</div>' +
            '</div>';
        var closeBtn = el('button', 'mm-close', '<i class="fas fa-xmark"></i>');
        closeBtn.type = 'button';
        closeBtn.setAttribute('aria-label', 'Close menu');
        head.appendChild(closeBtn);
        drawer.appendChild(head);

        // NAVIGATE label + card list
        drawer.appendChild(el('div', 'mm-label', 'Navigate'));
        var nav = el('nav', 'mm-nav');
        NAV.forEach(function (n) {
            var a = el('a', 'mm-item');
            a.href = n.h;
            a.innerHTML =
                '<span class="mm-ic"><i class="fas ' + n.i + '"></i></span>' +
                '<span class="mm-tx"><span class="mm-tx-t">' + n.t + '</span>' +
                '<span class="mm-tx-s">' + n.s + '</span></span>' +
                '<i class="fas fa-chevron-right mm-chev"></i>';
            nav.appendChild(a);
        });
        drawer.appendChild(nav);

        // CTA card
        var cta = el('div', 'mm-cta');
        cta.innerHTML =
            '<span class="mm-cta-tag"><i class="fas fa-fire"></i> Join the Movement</span>' +
            '<div class="mm-cta-h">Walk in the Power of the Spirit.</div>' +
            '<p class="mm-cta-p">Add your voice to a global community of Spirit-filled believers.</p>' +
            '<a class="mm-cta-btn" href="register.html">Join Us <i class="fas fa-arrow-right"></i></a>';
        drawer.appendChild(cta);

        // FOLLOW label + social
        drawer.appendChild(el('div', 'mm-label', 'Follow the Movement'));
        var soc = el('div', 'mm-social');
        SOCIAL.forEach(function (s) {
            var a = el('a', null, '<i class="fab ' + s.i + '"></i>');
            a.href = s.h; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', s.a);
            soc.appendChild(a);
        });
        drawer.appendChild(soc);

        // Copyright
        drawer.appendChild(el('div', 'mm-copy',
            '&copy; ' + new Date().getFullYear() + ' Messianic Mandate &middot; Powered by WHARM'));

        document.body.appendChild(burger);
        document.body.appendChild(backdrop);
        document.body.appendChild(drawer);

        // ---- behaviour ----
        function open() {
            drawer.classList.add('mm-open');
            backdrop.classList.add('mm-open');
            document.body.classList.add('mm-locked');
            burger.setAttribute('aria-expanded', 'true');
        }
        function close() {
            drawer.classList.remove('mm-open');
            backdrop.classList.remove('mm-open');
            document.body.classList.remove('mm-locked');
            burger.setAttribute('aria-expanded', 'false');
        }

        burger.addEventListener('click', open);
        closeBtn.addEventListener('click', close);
        backdrop.addEventListener('click', close);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && drawer.classList.contains('mm-open')) close();
        });
        // Close after navigating to an in-page anchor on the current page
        nav.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () { setTimeout(close, 60); });
        });

        // Neutralise any legacy hamburger the page's own script injected
        document.querySelectorAll('.mobile-menu-toggle, .mobile-menu-btn').forEach(function (b) {
            b.style.display = 'none';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
