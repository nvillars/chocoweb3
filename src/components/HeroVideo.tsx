// TODO: If you later switch to multiple hero files use patterns like
// const desktopPlaylist = ['/videos/hero-desktop-1.mp4','/videos/hero-desktop-2.mp4']
// const mobilePlaylist = ['/videos/hero-mobile-1.mp4','/videos/hero-mobile-2.mp4']
// and update the arrays below accordingly.

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useRouter } from "next/navigation";
import styles from "./HeroVideo.module.css";

const desktopPlaylist = ["/videos/video1.mp4", "/videos/video2.mp4"];
const mobilePlaylist = ["/videos/video1.mp4", "/videos/video2.mp4"];

export default function HeroVideo(): React.ReactElement {
  // two layered video elements to enable smooth crossfade transitions
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoRefBack = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  // cache HEAD results for .webm existence to avoid repeated 404s
  const webmCacheRef = useRef<Record<string, boolean>>({});

  // restore cache from localStorage if present (persist across sessions)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('webmCache');
      if (raw) webmCacheRef.current = JSON.parse(raw);
    } catch (e) {}
    // persist periodically and on unload
    const save = () => {
      try { localStorage.setItem('webmCache', JSON.stringify(webmCacheRef.current)); } catch (e) {}
    };
    const id = setInterval(save, 5000);
    window.addEventListener('beforeunload', save);
    return () => { clearInterval(id); window.removeEventListener('beforeunload', save); };
  }, []);
  const mqlRef = useRef<MediaQueryList | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => false);
  const [currentPlaylist, setCurrentPlaylist] = useState<string[]>(isMobile ? mobilePlaylist : desktopPlaylist);
  const [index, setIndex] = useState<number>(0);
  const [showPlayButton, setShowPlayButton] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false);

  // Try to prefer .webm if present. Returns a usable src string (either webm or mp4)
  async function pickSource(mp4: string) {
    const webm = mp4.replace(/\.mp4$/i, ".webm");
    const cache = webmCacheRef.current;
    if (cache[webm] !== undefined) {
      return cache[webm] ? webm : mp4;
    }
    try {
      const res = await fetch(webm, { method: "HEAD" });
      cache[webm] = !!res.ok;
      return res.ok ? webm : mp4;
    } catch (e) {
      cache[webm] = false;
      return mp4;
    }
  }

  // Play the video at playlist index i
  // playIndex now loads the next clip into the background layer, crossfades,
  // and preloads the following clip. This avoids showing an empty frame between clips.
  async function playIndex(i: number) {
    const front = videoRef.current;
    const back = videoRefBack.current;
    if (!front || !back) return;

    setShowPlayButton(false);

    const src = await pickSource(currentPlaylist[i]);

    // load the new clip into the back layer so we can crossfade to it
    back.src = src;
    try {
      back.load();
      const p = back.play();
      if (p && typeof p.then === "function") {
        await p;
      }
    } catch (err) {
      // autoplay prevented - show play button for user
      setShowPlayButton(true);
    }

    // after back started, crossfade: make back visible and front hidden
    const backEl = back;
    const frontEl = front;
    // add active class to back and remove from front to trigger CSS transition
      try {
      const layerActive = (styles as Record<string, string>)['hero__layerActive'];
      if (layerActive) backEl.classList.add(layerActive);
      const frontActive = (styles as Record<string, string>)['hero__layerActive'];
      if (frontActive) frontEl.classList.remove(frontActive);
    } catch (e) {
      // if class toggling fails silently continue
    }

    // after transition completes, pause and clear the old front and swap the ref.current pointers
    setTimeout(() => {
      try {
        frontEl.pause();
        frontEl.removeAttribute("src");
        frontEl.load();
      } catch (e) {
        // noop
      }
      // swap the current pointers so next playIndex treats the visible element as front
      const tmp = videoRef.current;
      videoRef.current = videoRefBack.current;
      videoRefBack.current = tmp;
    }, 800); // slightly longer than transition to ensure visual stability

    // preload next clip lightly off-DOM
    const nextIndex = (i + 1) % currentPlaylist.length;
    const nextSrc = await pickSource(currentPlaylist[nextIndex]);
    try {
      const pre = document.createElement("video");
      pre.preload = "metadata";
      pre.src = nextSrc;
    } catch (e) {
      // noop
    }
  }

  // Advance to next clip
  function advanceToNext() {
    setIndex((prev) => {
      const next = (prev + 1) % currentPlaylist.length;
      return next;
    });
  }

  useEffect(() => {
    const front = videoRef.current;
    const back = videoRefBack.current;
    if (!front && !back) return;

    function onEnded() {
      advanceToNext();
    }

    function onError() {
      // skip to next on media error
      advanceToNext();
    }

    [front, back].forEach((el) => {
      if (!el) return;
      el.addEventListener("ended", onEnded);
      el.addEventListener("error", onError);
    });

    return () => {
      [front, back].forEach((el) => {
        if (!el) return;
        el.removeEventListener("ended", onEnded);
        el.removeEventListener("error", onError);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, currentPlaylist]);

  // when index changes, play that clip (unless reduced motion)
  useEffect(() => {
  const v = videoRef.current;
  if (!v) return;
    if (reducedMotion) {
      // do not autoplay when user prefers reduced motion
      v.pause();
      v.removeAttribute("src");
      v.load();
      return;
    }
  playIndex(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, currentPlaylist, reducedMotion]);

  // matchMedia listener for device breakpoint
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 768px)");
    mqlRef.current = mql;
    // set initial value
    setIsMobile(!!mql.matches);
    function onChange(e: MediaQueryListEvent) {
      const nowMobile = !!e.matches;
      // if the value actually changed
      if (nowMobile !== isMobile) {
        setIsMobile(nowMobile);
        // switch playlists immediately
        setCurrentPlaylist(nowMobile ? mobilePlaylist : desktopPlaylist);
        setIndex(0);
        // attempt to play the new first clip immediately
        const v = videoRef.current;
        if (v && !reducedMotion) {
          // fire and forget
          pickSource((nowMobile ? mobilePlaylist : desktopPlaylist)[0]).then((s) => {
            v.src = s;
            v.load();
            v.play().catch(() => setShowPlayButton(true));
          }).catch(() => {});
        }
      }
    }
    // add listener
    type LegacyListener = (this: MediaQueryList, ev: MediaQueryListEvent) => void;
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", onChange);
    } else if (typeof mql.addListener === "function") {
      // older browsers - cast the fn to the legacy signature
      (mql as unknown as { addListener: (l: LegacyListener) => void }).addListener(onChange as LegacyListener);
    }

    return () => {
      if (!mql) return;
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", onChange);
      } else if (typeof mql.removeListener === "function") {
        (mql as unknown as { removeListener: (l: LegacyListener) => void }).removeListener(onChange as LegacyListener);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Measure header height and apply as top offset to the hero container on small screens.
  // This avoids relying on hardcoded paddings and prevents overlap when the header height changes.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 768px)');

    function applyHeaderOffset() {
      const el = containerRef.current;
      if (!el) return;
      // only apply on small screens
      if (!mql.matches) {
        el.style.paddingTop = '';
        return;
      }
      // find the header element (role banner or fixed header)
      const header = document.querySelector('header[role="banner"]') || document.querySelector('header');
      const headerHeight = header ? (header as HTMLElement).offsetHeight : 0;
      // add a small buffer to avoid any visual collision
      const buffer = 10; // px
      el.style.paddingTop = `${headerHeight + buffer}px`;
    }

    // apply immediately
    applyHeaderOffset();

    // re-apply on resize and when media query changes
    const onResize = () => requestAnimationFrame(applyHeaderOffset);
    window.addEventListener('resize', onResize);

    const mqlAny = mql as MediaQueryList & {
      addListener?: (l: (e: MediaQueryListEvent) => void) => void;
      removeListener?: (l: (e: MediaQueryListEvent) => void) => void;
      addEventListener?: (type: string, listener: (e: MediaQueryListEvent) => void) => void;
      removeEventListener?: (type: string, listener: (e: MediaQueryListEvent) => void) => void;
    };

    if (typeof mqlAny.addEventListener === 'function') mqlAny.addEventListener('change', applyHeaderOffset);
    else if (typeof mqlAny.addListener === 'function') mqlAny.addListener(applyHeaderOffset);

    return () => {
      window.removeEventListener('resize', onResize);
      if (typeof mqlAny.removeEventListener === 'function') mqlAny.removeEventListener('change', applyHeaderOffset);
      else if (typeof mqlAny.removeListener === 'function') mqlAny.removeListener(applyHeaderOffset);
      // cleanup inline style
      if (containerRef.current) containerRef.current.style.paddingTop = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // intersection observer to pause/play when out of view
  useEffect(() => {
    const el = containerRef.current;
    const v = videoRef.current;
    if (!el || !v) return;
    const o = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.intersectionRatio >= 0.25) {
          // in view
          if (!reducedMotion) {
            v.play().catch(() => setShowPlayButton(true));
          }
        } else {
          v.pause();
        }
      });
    }, { threshold: [0, 0.25, 1] });
    o.observe(el);
    return () => o.disconnect();
  }, [reducedMotion]);

  // update currentPlaylist when breakpoint is checked on mount
  useEffect(() => {
    setCurrentPlaylist(isMobile ? mobilePlaylist : desktopPlaylist);
    setIndex(0);
    // try to set initial src preferring webm when available
    const init = async () => {
      try {
        const first = (isMobile ? mobilePlaylist : desktopPlaylist)[0];
        const s = await pickSource(first);
        const v = videoRef.current;
        if (v) {
          v.src = s;
          // load but don't force play here; playIndex or intersection observer will handle playback
          v.load();
        }
      } catch (e) {}
    };
    init();
    // update reduced motion live preference
    if (typeof window !== "undefined") {
      const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(!!rm.matches);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleManualPlay() {
    const v = videoRef.current;
    if (!v) return;
    v.play().then(() => setShowPlayButton(false)).catch(() => setShowPlayButton(true));
  }

  return (
    <section ref={(el) => { containerRef.current = el; }} className={styles.hero} data-active="front">
      {/* front layer (visible) */}
      <video
        id="heroVideoFront"
        ref={videoRef}
        className={`${styles.hero__video} ${styles.hero__layer} ${styles.hero__layerActive}`}
        autoPlay={!reducedMotion}
        muted
        playsInline
        preload="metadata"
        poster="/assets/hero-poster.jpg"
        width={1920}
        height={1080}
        aria-label="Video de chocolate artesanal"
      />

      {/* back layer (hidden until crossfade) */}
      <video
        id="heroVideoBack"
        ref={videoRefBack}
        className={`${styles.hero__video} ${styles.hero__layer}`}
        muted
        playsInline
        preload="metadata"
    aria-hidden="true"
    poster="/assets/hero-poster.jpg"
        width={1920}
        height={1080}
      />

      <div className={styles.hero__overlay}>
        <div>
          <h1>Chocolate artesanal hecho a mano</h1>
          {/* Show CTA only when not admin. If no user (guest) show it; if user.role === 'user' show it; hide for admin */}
          <CTA />
        </div>
      </div>

      {showPlayButton && (
        <div className={styles.hero__playButtonWrap}>
          <button className={styles.hero__playButton} onClick={handleManualPlay} aria-label="Reproducir video">
            Reproducir
          </button>
        </div>
      )}
    </section>
  );
}

  function CTA() {
    // small client-only component so we can use hooks
    const { user } = useAuth();
    const cart = useCart();
    const router = useRouter();

    // hide CTA for admin role explicitly
    if (user && user.role === 'admin') return null;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      try {
        const total = cart.getTotalItems();
        if (!total || total <= 0) {
          // redirect to product list when cart empty
          router.push('/productos');
        } else {
          // redirect to checkout/cart when there are items
          router.push('/checkout');
        }
      } catch (err) {
        // fallback: go to products
        router.push('/productos');
      }
    };

    return (
      <a href="#" onClick={handleClick} className={styles.hero__cta}>Compra ahora</a>
    );
  }
