const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage();const errors=[],requests=[];
 // Keep fixture state stable while development artifacts are written.
 await page.routeWebSocket(/127\.0\.0\.1:5174/,socket=>socket.close());
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(/\/api\/|firestore.googleapis/,route=>{requests.push(route.request().url());return route.abort();});
 const button=name=>page.getByRole('button',{name,exact:true});
 const dialog=()=>page.getByRole('dialog',{name:'POS · Yeni satış'});
 const open=()=>button('POS · Yeni satış').click();
 const close=()=>page.keyboard.press('Escape');
 const stage=n=>button(n).click();
 const add=async(code='8690000000001')=>{await page.getByLabel('Barkod veya stok kodu',{exact:true}).fill(code);await button('Barkod ekle').click();};
 const scenario=async(value)=>{if(await page.locator('dialog[open]').count())await close();await page.getByLabel('Senaryo',{exact:true}).selectOption(value);};
 const targets=async()=>assert.ok(await page.locator('button,input,select,summary').evaluateAll(els=>els.filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44 && e.getBoundingClientRect().width>=44)),'44px targets');
 const noOverflow=async()=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow');if(await page.locator('dialog[open]').count())assert.ok(await dialog().evaluate(d=>d.scrollWidth<=d.clientWidth),'dialog overflow');};
 try{
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5174/operations-preview');await page.getByLabel('Senaryo').waitFor();fs.mkdirSync('.artifacts/ui-phase4f',{recursive:true});
  let layouts=0;
  for(const theme of ['light','dark']){
   await page.getByLabel('Tema',{exact:true}).selectOption(theme);
   for(const width of [320,360,390,412,768,1024,1440]){
    await page.setViewportSize({width,height:844});await noOverflow();await targets();layouts++;
    if(width===390||width===1440)await page.screenshot({path:`.artifacts/ui-phase4f/${theme}-${width}-home.png`,fullPage:true});
    await open();await stage('1. Ürünler');await noOverflow();await targets();layouts++;
    if(width===390||width===1440)await dialog().screenshot({path:`.artifacts/ui-phase4f/${theme}-${width}-products.png`});
    await add('8690000000002');await stage('2. Sepet (1)');await noOverflow();await targets();layouts++;
    if(width===390)await dialog().screenshot({path:`.artifacts/ui-phase4f/${theme}-cart.png`});
    await button('Ödemeye geç').click();await noOverflow();await targets();layouts++;
    if(width===390)await dialog().screenshot({path:`.artifacts/ui-phase4f/${theme}-payment.png`});
    await button('Sepete dön').click();await button('Sepeti temizle').click();await close();
    assert.ok(await button('POS · Yeni satış').evaluate(e=>document.activeElement===e));
   }
  }
  await page.setViewportSize({width:390,height:844});await open();
  await page.getByLabel('Ürün adı, SKU veya barkod ara').fill('zzzz');await page.getByText('Sonuç bulunamadı',{exact:true}).waitFor();await dialog().locator('.ui-state').getByRole('button',{name:'Aramayı temizle',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Stoksuz vana ekle'}).isDisabled());await add('unknown');await page.getByText('Barkod bulunamadı. Ürün adıyla arayın.',{exact:true}).waitFor();
  await add();await add();await add();await page.getByText(/Pirinç dirsek: yetersiz stok. Kullanılabilir/).waitFor();await stage('2. Sepet (1)');assert.equal(await page.getByRole('spinbutton',{name:'Pirinç dirsek miktarı',exact:true}).inputValue(),'2');
  await close();await open();assert.equal(await page.getByRole('spinbutton',{name:'Pirinç dirsek miktarı',exact:true}).inputValue(),'2');
  await button('Ödemeye geç').click();await page.getByLabel('Genel iskonto').selectOption('10');await page.getByLabel('Müşteri adı',{exact:true}).fill('Örnek Uzun Müşteri');await page.getByLabel('Ödeme yöntemi').selectOption('Havale/EFT');await button('Sepete dön').click();await button('Beklemeye al').click();
  await stage('2. Sepet (0)');await page.getByRole('button',{name:/Örnek Uzun Müşteri.*Geri al/}).click();await button('Ödemeye geç').click();assert.equal(await page.getByLabel('Genel iskonto').inputValue(),'10');assert.equal(await page.getByLabel('Ödeme yöntemi').inputValue(),'Havale/EFT');
  await page.getByLabel('Ödeme yöntemi').selectOption('Nakit');await page.getByLabel('Alınan nakit',{exact:true}).fill('1');await button('Satışı kaydet').click();await page.getByText('Alınan nakit tutarı genel toplamdan az olamaz.',{exact:true}).waitFor();assert.equal(await page.getByTestId('sale-calls').textContent(),'0');
  await button('Tam tutar').click();await button('Satışı kaydet').evaluate(b=>{b.click();b.click();});await page.getByText('Kaydediliyor… Tekrar göndermeyin.',{exact:true}).waitFor();await close();assert.equal(await page.locator('dialog[open]').count(),1);
  await page.getByText('ÖRNEK-POS-001',{exact:true}).waitFor();assert.equal(await page.getByTestId('sale-calls').textContent(),'1');await button('Yeni satış').click();await stage('2. Sepet (0)');await page.getByText('Sepet boş',{exact:true}).waitFor();
  await scenario('save-error');await open();await add();await stage('2. Sepet (1)');await button('Ödemeye geç').click();await button('Satışı kaydet').click();await page.getByText(/Kayıt doğrulanamadı. Sepet korundu/).waitFor();await button('Sepete dön').click();assert.equal(await page.getByRole('spinbutton',{name:'Pirinç dirsek miktarı',exact:true}).inputValue(),'1');
  await close();await button('Örnek stokları sıfırla').click();await open();await page.getByText(/Pirinç dirsek: yetersiz stok. Miktarı/).waitFor();assert.ok(await button('Ödemeye geç').isDisabled());
  for(const [value,text]of [['empty','Ürün yok'],['loading',''],['error','Ürünler yüklenemedi']]){await scenario(value);await open();if(text)await page.getByText(text,{exact:true}).waitFor();else assert.equal(await dialog().getByLabel('Yükleniyor',{exact:true}).count(),1);}
  for(const value of ['accounts-error','accounts-empty','accounts-loading']){await scenario(value);await open();await add();await stage('2. Sepet (1)');await button('Ödemeye geç').click();await page.getByText(value==='accounts-error'?'Cari hesaplar yüklenemedi':value==='accounts-empty'?'Kayıtlı cari hesap yok.':'Cari hesaplar yükleniyor…',{exact:true}).waitFor();await page.getByLabel('Ödeme yöntemi').selectOption('Cari Hesap');await button('Satışı kaydet').click();await page.getByText('Cari hesap ödemesi için kayıtlı müşteri seçin.',{exact:true}).waitFor();assert.equal(await page.getByTestId('sale-calls').textContent(),'0');}
  await scenario('mismatch');await open();await add();await stage('2. Sepet (1)');await button('Ödemeye geç').click();await button('Satışı kaydet').click();await page.getByText('Tutar farkı var',{exact:true}).waitFor();await noOverflow();await dialog().screenshot({path:'.artifacts/ui-phase4f/result-mismatch.png'});
  await scenario('ready');await open();await page.setViewportSize({width:320,height:480});await dialog().evaluate(d=>d.style.fontSize='24px');await noOverflow();
  const controls=dialog().locator('button:visible:enabled,input:visible:enabled,select:visible:enabled');await controls.first().focus();await page.keyboard.press('Shift+Tab');assert.ok(await controls.last().evaluate(e=>document.activeElement===e));await page.keyboard.press('Tab');assert.ok(await controls.first().evaluate(e=>document.activeElement===e));await button('Pencereyi kapat').click();assert.ok(await button('POS · Yeni satış').evaluate(e=>document.activeElement===e));
  assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log(`PASS: ${layouts} home/products/cart/payment theme-width layouts; search/barcode, stock, parking, close retention, cash, double submit, failures, mismatch, focus/Escape/close, 44px, no API/Firestore requests.`);
 }catch(error){await page.screenshot({path:'.artifacts/ui-phase4f/failure.png',fullPage:true});fs.writeFileSync('.artifacts/ui-phase4f/failure.html',await page.content());fs.writeFileSync('.artifacts/ui-phase4f/runtime-errors.json',JSON.stringify(errors));throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
