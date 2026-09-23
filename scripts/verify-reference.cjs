const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
 await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:5174/reference-preview');
 await page.getByLabel('Referans ekran').waitFor();fs.mkdirSync('.artifacts/ui-phase4c',{recursive:true});
 let checks=0;
 for(const theme of ['dark','light'])for(const screen of ['home','catalog','admin']){
 await page.getByLabel('Tema',{exact:true}).selectOption(theme);await page.getByLabel('Referans ekran').selectOption(screen);
 for(const width of [320,360,390,412,768,1024,1440]){
 await page.setViewportSize({width,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${theme}/${screen}/${width} overflow`);
 const bad=await page.locator('main button, main input, aside select').evaluateAll(ns=>ns.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&(r.height<44||r.width<44);}).map(n=>n.outerHTML));assert.deepEqual(bad,[]);
 if(width===390||width===1024)await page.screenshot({path:`.artifacts/ui-phase4c/${theme}-${screen}-${width}.png`,fullPage:true});checks++;
 }
 }
 await page.setViewportSize({width:390,height:844});await page.getByLabel('Referans ekran').selectOption('catalog');
 await page.getByLabel('Ürün ara',{exact:true}).fill('VLV-025');assert.equal(await page.locator('.reference-product').count(),1);
 await page.getByLabel('Pirinç küresel vana miktarı',{exact:true}).filter({hasNot:page.locator('input')}).count();
 await page.getByRole('spinbutton',{name:'Pirinç küresel vana miktarı',exact:true}).fill('2');
 await page.getByRole('button',{name:'Sepete ekle',exact:true}).click();await page.getByRole('button',{name:'Sepete ekle',exact:true}).click();
 assert.equal(await page.getByText('Sepette: 4 adet',{exact:true}).isVisible(),true);
 const cart=await page.locator('.reference-cart').boundingBox(),nav=await page.locator('.shell-tabs').boundingBox();assert.ok(cart.y+cart.height<=nav.y);
 await page.getByRole('button',{name:'Sepeti incele',exact:true}).click();assert.ok(await page.getByRole('dialog').getByText('Toplam:').isVisible());await page.keyboard.press('Escape');
 await page.getByLabel('Ürün ara',{exact:true}).fill('olmayan');assert.ok(await page.getByText('Ürün bulunamadı',{exact:true}).isVisible());await page.getByRole('button',{name:'Filtreleri temizle'}).click();assert.equal(await page.locator('.reference-product').count(),4);
 assert.ok(await page.locator('.reference-product').last().getByRole('button',{name:'Sepete ekle'}).isDisabled());
 for(const state of ['loading','empty','error','guest']){await page.getByLabel('Veri durumu').selectOption(state);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.getByLabel('Referans ekran').selectOption('admin');await page.getByLabel('Veri durumu').selectOption('guest');assert.equal(await page.locator('.reference-kpis').count(),0);
 await page.getByLabel('Veri durumu').selectOption('error');await page.getByRole('button',{name:'Tekrar dene'}).click();assert.equal(await page.locator('.reference-kpis').count(),1);
 assert.deepEqual(errors,[]);console.log(`PASS: ${checks} screen/theme/width checks; touch sizes, search, repeat add, stock, cart clearance, empty/error/guest states; no runtime errors.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
