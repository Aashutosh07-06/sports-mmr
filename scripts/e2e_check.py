"""End-to-end browser check + screenshot generator (Playwright, headless Chromium).

Requires the backend (port 8000) and frontend (port 5173) to be running.
    python scripts/e2e_check.py            # run checks, save screenshots to docs/screenshots
    python scripts/e2e_check.py --quick    # skip mobile screenshots

What it verifies (real UI -> real API -> real model):
  * every page renders without console errors
  * for each game: fill form -> submit -> results page shows a prediction + SHAP chart
  * client-side validation blocks an empty submission
  * server-side cross-field validation message is displayed
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

import os
BASE = os.getenv("E2E_BASE", "http://localhost:5173")
OUT = Path(__file__).resolve().parents[1] / "docs" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
GAMES = ["csgo", "pubg", "valorant", "dota2"]
results: list[tuple[str, bool, str]] = []


def scroll_through(page) -> None:
    """Scroll to the bottom in steps so scroll-triggered reveal animations run, then back to top."""
    page.evaluate("""async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise(r => setTimeout(r, 60)); }
        window.scrollTo({ top: 0, behavior: 'instant' });
    }""")
    page.wait_for_timeout(500)


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {detail}")


def main(quick: bool) -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
        page = ctx.new_page()
        errors: list[str] = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        # ---- static pages
        for path, name, wait_for in [
            ("/", "01_landing", "text=Model board"),
            ("/games", "02_games", "text=Select game"),
            ("/analytics?game=csgo", "06_analytics_csgo", "text=Cleaning log"),
            ("/analytics?game=dota2", "07_analytics_dota2", "text=Confusion matrix"),
            ("/methodology", "09_methodology", "text=Experiment 1"),
        ]:
            errors.clear()
            page.goto(BASE + path)
            page.wait_for_selector(wait_for, timeout=15000)
            scroll_through(page)
            page.screenshot(path=OUT / f"{name}.png", full_page=True)
            check(f"page {path} renders", not errors, "; ".join(errors[:2]))

        # ---- client-side validation: empty submit is blocked
        page.goto(f"{BASE}/predict/csgo")
        page.wait_for_selector("text=Submit prediction")
        page.click("text=Submit prediction")
        page.wait_for_timeout(300)
        check("empty form blocked client-side", "/predict/csgo" in page.url and page.locator("text=Required").count() > 0)
        page.screenshot(path=OUT / "03b_validation_errors.png", full_page=True)

        # ---- server-side cross-field validation (headshots > kills)
        page.click("text=Fill with dataset medians")
        page.fill("#f-kills", "3")
        page.fill("#f-headshots", "9")
        page.click("text=Submit prediction")
        page.wait_for_selector("text=The server rejected these values", timeout=10000)
        check("server cross-field error displayed", page.locator("text=Headshot kills cannot exceed").count() > 0)

        # ---- full prediction flow for each game
        for i, game in enumerate(GAMES):
            errors.clear()
            page.goto(f"{BASE}/predict/{game}")
            page.wait_for_selector("text=Fill with dataset medians")
            page.click("text=Fill with dataset medians")
            if i == 0:
                page.screenshot(path=OUT / "03_predict_csgo.png", full_page=True)
            page.click("text=Submit prediction")
            page.wait_for_url(re.compile(r".*/results/\d+"), timeout=15000)
            page.wait_for_selector("text=What drove this prediction")
            scroll_through(page)
            value = page.locator("[data-testid=prediction-value]").inner_text()
            bars = page.locator(".recharts-bar-rectangle").count()
            check(f"{game}: predict -> results", bool(value) and bars > 0 and not errors,
                  f"value={value} bars={bars} {'; '.join(errors[:2])}")
            page.screenshot(path=OUT / f"04_result_{game}.png", full_page=True)

        # ---- history page lists predictions
        page.goto(f"{BASE}/history")
        page.wait_for_selector("table")
        rows = page.locator("tbody tr").count()
        check("history lists saved predictions", rows >= len(GAMES), f"rows={rows}")
        page.screenshot(path=OUT / "08_history.png", full_page=True)

        # ---- 404
        page.goto(f"{BASE}/does-not-exist")
        check("unknown route shows 404 page", page.locator("text=Page not found").count() == 1)

        # ---- mobile layout
        if not quick:
            m = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True)
            mp = m.new_page()
            for path, name, wait_for in [("/", "m01_landing", "text=Model board"),
                                         ("/predict/pubg", "m02_predict_pubg", "text=Fill with dataset medians"),
                                         ("/analytics?game=pubg", "m03_analytics_pubg", "text=Cleaning log")]:
                mp.goto(BASE + path)
                mp.wait_for_selector(wait_for, timeout=15000)
                scroll_through(mp)
                overflow = mp.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                check(f"mobile {path} no horizontal overflow", overflow <= 1, f"overflow={overflow}px")
                mp.screenshot(path=OUT / f"{name}.png", full_page=True)
            m.close()
        browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main("--quick" in sys.argv))
