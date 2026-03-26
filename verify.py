import asyncio
from playwright.async_api import async_playwright
import sys

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Capture console errors
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))

        # Load the page from a local server running on port 8000
        await page.goto("http://localhost:8000")

        # Wait for potential rendering
        await page.wait_for_timeout(3000)

        # Click a button to test interaction
        try:
            await page.click("button:has-text('Laplace Transform')", timeout=2000)
            await page.wait_for_timeout(1000)
        except Exception as e:
            print(f"Interaction warning: {e}")

        await page.screenshot(path="verification.png")
        await browser.close()

        if errors:
            print("Console errors found:")
            for err in errors:
                print(f"- {err}")
            sys.exit(1)
        else:
            print("No console errors found. Verification successful.")
            sys.exit(0)

asyncio.run(main())
