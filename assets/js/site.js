        'use strict';

        // === НАСТРОЙКИ САЙТА (верх файла — менять здесь) ===
        // TG_ENDPOINT: URL Cloudflare Worker (инструкция в TELEGRAM-SETUP.md).
        // Пустая строка: заказ показывается покупателю для ручной отправки в Telegram.
        const TG_ENDPOINT = '';
        // YM_ID: номер счётчика Яндекс.Метрики (число). Пример: const YM_ID = 12345678;
        const YM_ID = null; // TODO: номер счётчика Яндекс.Метрики

        // --- PRELOADER: показываем только при первом заходе в сессии, снимаем быстро ---
        (function() {
            const preloader = document.getElementById('preloader');
            if (!preloader) return;
            if (sessionStorage.getItem('woptics_intro')) {
                preloader.classList.add('hidden');
                return;
            }
            sessionStorage.setItem('woptics_intro', '1');
            const hide = () => preloader.classList.add('hidden');
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() { setTimeout(hide, 400); }, { once: true });
            } else {
                setTimeout(hide, 400);
            }
        })();

        // Уважение к настройкам пользователя (пониженное движение)
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // --- 3D ИНТЕГРАЦИЯ (THREE.JS) ---
        let scene, camera, renderer, shape, particles;
        let mouseX = 0, mouseY = 0;
        let scrollY = 0;
        let threeInitialized = false;

        function initThree() {
            // Защита: если THREE не загрузился — выходим без ошибок
            if (typeof THREE === 'undefined') {
                console.warn('Three.js не загрузился — фон останется статичным.');
                document.getElementById('bg-canvas').style.background =
                    'linear-gradient(135deg, #050510 0%, #0a1525 100%)';
                return;
            }

            const canvas = document.getElementById('bg-canvas');
            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 30;

            try {
                renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
            } catch (e) {
                console.warn('WebGL недоступен:', e);
                canvas.style.background = 'linear-gradient(135deg, #050510 0%, #0a1525 100%)';
                return;
            }
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const geometry = new THREE.IcosahedronGeometry(10, 1);
            const material = new THREE.MeshBasicMaterial({ color: 0x00f2ff, wireframe: true, transparent: true, opacity: 0.15 });
            shape = new THREE.Mesh(geometry, material);
            scene.add(shape);

            const partGeometry = new THREE.BufferGeometry();
            const partCount = 500;
            const posArray = new Float32Array(partCount * 3);
            for(let i=0; i < partCount * 3; i++) { posArray[i] = (Math.random() - 0.5) * 100; }
            partGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
            const partMaterial = new THREE.PointsMaterial({ size: 0.1, color: 0xffffff, transparent: true, opacity: 0.5 });
            particles = new THREE.Points(partGeometry, partMaterial);
            scene.add(particles);

            if (!prefersReducedMotion) {
                document.addEventListener('mousemove', (e) => {
                    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
                    mouseY = - (e.clientY / window.innerHeight) * 2 + 1;
                });
            }
            window.addEventListener('scroll', () => {
                const d = window.scrollY - scrollY;
                scrollY = window.scrollY;
                // вращение объекта от скролла
                if (shape && !prefersReducedMotion) shape.rotation.y += d * 0.0016;
            });
            window.addEventListener('resize', () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

            threeInitialized = true;
            animate();
        }

        function animate() {
            if (!threeInitialized) return;
            requestAnimationFrame(animate);
            shape.rotation.x += 0.002;
            shape.rotation.y += 0.003;
            if (!prefersReducedMotion) {
                camera.position.x += (mouseX * 5 - camera.position.x) * 0.05;
                camera.position.y += (mouseY * 5 - camera.position.y) * 0.05;
            }
            camera.lookAt(scene.position);
            shape.position.y = -scrollY * 0.01;
            particles.rotation.y = scrollY * 0.0005;
            renderer.render(scene, camera);
        }

        // --- 3D: ленивый запуск только на десктопе с нормальным соединением ---
        function canRender3D() {
            const conn = navigator.connection || {};
            const slowNet = conn.saveData || /(^|-)2g$|3g/.test(conn.effectiveType || '');
            return window.matchMedia('(min-width: 769px)').matches && !slowNet && !prefersReducedMotion;
        }
        function startThreeWhenReady() {
            const canvas = document.getElementById('bg-canvas');
            if (!canRender3D()) { canvas.classList.add('bg-static'); return; }
            if (typeof THREE !== 'undefined') { initThree(); return; }
            // defer-скрипт ещё грузится — ждём, с таймаутом
            let tries = 0;
            const wait = setInterval(() => {
                tries++;
                if (typeof THREE !== 'undefined' || tries > 50) {
                    clearInterval(wait);
                    if (typeof THREE !== 'undefined' && canRender3D()) initThree();
                    else canvas.classList.add('bg-static');
                }
            }, 100);
        }
        if (document.readyState === 'complete') {
            requestAnimationFrame(startThreeWhenReady);
        } else {
            window.addEventListener('load', function() { requestAnimationFrame(startThreeWhenReady); }, { once: true });
        }
        
        // --- BANNER CROSSFADE ---
        (function() {
            const banner1 = document.getElementById('banner1');
            const banner2 = document.getElementById('banner2');
            if (!banner1 || !banner2) return;
            let currentBanner = 1;

            function cycleBanners() {
                if (prefersReducedMotion) return;
                if (window.innerWidth > 768) { // Только на десктопе
                    if (currentBanner === 1) {
                        banner1.classList.remove('visible');
                        banner2.classList.add('visible');
                        currentBanner = 2;
                    } else {
                        banner1.classList.add('visible');
                        banner2.classList.remove('visible');
                        currentBanner = 1;
                    }
                }
            }
            setInterval(cycleBanners, 4000);
        })();

        // --- ПОЯВЛЕНИЕ ТЕКСТА ОТ СКРОЛА (заголовки по словам) ---
        document.querySelectorAll('h2.reveal').forEach(h2 => {
            const nodes = Array.from(h2.childNodes);
            h2.innerHTML = '';
            nodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    node.textContent.split(/(\s+)/).forEach(part => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { h2.appendChild(document.createTextNode(part)); return; }
                        const w = document.createElement('span');
                        w.className = 'rw';
                        w.textContent = part;
                        h2.appendChild(w);
                    });
                } else {
                    h2.appendChild(node);
                }
            });
            h2.classList.remove('reveal');
            h2.classList.add('rw-host');
        });

        // --- SCROLLTELLING ---
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                    if (entry.target.matches('.showcase-card, .review-card')) {
                        setTimeout(() => initTilt(entry.target), 1100);
                    }
                }
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

        // --- FAQ ---
        document.querySelectorAll('.faq-q').forEach(q => {
            q.addEventListener('click', () => q.parentElement.classList.toggle('active'));
        });

        // --- ПЛАВНАЯ ПРОКрутка по якорным ссылкам ---
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#' || !targetId) return;
                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: prefersReducedMotion ? 'auto' : 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // --- POPUP LOGIC ---
        const popupOverlay = document.getElementById('popupOverlay');
        function openPopup() {
            if (!popupOverlay) return;
            popupOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        function closePopup() {
            if (!popupOverlay) return;
            popupOverlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        // Экспорт в глобальную область видимости для inline-обработчиков
        window.openPopup = openPopup;
        window.closePopup = closePopup;

        if (popupOverlay) {
            popupOverlay.addEventListener('click', function(e) {
                if (e.target === popupOverlay) closePopup();
            });
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closePopup();
        });

        // === МАРШРУТ ОТПРАВКИ ЗАКАЗА В TELEGRAM (см. TG_ENDPOINT в начале файла) ===

        // === ЯНДЕКС.МЕТРИКА (см. YM_ID в начале файла) ===
        function trackGoal(name) {
            if (YM_ID && window.ym) {
                try { window.ym(YM_ID, 'reachGoal', name); } catch (e) { /* тихо */ }
            }
        }
        if (YM_ID) {
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
            ym(YM_ID, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});
        }

        // --- ORDER WIZARD: диоптрии → данные → оплата ---
        (function() {
            const PRICE = 2990;
            const form = document.getElementById('orderForm');
            if (!form) return;

            const stepPans = document.querySelectorAll('#osteps span');
            const stepBlocks = form.querySelectorAll('.ostep');
            const err2 = document.getElementById('oErr2');
            const err3 = document.getElementById('oErr3');

            // --- диоптрии: сотые доли, шаг 0.25, диапазон −12.00…+6.00 ---
            const dio = { r: 0, l: 0 };
            const fmtD = (v, ascii) => {
                const sign = v < 0 ? (ascii ? '-' : '\u2212') : v > 0 ? '+' : '';
                return sign + (Math.abs(v) / 100).toFixed(2);
            };
            const elR = document.getElementById('dioR');
            const elL = document.getElementById('dioL');
            const same = document.getElementById('dioSame');
            function renderDio() {
                elR.textContent = fmtD(dio.r, false);
                elL.textContent = fmtD(dio.l, false);
            }
            form.querySelectorAll('.dio-btn[data-eye]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const eye = btn.dataset.eye;
                    dio[eye] = Math.max(-1200, Math.min(600, dio[eye] + parseInt(btn.dataset.step, 10) * 25));
                    if (same.checked) dio[eye === 'r' ? 'l' : 'r'] = dio[eye];
                    renderDio();
                });
            });
            same.addEventListener('change', () => {
                if (same.checked) { dio.l = dio.r; renderDio(); }
            });

            // --- количество комплектов ---
            let qty = 1;
            const qtyVal = document.getElementById('qtyVal');
            document.getElementById('qtyMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); qtyVal.textContent = qty; });
            document.getElementById('qtyPlus').addEventListener('click', () => { qty = Math.min(9, qty + 1); qtyVal.textContent = qty; });

            // --- «не знаю диоптрии»: блокируем степеры ---
            const dioUnknown = document.getElementById('dioUnknown');
            dioUnknown.addEventListener('change', () => {
                form.querySelectorAll('.dio-btn[data-eye]').forEach(b => { b.disabled = dioUnknown.checked; });
            });

            // --- маска телефона +7 (999) 999-99-99 ---
            const phoneEl = document.getElementById('phone');
            phoneEl.addEventListener('input', () => {
                let d = phoneEl.value.replace(/\D/g, '');
                if (d.startsWith('8')) d = '7' + d.slice(1);
                if (d && !d.startsWith('7')) d = '7' + d;
                d = d.slice(0, 11);
                let out = '';
                if (d.length) out = '+7';
                if (d.length > 1) out += ' (' + d.slice(1, 4);
                if (d.length >= 4) out += ') ' + d.slice(4, 7);
                if (d.length >= 7) out += '-' + d.slice(7, 9);
                if (d.length >= 9) out += '-' + d.slice(9, 11);
                phoneEl.value = out;
            });

            // --- адрес доставки: обязателен для курьера и СДЭК/Почты, скрыт для самовывоза ---
            const addrGroup = document.getElementById('addrGroup');
            const addrEl = document.getElementById('addr');
            const deliveryName = () => (form.querySelector('input[name="delivery"]:checked') || {}).value || '';
            function syncAddr() {
                const need = deliveryName() !== 'Самовывоз в СПб';
                addrGroup.hidden = !need;
            }
            form.querySelectorAll('input[name="delivery"]').forEach(r => r.addEventListener('change', syncAddr));
            syncAddr();

            // --- шаги мастера ---
            let curStep = 1;
            function goStep(n) {
                curStep = n;
                stepBlocks.forEach(b => b.classList.toggle('on', Number(b.dataset.step) === n));
                stepPans.forEach((s, i) => s.classList.toggle('on', i === n - 1));
                const box = document.querySelector('.popup-content');
                if (box) box.scrollTop = 0;
                if (n === 3) fillSummary();
            }
            function validContacts() {
                const name = document.getElementById('name').value.trim();
                const phone = document.getElementById('phone').value.replace(/\D/g, '');
                const email = document.getElementById('email').value.trim();
                if (name.length < 2) { err2.textContent = 'Укажите имя (минимум 2 символа).'; return false; }
                if (phone.length !== 11) { err2.textContent = 'Проверьте номер телефона — нужно 11 цифр.'; return false; }
                if (email && !/^\S+@\S+\.\S+$/.test(email)) { err2.textContent = 'Проверьте адрес email.'; return false; }
                if (!addrGroup.hidden && addrEl.value.trim().length < 5) { err2.textContent = 'Укажите адрес доставки — без него заказ не собрать.'; return false; }
                if (!document.getElementById('pdConsent').checked) { err2.textContent = 'Чтобы оформить заказ, подтвердите согласие на обработку данных.'; return false; }
                err2.textContent = '';
                return true;
            }
            form.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => {
                const n = Number(b.dataset.next);
                if (n === 3 && !validContacts()) return;
                if (n === 2) trackGoal('step_dioptries');
                if (n === 3) trackGoal('step_contacts');
                goStep(n);
            }));
            form.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => {
                err2.textContent = '';
                err3.textContent = '';
                goStep(Number(b.dataset.back));
            }));

            // --- сбор и оформление заказа ---
            const money = v => v.toLocaleString('ru-RU') + ' \u20BD';
            function collectOrder() {
                const del = form.querySelector('input[name="delivery"]:checked');
                return {
                    oid: 'W-' + Date.now().toString(36).toUpperCase().slice(-4) + '-' + Math.floor(10 + Math.random() * 89),
                    name: document.getElementById('name').value.trim(),
                    phone: document.getElementById('phone').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    dioR: dioUnknown.checked ? '' : fmtD(dio.r, true),
                    dioL: dioUnknown.checked ? '' : fmtD(dio.l, true),
                    dioUnknown: dioUnknown.checked,
                    qty: qty,
                    delivery: del ? del.value : '',
                    addr: addrGroup.hidden ? '' : addrEl.value.trim(),
                    comment: document.getElementById('comment').value.trim(),
                    total: PRICE * qty,
                    consent: document.getElementById('pdConsent').checked,
                    consentTs: new Date().toISOString(),
                    page: location.href,
                    ts: new Date().toLocaleString('ru-RU')
                };
            }
            function escapeHtml(s) {
                return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
            }
            function fillSummary() {
                const o = collectOrder();
                const rows = [
                    ['Имя', o.name],
                    ['Телефон', o.phone]
                ];
                if (o.email) rows.push(['Email', o.email]);
                rows.push(
                    ['Диоптрии', o.dioUnknown ? 'не знает — нужна помощь' : 'правый ' + o.dioR + ' D'],
                    ['', o.dioUnknown ? '' : 'левый ' + o.dioL + ' D'],
                    ['Комплектов', String(o.qty)],
                    ['Доставка', o.delivery]
                );
                if (o.addr) rows.push(['Адрес', o.addr]);
                if (o.comment) rows.push(['Комментарий', o.comment]);
                let html = rows.map(r => '<div><span>' + escapeHtml(r[0]) + '</span><b>' + escapeHtml(r[1]) + '</b></div>').join('');
                html += '<div class="o-total"><span>Итого (товары)</span><b>' + money(o.total) + '</b></div>';
                document.getElementById('oSummary').innerHTML = html;
            }
            function orderText(o) {
                return [
                    'ЗАЯВКА ' + o.oid + ' (W OPTICS)',
                    'Имя: ' + o.name,
                    'Телефон: ' + o.phone,
                    o.email ? 'Email: ' + o.email : null,
                    'Диоптрии: ' + (o.dioUnknown ? 'не знает, нужна помощь' : 'правый ' + o.dioR + ' D, левый ' + o.dioL + ' D'),
                    'Комплектов: ' + o.qty,
                    'Линзы: обычные сферические, без специальных покрытий',
                    'Рецепт и межзрачковое расстояние: уточнить перед изготовлением',
                    'Доставка: ' + o.delivery,
                    o.addr ? 'Адрес: ' + o.addr : null,
                    o.comment ? 'Комментарий: ' + o.comment : null,
                    'Согласие на ПД: да, ' + o.consentTs,
                    'Сумма (товары): ' + money(o.total)
                ].filter(Boolean).join('\n');
            }

            // --- отправка + экран оплаты ---
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                // Enter на шаге 2 не должен отправлять заказ мимо проверки
                if (curStep !== 3) {
                    if (validContacts()) goStep(3);
                    return;
                }
                if (!validContacts()) { goStep(2); return; }
                // honeypot: заполнено — бот, молча не отправляем
                if (form.querySelector('input[name="company"]').value) {
                    document.getElementById('oErr3').textContent = 'Не удалось отправить заказ. Позвоните или напишите нам в Telegram.';
                    return;
                }
                const btn = document.getElementById('oSubmit');
                btn.disabled = true;
                const submitLabel = btn.textContent;
                btn.textContent = TG_ENDPOINT ? 'Отправляем\u2026' : 'Готовим заявку\u2026';
                const o = collectOrder();
                let sent = false;
                if (TG_ENDPOINT) {
                    try {
                        const r = await fetch(TG_ENDPOINT, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(o),
                            signal: AbortSignal.timeout(12000)
                        });
                        const result = await r.json();
                        sent = r.ok && result.ok === true;
                    } catch (e2) { sent = false; }
                }
                btn.disabled = false;
                btn.textContent = submitLabel;
                document.getElementById('oCheckWrap').hidden = true;
                document.getElementById('payBox').hidden = false;
                document.getElementById('sentBox').hidden = !sent;
                document.getElementById('fallbackBox').hidden = sent;
                if (!sent) document.getElementById('fbText').value = orderText(o);
                document.getElementById('payOid').textContent = o.oid;
                document.getElementById('paySum').textContent = money(o.total);
                // цели метрики: доставка/адрес видны на экране подтверждения
                trackGoal(sent ? 'order_sent' : 'order_prepared');
            });

            // --- копирование текста заказа (ручной режим) ---
            document.getElementById('fbCopy').addEventListener('click', function() {
                const ta = document.getElementById('fbText');
                const done = () => {
                    trackGoal('order_copy');
                    this.textContent = 'Скопировано ✓';
                    setTimeout(() => { this.textContent = 'Скопировать заказ'; }, 2000);
                };
                const manualCopy = () => {
                    ta.focus();
                    ta.select();
                    try {
                        if (document.execCommand('copy')) { done(); return; }
                    } catch (error) { /* Keep selected text for manual copying. */ }
                    this.textContent = 'Выделите и скопируйте текст';
                };
                ta.select();
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(ta.value).then(done, manualCopy);
                } else { manualCopy(); }
            });

            // --- QR: нет картинки — скрываем блок QR полностью, оставляем Telegram-альтернативу ---
            const qrImg = document.getElementById('qrImg');
            const qrFallback = function() {
                const wrap = document.getElementById('qrWrap');
                if (wrap) wrap.style.display = 'none';
                const h = document.getElementById('qrTitle');
                if (h) h.style.display = 'none';
                const note = document.getElementById('payNoteSbp');
                if (note) note.style.display = 'none';
                const alt = document.getElementById('payAltNote');
                if (alt) alt.style.display = 'block';
            };
            if (qrImg) {
                qrImg.addEventListener('error', qrFallback);
                if (qrImg.complete && qrImg.naturalWidth === 0) qrFallback();
            }

            // --- при каждом открытии попапа — шаг 1 (цель open_form — один раз за сессию) ---
            const origOpen = window.openPopup;
            let openFormTracked = false;
            window.openPopup = function() {
                err2.textContent = '';
                err3.textContent = '';
                document.getElementById('oCheckWrap').hidden = false;
                document.getElementById('payBox').hidden = true;
                goStep(1);
                if (!openFormTracked) { trackGoal('open_form'); openFormTracked = true; }
                if (origOpen) origOpen();
            };
        })();

        // --- BOTTOM NAV ACTIVE STATE ---
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('section');

        function updateNav() {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                if (pageYOffset >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });

            navItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('href') === `#${current}`) {
                    item.classList.add('active');
                }
            });
        }
        // throttle через requestAnimationFrame для производительности
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    updateNav();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // --- КНОПКА TOP (наверх) ---
        (function() {
            const toTop = document.getElementById('toTop');
            if (!toTop) return;
            const toggleTop = () => toTop.classList.toggle('visible', pageYOffset > 600);
            window.addEventListener('scroll', toggleTop, { passive: true });
            toggleTop();
            toTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            });
        })();

        // --- ЦЕЛИ ПО КЛИКАМ: телефон и Telegram ---
        document.addEventListener('click', function(e) {
            const a = e.target.closest('a[href]');
            if (!a) return;
            const href = a.getAttribute('href');
            if (href.startsWith('tel:')) trackGoal('phone_click');
            else if (href.includes('t.me')) trackGoal('tg_click');
        }, { passive: true });

        // --- СЕКЦИИ ПЛАВНО ПОЯВЛЯЮТСЯ ПРИ СКРОЛЛЕ ---
        document.querySelectorAll('section:not(#hero)').forEach(s => s.classList.add('sec'));
        if (prefersReducedMotion) {
            document.querySelectorAll('.sec').forEach(s => s.classList.add('sec-in'));
        } else {
            const secObs = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        e.target.classList.add('sec-in');
                        secObs.unobserve(e.target);
                    }
                });
            }, { threshold: 0.12 });
            document.querySelectorAll('.sec').forEach(s => secObs.observe(s));
        }

        // --- СЛОЁНЫЙ ПАРАЛАКС + ПОЯВЛЕНИЕ ТЕКСТА (общий скролл-кадр) ---
        const pxEls = Array.from(document.querySelectorAll('[data-px]'));
        const rwHosts = Array.from(document.querySelectorAll('.rw-host'));

        function updateParallax() {
            if (prefersReducedMotion) return;
            const vh = window.innerHeight;
            pxEls.forEach(el => {
                const r = el.getBoundingClientRect();
                if (r.bottom < -300 || r.top > vh + 300) return;
                const center = r.top + r.height / 2 - vh / 2;
                const speed = parseFloat(el.dataset.px) || 0;
                el.style.transform = 'translate3d(0,' + (-center * speed).toFixed(1) + 'px,0)';
            });
        }

        function updateWords() {
            const vh = window.innerHeight;
            rwHosts.forEach(h => {
                const r = h.getBoundingClientRect();
                if (r.bottom < -100 || r.top > vh + 150) return;
                const p = Math.max(0, Math.min(1, (vh * 0.88 - r.top) / (vh * 0.42)));
                const words = h.querySelectorAll('.rw');
                const n = words.length;
                words.forEach((w, i) => {
                    const start = (i / Math.max(n, 1)) * 0.55;
                    const wp = Math.max(0, Math.min(1, (p - start) / 0.35));
                    w.style.opacity = (0.1 + 0.9 * wp).toFixed(3);
                    w.style.transform = wp >= 1 ? '' : 'translateY(' + ((1 - wp) * 0.4).toFixed(3) + 'em)';
                });
            });
        }

        if (prefersReducedMotion) {
            document.querySelectorAll('.rw').forEach(w => { w.style.opacity = 1; });
        }
        let fxTicking = false;
        function fxFrame() {
            updateParallax();
            updateWords();
            fxTicking = false;
        }
        window.addEventListener('scroll', () => {
            if (!fxTicking) {
                fxTicking = true;
                requestAnimationFrame(fxFrame);
            }
        }, { passive: true });
        window.addEventListener('resize', fxFrame);
        fxFrame();

        // --- НАВОДЯЩИЕСЯ КАРТОЧКИ (3D-наклон к курсору) ---
        function initTilt(el) {
            if (prefersReducedMotion || el.dataset.tilt) return;
            el.dataset.tilt = '1';
            el.classList.add('tilt');
            el.addEventListener('mousemove', e => {
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                el.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
                el.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg');
            });
            el.addEventListener('mouseleave', () => {
                el.style.setProperty('--rx', '0deg');
                el.style.setProperty('--ry', '0deg');
            });
        }
