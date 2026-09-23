const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({headless: true, channel: 'chrome'});
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5173/design-system', {waitUntil: 'domcontentloaded', timeout: 60000});
    await page.getByRole('heading', {name: 'Alpha Teknik', exact: true}).waitFor();
    fs.mkdirSync('.artifacts/ui-phase4a', {recursive: true});
    for (const theme of ['dark', 'light']) {
      if (theme === 'light') await page.getByRole('button', {name: 'Açık temaya geç'}).click();
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor === getComputedStyle(document.documentElement).backgroundColor), true, 'Preview background matches theme');
      for (const width of [320, 360, 390, 412, 768, 1024, 1440]) {
        await page.setViewportSize({width, height: 900});
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${theme} ${width} overflow`);
        const outside = await page.locator('.ui-preview *').evaluateAll(nodes => nodes.filter(n => {const r=n.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1);}).map(n => n.tagName));
        assert.deepEqual(outside, [], `${theme} ${width} clipped elements`);
        if ([390, 1440].includes(width)) await page.screenshot({path: `.artifacts/ui-phase4a/${theme}-${width}.png`, fullPage: true});
      }
    }
    await page.setViewportSize({width: 390, height: 844});
    const quantity = page.getByRole('spinbutton', {name: 'Miktar'});
    assert.equal(await page.getByRole('button', {name: 'Adedi azalt'}).isDisabled(), true);
    await quantity.fill('99'); await quantity.blur();
    assert.equal(await quantity.inputValue(), '24');
    assert.equal(await page.getByRole('button', {name: 'Adedi artır'}).isDisabled(), true);
    await quantity.fill('0'); await quantity.blur();
    assert.equal(await quantity.inputValue(), '1');
    await page.getByRole('button', {name: 'Sepete ekle', exact: true}).click();
    await page.getByRole('button', {name: 'Sepete ekle', exact: true}).click();
    assert.equal(await page.locator('.ui-toast').count(), 1);
    await page.getByRole('button', {name: 'Bildirimi kapat'}).click();
    const search = page.getByRole('searchbox');
    await search.fill('bulunmayan');
    assert.equal(await page.getByText('Ürün bulunamadı', {exact:true}).count(), 1);
    await page.getByRole('button', {name: 'Aramayı temizle'}).first().click();
    assert.equal(await search.inputValue(), '');
    const opener = page.getByRole('button', {name: 'Sipariş özeti', exact: true});
    await opener.click();
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('dialog')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').isVisible(), false);
    assert.equal(await opener.evaluate(n => n === document.activeElement), true);
    assert.equal(await page.getByRole('button', {name: 'Kaydediliyor'}).isDisabled(), true);
    await page.emulateMedia({reducedMotion: 'reduce'});
    assert.equal(await page.locator('.ui-spinner').evaluate(n => getComputedStyle(n).animationName), 'none');
    assert.deepEqual(errors, []);
    console.log('PASS: 14 theme/viewport combinations; quantity limits; search; modal focus and Escape; loading; toast deduplication; reduced motion; no runtime errors.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exit(1);});
