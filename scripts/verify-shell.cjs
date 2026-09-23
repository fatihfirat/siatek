const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless:true,channel:'chrome'});
  const page = await browser.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto('http://127.0.0.1:5173/shell-preview',{waitUntil:'domcontentloaded'});
    await page.getByLabel('Görünüm',{exact:true}).waitFor();
    fs.mkdirSync('.artifacts/ui-phase4b',{recursive:true});
    for(const theme of ['dark','light']) {
      if(theme==='light') { await page.getByRole('button',{name:'Hesap ve tercihler',exact:true}).click(); await page.getByRole('switch',{name:'Koyu tema'}).uncheck(); await page.keyboard.press('Escape'); }
      for(const role of ['customer','admin','guest']) {
        await page.getByLabel('Görünüm',{exact:true}).selectOption(role);
        for(const width of [320,360,390,412,768,1024]) {
          await page.setViewportSize({width,height:844});
          const overflow=await page.locator('.shell-header *, .shell-tab').evaluateAll(ns=>ns.filter(n=>{const r=n.getBoundingClientRect();return r.width&&(r.left<0||r.right>innerWidth+1);}).map(n=>n.tagName));
          assert.deepEqual(overflow,[],`${theme} ${role} ${width}`);
          if(width<768) {
            const tabs=page.locator('.shell-tab'); assert.equal(await tabs.count(),5);
            const boxes=await tabs.evaluateAll(ns=>ns.map(n=>({w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height})));
            assert.ok(boxes.every(b=>b.w>=44&&b.h>=44));
            const before=boxes.map(b=>b.w);
            await tabs.nth(3).click();
            assert.deepEqual(await tabs.evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().width)),before);
            if(role!=='admin') {
              const cart=await page.locator('#mobile-sticky-cart-bar').boundingBox();
              const nav=await page.locator('.shell-tabs').boundingBox();
              assert.ok(cart.y+cart.height<=nav.y,'Cart must be above tabs');
            }
          }
          if(width===390) await page.screenshot({path:`.artifacts/ui-phase4b/${theme}-${role}.png`,fullPage:true});
        }
      }
      await page.getByLabel('Görünüm',{exact:true}).selectOption('customer');
    }
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Sepet 12 öğe'}).count();
    await page.locator('.shell-tab').nth(2).click();
    assert.equal(await page.getByRole('dialog',{name:'Sipariş sepeti'}).isVisible(),true);
    await page.keyboard.press('Escape');
    await page.getByLabel('Görünüm',{exact:true}).selectOption('admin');
    await page.getByRole('button',{name:'Hızlı POS',exact:true}).click();
    assert.equal(await page.getByRole('dialog',{name:'Hızlı POS'}).isVisible(),true);
    await page.keyboard.press('Escape');
    assert.deepEqual(errors,[]);
    console.log('PASS: 36 role/theme/viewport checks, touch targets, stable tabs, cart clearance, cart/POS preview dialogs, no runtime errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
