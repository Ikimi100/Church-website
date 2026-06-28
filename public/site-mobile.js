/* =====================================================================
   Messianic Mandate — Shared mobile navigation (simple + reliable)
   A hamburger fixed in the header corner opens a clean opaque dropdown
   anchored just under the header. Self-contained; works on every page.
   ===================================================================== */
(function () {
    if (window.__smNavInit) return;
    window.__smNavInit = true;

    var LINKS = [
        { t: 'Home',           i: 'fa-house',              h: 'index.html#home' },
        { t: 'About',          i: 'fa-circle-info',        h: 'about_church.html' },
        { t: 'Ministries',     i: 'fa-hands-praying',      h: 'index.html#ministries' },
        { t: 'Calendar',       i: 'fa-calendar-day',       h: 'index.html#calendar' },
        { t: 'Weekly Torah',   i: 'fa-book-open',          h: 'index.html#torah' },
        { t: 'Watch Live',     i: 'fa-play',               h: 'watch.html' },
        { t: 'Prayer Request', i: 'fa-hand-holding-heart', h: 'prayer_request.html' },
        { t: 'Giving',         i: 'fa-gift',               h: 'giving.html' },
        { t: 'Store',          i: 'fa-bag-shopping',       h: 'items.html' },
        { t: 'Register',       i: 'fa-user-plus',          h: 'register.html' }
    ];

    function build() {
        var burger = document.createElement('button');
        burger.id = 'smBurger';
        burger.type = 'button';
        burger.setAttribute('aria-label', 'Open menu');
        burger.setAttribute('aria-expanded', 'false');
        burger.innerHTML = '<span></span><span></span><span></span>';

        var menu = document.createElement('div');
        menu.id = 'smMenu';
        menu.setAttribute('role', 'navigation');
        LINKS.forEach(function (l) {
            var a = document.createElement('a');
            a.className = 'smItem';
            a.href = l.h;
            a.innerHTML = '<i class="fas ' + l.i + '"></i>' + l.t;
            menu.appendChild(a);
        });
        var cta = document.createElement('a');
        cta.className = 'smItem smCta';
        cta.href = 'register.html';
        cta.innerHTML = '<i class="fas fa-fire"></i> Join the Movement';
        menu.appendChild(cta);

        document.body.appendChild(menu);
        document.body.appendChild(burger);

        // Anchor the menu just below the page header (fall back to the
        // burger's own position when no visible header is found).
        function position() {
            var header = document.querySelector(
                '#navbar, nav, header, .study-nav, .watch-header');
            var top = 60;
            if (header) {
                var r = header.getBoundingClientRect();
                if (r.height > 0 && r.bottom > 0) top = Math.round(r.bottom);
            }
            if (top < 52) top = 52;
            menu.style.top = top + 'px';
            menu.style.maxHeight = 'calc(100vh - ' + top + 'px)';
        }

        function open() {
            position();
            menu.classList.add('open');
            burger.classList.add('active');
            document.body.classList.add('sm-locked');
            burger.setAttribute('aria-label', 'Close menu');
            burger.setAttribute('aria-expanded', 'true');
        }
        function close() {
            menu.classList.remove('open');
            burger.classList.remove('active');
            document.body.classList.remove('sm-locked');
            burger.setAttribute('aria-label', 'Open menu');
            burger.setAttribute('aria-expanded', 'false');
        }
        function toggle() { menu.classList.contains('open') ? close() : open(); }

        burger.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
        menu.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', close);
        });
        document.addEventListener('click', function (e) {
            if (menu.classList.contains('open') &&
                !menu.contains(e.target) && e.target !== burger && !burger.contains(e.target)) {
                close();
            }
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menu.classList.contains('open')) close();
        });
        window.addEventListener('resize', function () {
            if (menu.classList.contains('open')) position();
        });

        // Remove any legacy hamburgers injected by per-page scripts
        document.querySelectorAll('.mobile-menu-toggle, .mobile-menu-btn, .mm-burger').forEach(function (b) {
            b.style.display = 'none';
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
