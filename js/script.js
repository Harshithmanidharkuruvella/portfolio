const TOTAL = 189;

// The leadership journey — shown one at a time for maximum impact
const CHAPTERS = [
  { start:1,   end:32,  num:"01", title:"The Spark",      
    body:"It started in a classroom. A student member of a small tech club at VIT-AP, quietly absorbing everything — hackathons, late-night sprints, the first taste of building." },
  { start:33,  end:64,  num:"02", title:"The Rise",       
    body:"From member to Technical Lead of Innovators' Quest. Organizing workshops, mentoring juniors, and architecting the club's first major technical events." },
  { start:65,  end:96,  num:"03", title:"The Arena",      
    body:"Hackathon after hackathon. Pitching under pressure, prototyping at 3 AM, winning against teams twice our size. National-level victories that proved vision outruns experience." },
  { start:97,  end:128, num:"04", title:"The Network",    
    body:"Connecting with founders, investors, and builders. Every conversation sharpened the instinct — learning what separates ideas that ship from ideas that stall." },
  { start:129, end:160, num:"05", title:"The Presidency", 
    body:"Elected President of Innovators' Quest. Leading 100+ members, scaling the club into a launchpad for student innovation, research, and entrepreneurship." },
  { start:161, end:189, num:"06", title:"The Founder",    
    body:"Built Upfront — a startup that helps student entrepreneurs ship their first MVP at zero upfront cost. From club member to company founder. The journey continues." },
];

// ── Hardware Accelerated Canvas ──
const canvas = document.getElementById('filmstripCanvas');
const context = canvas ? canvas.getContext('2d') : null;
const images = [];

if (canvas) {
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    renderFrame(lastFrame);
  }
  window.addEventListener('resize', resizeCanvas);

  for (let i = 1; i <= TOTAL; i++) {
    const img = new Image();
    img.src = `assets/frames/${String(i).padStart(4, '0')}.jpg`;
    img.onload = () => { if (i === 1) resizeCanvas(); };
    images.push(img);
  }
}

function renderFrame(index) {
  if (!context || index < 1 || index > TOTAL) return;
  const img = images[index - 1];
  if (!img || !img.complete) return;

  const cR = canvas.width / canvas.height;
  const iR = img.width / img.height;
  let dw = canvas.width, dh = canvas.height, ox = 0, oy = 0;

  if (iR > cR) { dw = canvas.height * iR; ox = (canvas.width - dw) / 2; }
  else { dh = canvas.width / iR; oy = (canvas.height - dh) / 2; }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, ox, oy, dw, dh);
}

// ── Scroll Engine ──
let lastFrame = 1;
let activeChIdx = -1;

const scroller    = document.getElementById('filmstripScroller');
const fProgress   = document.getElementById('fProgress');
const fScrollHint = document.getElementById('fScrollHint');

// Overlay elements
const textDisplay  = document.getElementById('cineTextDisplay');
const chNumEl      = document.getElementById('cineChapterNum');
const chTitleEl    = document.getElementById('cineChapterTitle');
const chBodyEl     = document.getElementById('cineChapterBody');

function chapterOf(f) {
  return CHAPTERS.findIndex(c => f >= c.start && f <= c.end);
}

function showChapter(idx) {
  if (idx === activeChIdx || idx < 0 || idx >= CHAPTERS.length) return;
  const ch = CHAPTERS[idx];

  // Transition out
  if (textDisplay) textDisplay.classList.add('is-transitioning');

  // Swap and transition in
  setTimeout(() => {
    if (chNumEl)   chNumEl.textContent   = ch.num;
    if (chTitleEl) chTitleEl.textContent  = ch.title;
    if (chBodyEl)  chBodyEl.textContent   = ch.body;
    if (textDisplay) textDisplay.classList.remove('is-transitioning');
  }, 300);

  activeChIdx = idx;
}

function onScroll() {
  if (!scroller) return;
  const rect     = scroller.getBoundingClientRect();
  const scrolled = -rect.top;
  const total    = scroller.offsetHeight - window.innerHeight;
  if (total <= 0) return;
  const progress = Math.max(0, Math.min(1, scrolled / total));

  // Update progress bar
  if (fProgress) fProgress.style.width = (progress * 100).toFixed(2) + '%';

  // Frame calculation
  const frameIdx = Math.max(1, Math.min(TOTAL, Math.round(progress * (TOTAL - 1)) + 1));

  // Performance render
  if (frameIdx !== lastFrame) {
    renderFrame(frameIdx);
    lastFrame = frameIdx;
  }

  // Chapter logic
  const newCh = chapterOf(frameIdx);
  if (newCh !== -1) showChapter(newCh);

  // Hide scroll hint
  if (progress > 0.05 && fScrollHint) fScrollHint.classList.add('hidden');
  else if (progress <= 0.05 && fScrollHint) fScrollHint.classList.remove('hidden');
}

window.addEventListener('scroll', () => {
  requestAnimationFrame(onScroll);
}, { passive: true });

// Nav logic
const nav = document.getElementById('mainNav');
const heroImg = document.getElementById('heroImg');

window.addEventListener('scroll', () => {
  if (nav) {
    nav.classList.toggle('scrolled', window.scrollY > 60);
    if (scroller) {
      const rect = scroller.getBoundingClientRect();
      if (rect.top <= 60 && rect.bottom >= 60) nav.classList.add('nav-hidden');
      else nav.classList.remove('nav-hidden');
    }
  }
  if (heroImg && window.scrollY < window.innerHeight) {
    heroImg.style.transform = `scale(1.05) translateY(${window.scrollY * 0.15}px)`;
  }
}, { passive: true });

// Reveal on scroll
const reveals = document.querySelectorAll('.reveal');
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.15 });
reveals.forEach(el => revObs.observe(el));

// ── Smoky Scroll Animation ──
const smokeSection = document.getElementById('about');
const smokeLayers = document.querySelectorAll('.smoke-layer');

if (smokeSection && smokeLayers.length > 0) {
  window.addEventListener('scroll', () => {
    const rect = smokeSection.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    if (rect.top < windowHeight && rect.bottom > 0) {
      // Calculate scroll progress through the section
      const reachTop = rect.top;
      const progress = 1 - (reachTop / windowHeight);
      
      smokeLayers.forEach((layer, i) => {
        const speed = (i + 1) * 15;
        const drift = Math.sin(progress * 2) * 20;
        layer.style.transform = `translate(${drift}px, ${progress * speed}px) scale(${1 + progress * 0.15}) rotate(${progress * 10}deg)`;
      });
    }
  });
}

// Start first chapter
setTimeout(() => showChapter(0), 1000);


