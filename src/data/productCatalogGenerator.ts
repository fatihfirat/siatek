import { Product } from '../types';

// Helper to generate EAN13 barcode with valid check digit
function generateEan13(numericId: number): string {
  const base = `8690000${String(numericId).padStart(5, '0')}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${base}${checkDigit}`;
}

// Master list of sizes and standard Turkish plumbing terms
const SIZES = ['1/2"', '3/4"', '1"', '1 1/4"', '1 1/2"', '2"', '2 1/2"', '3"', '4"'];
const PPRC_SIZES = ['20 MM', '25 MM', '32 MM', '40 MM', '50 MM', '63 MM', '75 MM', '90 MM', '110 MM'];
const PVC_SIZES = ['50', '70', '100', '125', '150', '200'];
const PVC_LENGTHS = ['15 CM', '25 CM', '50 CM', '100 CM', '200 CM', '300 CM'];

// Concrete specific products mapped by stock ID range (ST00001 - ST01835)
export function generateAll1800Products(): Product[] {
  const products: Product[] = [];
  const TOTAL_ITEMS = 1835;

  for (let i = 1; i <= TOTAL_ITEMS; i++) {
    const padded = String(i).padStart(5, '0');
    const sku = `ST${padded}`;
    const id = `st-${padded}`;
    const barcode = generateEan13(i);

    let name = '';
    let category = '';
    let subCategory = '';
    let description = '';
    let price = 25.0;
    let wholesalePrice = 20.0;
    let stock = 100;
    let unit = 'ADET';
    let minOrderQuantity = 1;
    let featured = false;

    // --- RANGE 1-100: VANALAR, ÇEKVALFLER, RADYATÖR VANALARI, PÜRJÖR & VENTİLLER ---
    if (i >= 1 && i <= 30) {
      category = 'VANALAR & ÇEKVALFLER';
      if (i === 1) {
        name = '1/2" ÇEKVALF (AKIN / KILIÇ PRES)';
        subCategory = 'AKIN ÇEKVALF SARI MALZEME';
        description = '1/2 inç yaylı sarı pirinç yatay/dikey çekvalf';
        price = 155.0;
        wholesalePrice = 125.0;
        stock = 110;
        minOrderQuantity = 2;
      } else if (i === 2) {
        name = '1" ÇEKVALF (AKIN / KILIÇ PRES)';
        subCategory = 'AKIN ÇEKVALF SARI MALZEME';
        description = '1 inç dikey ve yatay basınca dayanıklı pirinç çekvalf';
        price = 255.0;
        wholesalePrice = 210.0;
        stock = 85;
        featured = true;
      } else if (i === 3) {
        name = '3/4" ÇEKVALF (AKIN / KILIÇ PRES)';
        subCategory = 'AKIN ÇEKVALF SARI MALZEME';
        description = '3/4 inç yaylı pirinç çekvalf';
        price = 195.0;
        wholesalePrice = 160.0;
        stock = 95;
      } else if (i === 7) {
        name = '1" DİKVALF (AKIN / KILIÇ PRES)';
        subCategory = 'DİKVALFLER';
        description = '1 inç pirinç yaylı dikvalf / dip klapesi';
        price = 210.0;
        wholesalePrice = 175.0;
        stock = 60;
      } else if (i === 10) {
        name = '1/2" PİSLİK TUTUCU (PİRİNÇ FİLTRE)';
        subCategory = 'PİSLİK TUTUCULAR';
        description = '1/2 inç Y tipi paslanmaz çelik süzgeçli pirinç filtre';
        price = 135.0;
        wholesalePrice = 108.0;
        stock = 140;
      } else if (i === 11) {
        name = '3/4" PİSLİK TUTUCU (PİRİNÇ FİLTRE)';
        subCategory = 'PİSLİK TUTUCULAR';
        description = '3/4 inç Y tipi pirinç pislik tutucu filtre';
        price = 185.0;
        wholesalePrice = 148.0;
        stock = 95;
      } else if (i === 12) {
        name = '1" PİSLİK TUTUCU (PİRİNÇ FİLTRE)';
        subCategory = 'PİSLİK TUTUCULAR';
        description = '1 inç Y tipi ağır tip pirinç pislik tutucu filtre';
        price = 260.0;
        wholesalePrice = 210.0;
        stock = 70;
        featured = true;
      } else if (i === 15) {
        name = '1/2" KÖŞE RADYATÖR VANASI (ECA TİPİ)';
        subCategory = 'RADYATÖR VANALARI';
        description = '1/2 inç krom volanlı köşe radyatör bağlantı vanası';
        price = 145.0;
        wholesalePrice = 115.0;
        stock = 350;
        minOrderQuantity = 5;
        featured = true;
      } else if (i === 16) {
        name = '1/2" DÜZ RADYATÖR VANASI';
        subCategory = 'RADYATÖR VANALARI';
        description = '1/2 inç düz radyatör bağlantı vanası';
        price = 145.0;
        wholesalePrice = 115.0;
        stock = 180;
        minOrderQuantity = 5;
      } else if (i === 17) {
        name = '1/2" TERMOSTATİK KÖŞE RADYATÖR VANASI';
        subCategory = 'TERMOSTATİK VANALAR';
        description = '1/2 inç sıvı sensörlü enerji tasarruflu termostatik vana';
        price = 365.0;
        wholesalePrice = 295.0;
        stock = 120;
        featured = true;
      } else if (i === 18) {
        name = '1/2" OTOMATİK HAVA PÜRJÖRÜ';
        subCategory = 'HAVA PÜRJÖRLERİ';
        description = '1/2 inç pirinç otomatik tesisat hava tahliye ventili';
        price = 120.0;
        wholesalePrice = 95.0;
        stock = 210;
      } else if (i === 19) {
        name = '3 BAR EMNİYET VENTİLİ';
        subCategory = 'EMNİYET VENTİLLERİ';
        description = '1/2 inç 3 Bar kombi ve kazan emniyet ventili';
        price = 155.0;
        wholesalePrice = 125.0;
        stock = 95;
      } else {
        const size = SIZES[i % SIZES.length];
        name = `${size} KLAPELİ ÇEKVALF / BASINÇ REGÜLATÖRÜ (${i})`;
        subCategory = 'ÇEKVALFLER & KLAPELER';
        description = `${size} pirinç gövdeli akış yön kontrol elemanı`;
        price = 120.0 + (i % 10) * 25;
        wholesalePrice = price * 0.8;
        stock = 50 + (i * 3) % 150;
      }
    }

    // --- RANGE 31-100: ISITMA, KOMBİ, RADYATÖR & DOĞALGAZ EKİPMANLARI ---
    else if (i >= 31 && i <= 100) {
      if (i === 54) {
        category = 'ISITMA & KOMBİ GRUBU';
        subCategory = 'KOMBİLER';
        name = 'ECA CITIUS PREMIX 24 KW TAM YOĞUŞMALI KOMBİ';
        description = '24 kW ErP A sınıfı tam yoğuşmalı kombi (Baca seti dahil)';
        price = 29000.0;
        wholesalePrice = 24500.0;
        stock = 14;
        featured = true;
      } else if (i === 55) {
        category = 'ISITMA & KOMBİ GRUBU';
        subCategory = 'KOMBİLER';
        name = 'ECA PROTEUS PREMIX 24 KW TAM YOĞUŞMALI KOMBİ';
        description = '24 kW paslanmaz çelik eşanjörlü tam yoğuşmalı kombi';
        price = 31500.0;
        wholesalePrice = 26800.0;
        stock = 10;
        featured = true;
      } else if (i === 56) {
        category = 'ISITMA & KOMBİ GRUBU';
        subCategory = 'KOMBİLER';
        name = 'DEMİRDÖKÜM NİTROMİX P 24 KW YOĞUŞMALI KOMBİ';
        description = '24 kW çift eşanjörlü yoğuşmalı kombi';
        price = 32000.0;
        wholesalePrice = 27500.0;
        stock = 8;
      } else if (i === 58) {
        category = 'ISITMA & KOMBİ GRUBU';
        subCategory = 'TERMOSİFONLAR';
        name = 'BAYMAK 65 LT ELEKTRİKLİ TERMOSİFON (PRİMA)';
        description = '65 Litre titanyum emaye kaplamalı elektrikli termosifon';
        price = 8900.0;
        wholesalePrice = 7400.0;
        stock = 15;
      } else if (i >= 60 && i <= 72) {
        category = 'DOĞALGAZ SİSTEMLERİ';
        if (i === 63) {
          name = 'G4 DOĞALGAZ SAYACI (KÖRÜKLÜ)';
          subCategory = 'DOĞALGAZ SAYAÇLARI';
          description = 'G4 evsel daire tipi mühürlü körüklü gaz sayacı';
          price = 1850.0;
          wholesalePrice = 1520.0;
          stock = 45;
          featured = true;
        } else if (i === 66) {
          name = 'DOĞALGAZ OCAK FLEXİ 1/2*1/2 - 100 CM (TS EN 14800)';
          subCategory = 'DOĞALGAZ FLEXLERİ';
          description = 'Örgülü şeffaf PVC kılıflı TS EN 14800 paslanmaz gaz flexi';
          price = 260.0;
          wholesalePrice = 205.0;
          stock = 180;
          minOrderQuantity = 2;
          featured = true;
        } else if (i === 69) {
          name = 'GAZ ALARM CİHAZI (220V RÖLE ÇIKIŞLI)';
          subCategory = 'GAZ ALARM & EMNİYET';
          description = 'Selenoid vana tetiklemeli sesli ve ışıklı gaz alarm dedektörü';
          price = 450.0;
          wholesalePrice = 360.0;
          stock = 95;
          featured = true;
        } else if (i === 70) {
          name = '3/4" SELENOİD VANA (MANUEL RESETLİ)';
          subCategory = 'GAZ ALARM & EMNİYET';
          description = '220V alarm bağlantılı pirinç emniyet gaz kesme vanası';
          price = 650.0;
          wholesalePrice = 520.0;
          stock = 60;
        } else {
          name = `DOĞALGAZ BAĞLANTI & SAYAÇ APARATI (${i})`;
          subCategory = 'DOĞALGAZ EKİPMANLARI';
          description = 'TSE standartlarında doğalgaz montaj parçası';
          price = 85.0 + (i % 10) * 15;
          wholesalePrice = price * 0.8;
          stock = 120;
        }
      } else if (i >= 75 && i <= 88) {
        category = 'ISITMA & KOMBİ GRUBU';
        if (i === 75) {
          name = 'PANEL RADYATÖR 600X1000 (TİP 22 PKKP)';
          subCategory = 'PANEL RADYATÖRLER';
          description = '60 cm x 100 cm 10 bar test basınçlı panel petek';
          price = 2150.0;
          wholesalePrice = 1780.0;
          stock = 50;
          featured = true;
        } else if (i === 79) {
          name = '500X1000 DÜZ BEYAZ HAVLUPAN (BORUSAN)';
          subCategory = 'HAVLUPANLAR';
          description = '50 cm x 100 cm beyaz elektrostatik boyalı banyo havlupanı';
          price = 1250.0;
          wholesalePrice = 980.0;
          stock = 65;
        } else if (i === 88) {
          name = 'KALDE KOMBİ BAĞLANTI SETİ (8 PARÇA)';
          subCategory = 'KOMBİ MONTAJ SETLERİ';
          description = 'Kombi altı tesisat bağlantı vanaları, filtreleri ve rekorları tam set';
          price = 450.0;
          wholesalePrice = 320.0;
          stock = 350;
          featured = true;
        } else {
          name = `RADYATÖR ASKI & BAĞLANTI SETİ TIP-22 (${i})`;
          subCategory = 'RADYATÖR AKSESUARLARI';
          description = 'Petek ve havlupan montaj askı pürjör takımı';
          price = 65.0 + (i % 5) * 10;
          wholesalePrice = price * 0.75;
          stock = 200;
        }
      } else {
        category = 'ISITMA & KOMBİ GRUBU';
        subCategory = 'YERDEN ISITMA';
        name = `YERDEN ISITMA EK PARÇASI & MODÜLASYON (${i})`;
        description = 'Yerden ısıtma köşe düzeltici, klips ve kollektör bağlantı elemanı';
        price = 45.0 + (i % 10) * 12;
        wholesalePrice = price * 0.8;
        stock = 150;
      }
    }

    // --- RANGE 101-200: BASINÇ DÜŞÜRÜCÜLER, MEKANİK VE BORU PARÇALARI ---
    else if (i >= 101 && i <= 200) {
      category = 'VANALAR & ÇEKVALFLER';
      subCategory = 'BASINÇ REGÜLATÖRLERİ & VENTİLLER';
      const size = SIZES[i % SIZES.length];
      const type = (i % 3 === 0) ? 'MANOMETRELİ BASINÇ DÜŞÜRÜCÜ' : (i % 3 === 1) ? 'TERMOKUPL & GAZ VENTİLİ' : 'DİP KLAPESİ SÜZGEÇLİ';
      name = `${size} ${type} (${i})`;
      description = `${size} tesisat basınç kontrol ve güvenlik ekipmanı`;
      price = 140.0 + (i % 15) * 35;
      wholesalePrice = price * 0.8;
      stock = 40 + (i % 60);
    }

    // --- RANGE 201-300: PATENT FİTTİNGS (PATENT DİRSEK, TE, REDÜKSİYON, KRUVA) ---
    else if (i >= 201 && i <= 300) {
      category = 'FİTTİNGS MALZEMELERİ';
      subCategory = 'PATENTLER';
      if (i === 214) {
        name = '1/2" PATENT DİRSEK';
        description = '1/2 inç dikişsiz çelik kaynak ağızlı patent dirsek';
        price = 22.0;
        wholesalePrice = 17.5;
        stock = 350;
      } else if (i === 215) {
        name = '3/4" PATENT DİRSEK';
        description = '3/4 inç dikişsiz çelik kaynak ağızlı patent dirsek';
        price = 26.0;
        wholesalePrice = 20.5;
        stock = 310;
      } else if (i === 216) {
        name = '1" PATENT DİRSEK';
        description = '1 inç dikişsiz çelik kaynak ağızlı patent dirsek';
        price = 30.0;
        wholesalePrice = 24.0;
        stock = 250;
      } else if (i === 217) {
        name = '1 1/4" PATENT DİRSEK';
        description = '1 1/4 inç dikişsiz çelik patent dirsek';
        price = 48.0;
        wholesalePrice = 38.0;
        stock = 110;
      } else if (i === 218) {
        name = '1 1/2" PATENT DİRSEK';
        description = '1 1/2 inç dikişsiz çelik patent dirsek';
        price = 65.0;
        wholesalePrice = 52.0;
        stock = 95;
      } else if (i === 219) {
        name = '2" PATENT DİRSEK';
        description = '2 inç dikişsiz çelik patent dirsek';
        price = 95.0;
        wholesalePrice = 76.0;
        stock = 80;
      } else if (i === 220) {
        name = '2 1/2" PATENT DİRSEK';
        description = '2 1/2 inç dikişsiz çelik patent kaynak dirseği';
        price = 185.0;
        wholesalePrice = 148.0;
        stock = 45;
      } else if (i === 221) {
        name = '3" PATENT DİRSEK';
        description = '3 inç dikişsiz çelik patent kaynak dirseği';
        price = 275.0;
        wholesalePrice = 220.0;
        stock = 30;
      } else if (i === 237) {
        name = '1/2" PATENT TE';
        description = '1/2 inç dikişsiz çelik kaynaklı patent te';
        price = 42.0;
        wholesalePrice = 33.5;
        stock = 190;
      } else if (i === 238) {
        name = '3/4" PATENT TE';
        description = '3/4 inç dikişsiz çelik kaynaklı patent te';
        price = 52.0;
        wholesalePrice = 41.5;
        stock = 140;
      } else if (i === 239) {
        name = '1" PATENT TE';
        description = '1 inç dikişsiz kaynak ağızlı çelik patent te';
        price = 60.0;
        wholesalePrice = 48.0;
        stock = 199;
      } else if (i === 243) {
        name = '1" PATENT KRUVA';
        description = '1 inç 4 yollu çelik patent kruva bağlantısı';
        price = 155.0;
        wholesalePrice = 125.0;
        stock = 25;
      } else {
        const size = SIZES[i % SIZES.length];
        const kind = (i % 4 === 0) ? 'PATENT DİRSEK (DİKİŞSİZ)' : (i % 4 === 1) ? 'PATENT TE' : (i % 4 === 2) ? 'PATENT KONSANTRİK REDÜKSİYON' : 'PATENT FLANŞ KAYNAK BOYUNLU';
        name = `${size} ${kind} (${i})`;
        description = `${size} dikişsiz karbon çelik kaynaklı hat elemanı`;
        price = 35.0 + (i % 12) * 22;
        wholesalePrice = price * 0.8;
        stock = 50 + (i % 80);
      }
    }

    // --- RANGE 301-480: DÖKÜM DEMİR & GALVANİZ FİTTİNGS (DİRSEK, TE, NİPEL, MANŞON, TAPA, REDÜKSİYON) ---
    else if (i >= 301 && i <= 480) {
      category = 'FİTTİNGS MALZEMELERİ';
      const isGalv = i >= 370 && i <= 420;
      subCategory = isGalv ? 'GALVENİZLER' : 'DEMİR FİTTİNGS';

      if (i === 301) {
        name = '1/2" DİRSEK (DEMİR FİTTİNGS)';
        description = '1/2 inç 90 derece döküm dişli demir dirsek';
        price = 24.5;
        wholesalePrice = 19.5;
        stock = 450;
      } else if (i === 302) {
        name = '1/2" KUYRUKLU DİRSEK (DEMİR)';
        description = '1/2 inç iç-dış dişli demir dirsek';
        price = 32.0;
        wholesalePrice = 25.5;
        stock = 280;
      } else if (i === 305) {
        name = '3/4" DİRSEK (DEMİR FİTTİNGS)';
        description = '3/4 inç 90 derece döküm dişli demir dirsek';
        price = 34.0;
        wholesalePrice = 27.0;
        stock = 310;
      } else if (i === 306) {
        name = '1" DİRSEK (DEMİR FİTTİNGS)';
        description = '1 inç 90 derece döküm dişli demir dirsek';
        price = 44.0;
        wholesalePrice = 35.0;
        stock = 120;
      } else if (i === 307) {
        name = '1 1/4" DİRSEK (DEMİR)';
        description = '1 1/4 inç döküm dişli demir dirsek';
        price = 85.0;
        wholesalePrice = 68.0;
        stock = 80;
      } else if (i === 308) {
        name = '1 1/2" DİRSEK (DEMİR)';
        description = '1 1/2 inç döküm dişli demir dirsek';
        price = 115.0;
        wholesalePrice = 92.0;
        stock = 75;
      } else if (i === 309) {
        name = '2" DİRSEK (DEMİR)';
        description = '2 inç döküm dişli demir dirsek';
        price = 185.0;
        wholesalePrice = 148.0;
        stock = 60;
      } else if (i === 320) {
        name = '1/2" TE (DEMİR FİTTİNGS)';
        description = '1/2 inç eşit 3 yollu döküm demir te parçası';
        price = 35.0;
        wholesalePrice = 28.0;
        stock = 320;
      } else if (i === 321) {
        name = '1" TE (DEMİR FİTTİNGS)';
        description = '1 inç 3 yollu eşit döküm demir te parçası';
        price = 68.0;
        wholesalePrice = 54.0;
        stock = 62;
      } else if (i === 329) {
        name = '1/2" NİPEL (DEMİR)';
        description = '1/2 inç dış dişli demir çift taraflı nipel';
        price = 21.0;
        wholesalePrice = 16.5;
        stock = 610;
      } else if (i === 330) {
        name = '1" NİPEL';
        description = '1 inç çift tarafı dış dişli demir nipel';
        price = 37.0;
        wholesalePrice = 29.0;
        stock = 95;
      } else if (i === 331) {
        name = '3/4" NİPEL (DEMİR)';
        description = '3/4 inç dış dişli demir çift taraflı nipel';
        price = 27.0;
        wholesalePrice = 21.5;
        stock = 410;
      } else if (i === 339) {
        name = '1/2" MANŞON (DEMİR)';
        description = '1/2 inç iç dişli döküm boru ekleme manşonu';
        price = 22.0;
        wholesalePrice = 17.5;
        stock = 520;
      } else if (i === 340) {
        name = '3/4" MANŞON (DEMİR)';
        description = '3/4 inç iç dişli döküm boru manşonu';
        price = 28.5;
        wholesalePrice = 22.5;
        stock = 360;
      } else if (i === 341) {
        name = '1" MANŞON';
        description = '1 inç iç dişli demir boru manşonu';
        price = 38.0;
        wholesalePrice = 30.0;
        stock = 80;
      } else if (i === 349) {
        name = '1/2" TAPA (DEMİR)';
        description = '1/2 inç dış dişli demir kör tapa';
        price = 18.0;
        wholesalePrice = 14.0;
        stock = 400;
      } else if (i === 350) {
        name = '1" TAPA (DEMİR)';
        description = '1 inç dış dişli demir kör tapa';
        price = 36.0;
        wholesalePrice = 28.0;
        stock = 60;
      } else if (i === 366) {
        name = '3/4*1/2 REDÜKSİYON (DEMİR)';
        description = '3/4 inç x 1/2 inç dış-iç dişli demir redüksiyon';
        price = 21.0;
        wholesalePrice = 16.5;
        stock = 480;
      } else if (i === 380) {
        name = '1" GALVANİZ DİRSEK';
        description = '1 inç galvaniz kaplı paslanmaz dişli dirsek';
        price = 50.0;
        wholesalePrice = 41.0;
        stock = 75;
      } else if (i === 395) {
        name = '1" GALVENİZ NİPEL';
        description = '1 inç galvaniz çift taraflı dış dişli nipel';
        price = 43.0;
        wholesalePrice = 35.0;
        stock = 90;
      } else {
        const size = SIZES[i % SIZES.length];
        const kind = (i % 6 === 0) ? 'DİRSEK' : (i % 6 === 1) ? 'TE' : (i % 6 === 2) ? 'NİPEL' : (i % 6 === 3) ? 'MANŞON' : (i % 6 === 4) ? 'KÖR TAPA' : 'REDÜKSİYON';
        const material = isGalv ? 'GALVANİZ' : 'DEMİR';
        name = `${size} ${material} ${kind} (${i})`;
        description = `${size} ${material.toLowerCase()} döküm dişli tesisat bağlantı parçası`;
        price = 20.0 + (i % 10) * 12;
        wholesalePrice = price * 0.8;
        stock = 100 + (i % 200);
      }
    }

    // --- RANGE 481-600: ARMATÜRLER, MUSLUKLAR, BATARYALAR & DUŞ SİSTEMLERİ ---
    else if (i >= 481 && i <= 600) {
      category = 'ARMATÜR & BATARYALAR';
      if (i === 489) {
        name = 'AKASYA BANYO BATARYASI (İSRA)';
        subCategory = 'BANYO BATARYALARI';
        description = '35 mm seramik kartuşlu krom pirinç banyo bataryası';
        price = 3500.0;
        wholesalePrice = 2850.0;
        stock = 15;
        featured = true;
      } else if (i === 490) {
        name = 'AKASYA LAVABO BATARYASI (İSRA)';
        subCategory = 'LAVABO BATARYALARI';
        description = 'Krom pirinç lavabo bataryası';
        price = 2650.0;
        wholesalePrice = 2150.0;
        stock = 18;
      } else if (i === 491) {
        name = 'AKASYA EVYE (MUTFAK) BATARYASI';
        subCategory = 'EVYE BATARYALARI';
        description = 'Döner kuğu borulu krom pirinç mutfak bataryası';
        price = 2850.0;
        wholesalePrice = 2300.0;
        stock = 20;
      } else if (i === 495) {
        name = 'ROBOT TEPE DUŞ SETİ (KROM)';
        subCategory = 'DUŞ SİSTEMLERİ';
        description = 'Pirinç yönlendiricili tepe yağmurlama ve el duş kolonu';
        price = 1850.0;
        wholesalePrice = 1450.0;
        stock = 22;
        unit = 'TAKIM';
        featured = true;
      } else if (i === 497) {
        name = '3/8*1/2 FİLTRELİ TAHARET MUSLUĞU (AÇ-KAPA)';
        subCategory = 'ARA MUSLUKLAR';
        description = 'Seramik diskli pirinç krom aç-kapa taharet musluğu';
        price = 135.0;
        wholesalePrice = 95.0;
        stock = 350;
        featured = true;
      } else if (i === 498) {
        name = '3/4 AÇ-KAPA ÇAMAŞIR / BULAŞIK MUSLUĞU';
        subCategory = 'ARA MUSLUKLAR';
        description = 'Kromajlı pirinç çamaşır makinesi musluğu';
        price = 145.0;
        wholesalePrice = 105.0;
        stock = 190;
      } else if (i === 567) {
        name = 'ARITMALI MUSLUK (İSRA)';
        subCategory = 'İSRA MUSLUKLAR';
        description = 'İSRA Özel Tasarım Arıtmalı Musluk, Pirinç Gövde';
        price = 200.0;
        wholesalePrice = 160.0;
        stock = 25;
        featured = true;
      } else {
        const kinds = ['KUĞU LAVABO BATARYASI', 'BANYO KÜVET BATARYASI', 'ARITMALI EVYE BATARYASI', 'AÇ-KAPA TAHARET MUSLUĞU', 'MAFSALLI DUŞ SETİ', 'KROM ŞOFBEN MUSLUĞU'];
        const chosen = kinds[i % kinds.length];
        subCategory = 'İSRA ARMATÜR & MUSLUK';
        name = `${chosen} - İSRA SERİSİ (${i})`;
        description = '1. kalite kromaj kaplı pirinç gövdeli batarya ve armatür';
        price = 250.0 + (i % 20) * 85;
        wholesalePrice = price * 0.8;
        stock = 30 + (i % 50);
      }
    }

    // --- RANGE 601-750: KELEPÇE, SIZDIRMAZLIK, MONTAJ VE DOĞALGAZ BORULARI ---
    else if (i >= 601 && i <= 750) {
      if (i >= 601 && i <= 650) {
        category = 'KELEPÇE & MONTAJ & SARF';
        subCategory = 'BORU KELEPÇELERİ';
        const size = SIZES[i % SIZES.length];
        name = `${size} SOMUNLU LASTİKLİ KELEPÇE (${i})`;
        description = `${size} EPDM ses lastikli galvaniz boru sabitleme kelepçesi`;
        price = 12.0 + (i % 8) * 3;
        wholesalePrice = price * 0.7;
        stock = 500 + (i % 500);
      } else if (i >= 651 && i <= 700) {
        category = 'SIZDIRMAZLIK & HIRDAVAT';
        subCategory = 'SIZDIRMAZLIK VE YAPIŞTIRICI';
        name = `DOĞALGAZ SIVI CONTA & TEFLON BANT SERİSİ (${i})`;
        description = 'TSE onaylı diş sızdırmazlık kimyasalı ve bantları';
        price = 25.0 + (i % 10) * 20;
        wholesalePrice = price * 0.75;
        stock = 250;
      } else {
        category = 'DOĞALGAZ SİSTEMLERİ';
        subCategory = 'DOĞALGAZ BORULARI';
        const size = SIZES[i % SIZES.length];
        name = `${size} DİKİŞSİZ ÇELİK DOĞALGAZ BORUSU (${i})`;
        description = `${size} TS EN 10255 standartlarında çelik gaz borusu`;
        price = 90.0 + (i % 6) * 30;
        wholesalePrice = price * 0.8;
        stock = 400;
        unit = 'METRE';
      }
    }

    // --- RANGE 751-980: RADYATÖR VE ISITMA DAĞITIM SİSTEMLERİ ---
    else if (i >= 751 && i <= 980) {
      category = 'ISITMA & KOMBİ GRUBU';
      subCategory = 'PANEL RADYATÖRLER & YERDEN ISITMA';
      const len = 400 + (i % 20) * 100;
      name = `PANEL RADYATÖR 600X${len} TIP 22 PKKP (${i})`;
      description = `60 cm yükseklik x ${len} mm uzunluk beyaz panel radyatör`;
      price = 1200.0 + (i % 20) * 120;
      wholesalePrice = price * 0.82;
      stock = 20 + (i % 30);
    }

    // --- RANGE 981-1100: KALDE PPRC TEMİZ SU SİSTEMLERİ (BORU, DİRSEK, TE, MANŞON, REDÜKSİYON) ---
    else if (i >= 981 && i <= 1100) {
      category = 'PPRC & PVC BORU SİSTEMLERİ';
      subCategory = 'KALDE PPRC';
      if (i === 986) {
        name = '25*90 PPRC DİRSEK (KALDE)';
        description = '25 mm 90 derece kaynak dirseği';
        price = 9.61;
        wholesalePrice = 4.6;
        stock = 21441;
        minOrderQuantity = 20;
      } else if (i === 987) {
        name = '20 MM PPRC BORU (100 M KALDE)';
        description = '20 mm PN20 Kalde polipropilen temiz su borusu';
        price = 50.15;
        wholesalePrice = 21.5;
        stock = 34002;
        unit = 'METRE';
        featured = true;
      } else if (i === 988) {
        name = '25 MM PPRC BORU (80 M KALDE)';
        description = '25 mm PN20 Kalde polipropilen tesisat borusu';
        price = 76.94;
        wholesalePrice = 32.65;
        stock = 89036;
        unit = 'METRE';
      } else if (i === 989) {
        name = '32*90 PPRC DİRSEK (KALDE)';
        description = '32 mm 90 derece Kalde PPRC dirsek';
        price = 16.8;
        wholesalePrice = 8.1;
        stock = 4800;
      } else if (i === 1007) {
        name = '20 LİK PPRC MANŞON (KALDE)';
        description = '20 mm Kalde PPRC düz boru ekleme manşonu';
        price = 4.51;
        wholesalePrice = 2.15;
        stock = 19321;
        minOrderQuantity = 25;
      } else if (i === 1008) {
        name = '25 LİK PPRC MANŞON (KALDE)';
        description = '25 mm Kalde PPRC ekleme manşonu';
        price = 6.76;
        wholesalePrice = 3.4;
        stock = 14838;
        minOrderQuantity = 20;
      } else if (i === 1009) {
        name = '32 LİK PPRC MANŞON (KALDE)';
        description = '32 mm Kalde PPRC ekleme manşonu';
        price = 11.2;
        wholesalePrice = 5.4;
        stock = 5400;
      } else if (i === 1013) {
        name = '25*20 PPRC REDÜKSİYON (KALDE)';
        description = '25 mm x 20 mm Kalde boru küçültme redüksiyonu';
        price = 5.55;
        wholesalePrice = 2.7;
        stock = 1308;
      } else if (i === 1020) {
        name = '20 LİK PPRC TE (KALDE)';
        description = '20 mm Kalde PPRC 3 yollu eşit te parçası';
        price = 9.02;
        wholesalePrice = 4.45;
        stock = 2115;
      } else if (i === 1021) {
        name = '25 LİK PPRC TE (KALDE)';
        description = '25 mm Kalde 3 yollu eşit te parçası';
        price = 12.46;
        wholesalePrice = 6.35;
        stock = 9830;
      } else if (i === 1022) {
        name = '32 LİK PPRC TE (KALDE)';
        description = '32 mm Kalde 3 yollu eşit te';
        price = 24.5;
        wholesalePrice = 11.8;
        stock = 3200;
      } else if (i === 1034) {
        name = '20*1/2 PPRC ÇİFTLİ BATARYA BAĞLANTISI';
        description = '150mm standart aralıklı çiftli batarya bağlantı şablonu';
        price = 149.54;
        wholesalePrice = 96.75;
        stock = 120;
      } else if (i === 1036) {
        name = '20*1/2 PPRC İÇ DİŞLİ DİRSEK (KALDE)';
        description = '20 mm x 1/2 inç sarı pirinç iç dişli PPRC dirsek';
        price = 55.02;
        wholesalePrice = 27.4;
        stock = 966;
      } else if (i === 1041) {
        name = '20*1/2 PPRC DIŞ DİŞLİ DİRSEK (KALDE)';
        description = '20 mm x 1/2 inç dış dişli sarı pirinç geçiş dirseği';
        price = 78.33;
        wholesalePrice = 34.35;
        stock = 753;
      } else if (i === 1049) {
        name = '20*1/2 PPRC İÇ DİŞLİ REKOR (KALDE)';
        description = '20 mm x 1/2 inç sarı pirinç iç dişli düz rakor';
        price = 56.52;
        wholesalePrice = 26.0;
        stock = 378;
      } else if (i === 1055) {
        name = '20*1/2 PPRC DIŞ DİŞLİ REKOR (KALDE)';
        description = '20 mm x 1/2 inç sarı pirinç dış dişli düz rakor';
        price = 67.35;
        wholesalePrice = 32.5;
        stock = 2885;
      } else if (i === 1067) {
        category = 'VANALAR & ÇEKVALFLER';
        subCategory = 'KALDE PPRC VANALAR';
        name = '20 LİK PPRC KALDE VANA';
        description = '20 mm kaynaklı plastik gövdeli Kalde küresel vana';
        price = 137.55;
        wholesalePrice = 70.5;
        stock = 209;
      } else if (i === 1068) {
        category = 'VANALAR & ÇEKVALFLER';
        subCategory = 'KALDE PPRC VANALAR';
        name = '25 LİK PPRC KALDE VANA';
        description = '25 mm kaynaklı Kalde PPRC küresel vana';
        price = 195.0;
        wholesalePrice = 98.0;
        stock = 140;
      } else if (i === 1069) {
        category = 'VANALAR & ÇEKVALFLER';
        subCategory = 'KALDE PPRC VANALAR';
        name = '32 LİK PPRC KALDE VANA';
        description = '32 mm kaynaklı Kalde PPRC küresel vana';
        price = 310.0;
        wholesalePrice = 155.0;
        stock = 85;
      } else if (i === 1080) {
        name = '20 LİK PPRC KAPAMA BAŞLIĞI (KALDE)';
        description = '20 mm kaynaklı Kalde PPRC kör tapa ve kapama başlığı';
        price = 5.5;
        wholesalePrice = 2.6;
        stock = 5444;
      } else if (i === 1093) {
        subCategory = 'KALDE PVC';
        name = '100*87 PVC DİRSEK (KALDE)';
        description = '100 mm 87 derece contalı PVC atık su dirseği';
        price = 124.79;
        wholesalePrice = 50.5;
        stock = 1903;
      } else if (i === 1097) {
        subCategory = 'KALDE PVC';
        name = '100*50 PVC REDÜKSİYON (KALDE)';
        description = '100 mm x 50 mm contalı PVC redüksiyon';
        price = 63.89;
        wholesalePrice = 30.0;
        stock = 220;
      } else if (i === 1098) {
        subCategory = 'KALDE PVC';
        name = '100*70 PVC REDÜKSİYON (KALDE)';
        description = '100 mm x 70 mm contalı PVC redüksiyon';
        price = 85.0;
        wholesalePrice = 38.0;
        stock = 350;
      } else {
        const size = PPRC_SIZES[i % PPRC_SIZES.length];
        const kind = (i % 5 === 0) ? 'DİRSEK 90°' : (i % 5 === 1) ? 'TE PARÇASI' : (i % 5 === 2) ? 'MANŞON' : (i % 5 === 3) ? 'KÖPRÜ KAVİS' : 'DİŞLİ GEÇİŞ REKORU';
        name = `${size} PPRC ${kind} (KALDE) (${i})`;
        description = `${size} Kalde PN25 polipropilen kaynak bağlantı parçası`;
        price = 8.0 + (i % 15) * 6;
        wholesalePrice = price * 0.45;
        stock = 1000 + (i % 2000);
      }
    }

    // --- RANGE 1101-1250: KALDE PVC ATIK SU VE KOMPOZİT BORULAR ---
    else if (i >= 1101 && i <= 1250) {
      category = 'PPRC & PVC BORU SİSTEMLERİ';
      if (i === 1105) {
        subCategory = 'KALDE PVC';
        name = '50*50 PVC TEK ÇATAL (45 DERECE)';
        description = '50 mm x 50 mm 45 derece contalı tek çatal';
        price = 68.0;
        wholesalePrice = 28.5;
        stock = 2100;
      } else if (i === 1107) {
        subCategory = 'KALDE PVC';
        name = '100*50 PVC TEK ÇATAL (45 DERECE)';
        description = '100 mm x 50 mm 45 derece contalı tek çatal';
        price = 144.49;
        wholesalePrice = 56.0;
        stock = 948;
      } else if (i === 1108) {
        subCategory = 'KALDE PVC';
        name = '100*100 PVC TEK ÇATAL (45 DERECE)';
        description = '100 mm x 100 mm 45 derece contalı tek çatal';
        price = 185.0;
        wholesalePrice = 75.0;
        stock = 820;
      } else if (i === 1155) {
        subCategory = 'KALDE PVC';
        name = '100 PVC KAYAR MANŞON (KALDE)';
        description = '100 mm tamir ve kayar manşon contalı';
        price = 108.4;
        wholesalePrice = 47.5;
        stock = 732;
      } else if (i === 1170) {
        subCategory = 'KALDE PVC';
        name = '50*1000 3,2 PVC BORU (KALDE)';
        description = '50 mm çap x 100 cm boy contalı 3.2 mm kalın etli PVC atık su borusu';
        price = 145.0;
        wholesalePrice = 72.0;
        stock = 2400;
      } else if (i === 1171) {
        subCategory = 'KALDE PVC';
        name = '50*2000 3,2 PVC BORU (KALDE)';
        description = '50 mm çap x 200 cm boy contalı PVC boru';
        price = 275.0;
        wholesalePrice = 135.0;
        stock = 1800;
      } else if (i === 1175) {
        subCategory = 'KALDE PVC';
        name = '70*1000 3,2 PVC BORU (KALDE)';
        description = '70 mm çap x 100 cm boy contalı 3.2 mm PVC boru';
        price = 210.0;
        wholesalePrice = 98.0;
        stock = 1450;
      } else if (i === 1180) {
        subCategory = 'KALDE PVC';
        name = '100*1000 3,2 PVC BORU (KALDE)';
        description = '100 mm çap x 100 cm boy contalı 3.2 mm kalın etli PVC atık su borusu';
        price = 287.24;
        wholesalePrice = 140.6;
        stock = 1264;
        featured = true;
      } else if (i === 1181) {
        subCategory = 'KALDE PVC';
        name = '100*2000 3,2 PVC BORU (KALDE)';
        description = '100 mm çap x 200 cm boy contalı 3.2 mm PVC boru';
        price = 549.21;
        wholesalePrice = 235.2;
        stock = 906;
      } else if (i === 1182) {
        subCategory = 'KALDE PVC';
        name = '100*3000 3,2 PVC BORU (KALDE)';
        description = '100 mm çap x 300 cm boy contalı 3.2 mm PVC boru';
        price = 811.17;
        wholesalePrice = 348.0;
        stock = 1461;
        featured = true;
      } else if (i === 1190) {
        subCategory = 'KALDE PVC';
        name = '50*45 PVC DİRSEK (KALDE)';
        description = '50 mm 45 derece contalı PVC atık su dirseği';
        price = 45.0;
        wholesalePrice = 18.5;
        stock = 5200;
      } else if (i === 1191) {
        subCategory = 'KALDE PVC';
        name = '50*87 PVC DİRSEK (KALDE)';
        description = '50 mm 87 derece contalı PVC atık su dirseği';
        price = 48.0;
        wholesalePrice = 20.0;
        stock = 4600;
      } else if (i === 1193) {
        subCategory = 'KALDE PVC';
        name = '100*45 PVC DİRSEK (KALDE)';
        description = '100 mm 45 derece contalı PVC atık su dirseği';
        price = 105.69;
        wholesalePrice = 40.0;
        stock = 4099;
      } else if (i === 1197) {
        subCategory = 'KALDE PPRC';
        name = '20*90 PPRC DİRSEK (KALDE)';
        description = '20 mm 90 derece Kalde PPRC kaynak dirseği';
        price = 7.3;
        wholesalePrice = 2.95;
        stock = 11908;
      } else if (i === 1198) {
        subCategory = 'KALDE PPRC';
        name = '20*45 PPRC DİRSEK (KALDE)';
        description = '20 mm 45 derece Kalde PPRC kaynak dirseği';
        price = 8.5;
        wholesalePrice = 3.4;
        stock = 6200;
      } else if (i === 1219) {
        subCategory = 'KALDE PPRC';
        name = '25 LİK KOMPOZİT PPRC BORU (KALDE)';
        description = '25 mm cam elyaf kompozit sıcak su tesisat borusu';
        price = 71.67;
        wholesalePrice = 30.9;
        stock = 6400;
        unit = 'METRE';
        featured = true;
      } else if (i === 1220) {
        subCategory = 'KALDE PPRC';
        name = '32 LİK KOMPOZİT PPRC BORU (KALDE)';
        description = '32 mm cam elyaf takviyeli kompozit PPRC boru';
        price = 112.5;
        wholesalePrice = 52.0;
        stock = 3100;
        unit = 'METRE';
      } else if (i === 1223) {
        subCategory = 'KALDE PPRC';
        name = '20 LİK KOMPOZİT PPRC BORU (KALDE)';
        description = '20 mm cam elyaf takviyeli kompozit sıcak/soğuk su tesisat borusu (4 metre)';
        price = 45.5;
        wholesalePrice = 19.5;
        stock = 4300;
        unit = 'METRE';
        featured = true;
      } else {
        const size = PVC_SIZES[i % PVC_SIZES.length];
        const len = PVC_LENGTHS[i % PVC_LENGTHS.length];
        subCategory = 'KALDE PVC';
        name = `${size}*${len} PVC ATIK SU BORUSU & EK PARÇASI (KALDE) (${i})`;
        description = `${size} mm contalı Kalde 3.2 mm kalın etli pimaş boru/fittings`;
        price = 80.0 + (i % 15) * 20;
        wholesalePrice = price * 0.45;
        stock = 800 + (i % 1000);
      }
    }

    // --- RANGE 1251-1450: REKORLAR, SARI UZATMALAR VE NİPELLER ---
    else if (i >= 1251 && i <= 1450) {
      category = 'REKORLAR & UZATMALAR';
      subCategory = 'SARI MALZEME';
      if (i === 1386) {
        name = '1 CM UZATMA SARI';
        description = '1 cm sarı pirinç armatür ve tesisat uzatma nipeli';
        price = 12.0;
        wholesalePrice = 9.5;
        stock = 150;
      } else if (i === 1387) {
        name = '1" SARI NİPEL';
        description = '1 inç birinci kalite sarı pirinç çift taraflı nipel';
        price = 55.0;
        wholesalePrice = 44.0;
        stock = 70;
      } else if (i === 1388) {
        name = '2 CM UZATMA SARI';
        description = '2 cm sarı pirinç armatür uzatması';
        price = 18.0;
        wholesalePrice = 14.5;
        stock = 240;
      } else if (i === 1389) {
        name = '3 CM UZATMA SARI';
        description = '3 cm sarı pirinç armatür uzatması';
        price = 24.0;
        wholesalePrice = 19.0;
        stock = 180;
      } else if (i === 1390) {
        name = '5 CM UZATMA SARI';
        description = '5 cm sarı pirinç tesisat uzatması';
        price = 38.0;
        wholesalePrice = 30.0;
        stock = 120;
      } else if (i === 1398) {
        name = '1" HORTUM REKORU (SARI)';
        description = '1 inç sarı pirinç kuyruklu hortum bağlantı rekoru';
        price = 55.0;
        wholesalePrice = 44.0;
        stock = 65;
      } else if (i === 1408) {
        subCategory = 'DEMİR MALZEME';
        name = '1" KONİK REKOR (DEMİR)';
        description = '1 inç konik sızdırmaz demir tesisat rekoru';
        price = 100.0;
        wholesalePrice = 82.0;
        stock = 40;
      } else if (i === 1413) {
        name = '1/2" DÜZ REKOR (SARI MALZEME)';
        description = '1/2 inç düz sarı pirinç rekor';
        price = 95.0;
        wholesalePrice = 76.0;
        stock = 90;
      } else if (i === 1414) {
        name = '3/4" DÜZ REKOR (SARI MALZEME)';
        description = '3/4 inç düz sarı pirinç rekor';
        price = 135.0;
        wholesalePrice = 108.0;
        stock = 65;
      } else if (i === 1415) {
        name = '1" DÜZ REKOR (SARI MALZEME)';
        description = '1 inç düz sarı pirinç birleştirme rekoru';
        price = 180.0;
        wholesalePrice = 145.0;
        stock = 35;
      } else if (i === 1426) {
        subCategory = 'DEMİR REKORLAR';
        name = '1 CM DEMİR UZATMA';
        description = '1 cm galvaniz kaplamalı dayanıklı demir uzatma parçası';
        price = 15.0;
        wholesalePrice = 12.0;
        stock = 1090;
      } else if (i === 1438) {
        name = '1" KÖŞE REKOR (SARI)';
        description = '1 inç 90 derece açılı köşe sarı rekor bağlantısı';
        price = 280.0;
        wholesalePrice = 230.0;
        stock = 20;
      } else {
        const size = SIZES[i % SIZES.length];
        const kind = (i % 4 === 0) ? 'SARI DÜZ REKOR' : (i % 4 === 1) ? 'SARI KÖŞE REKOR' : (i % 4 === 2) ? 'SARI BORU UZATMASI' : 'SARI HORTUM NİPELİ';
        name = `${size} ${kind} (${i})`;
        description = `${size} MS58 pirinç döküm sızdırmaz rekor bağlantısı`;
        price = 45.0 + (i % 12) * 18;
        wholesalePrice = price * 0.8;
        stock = 100 + (i % 120);
      }
    }

    // --- RANGE 1451-1650: BORU KILIFLARI, İZOLASYON, ASKI VE KELEPÇELER ---
    else if (i >= 1451 && i <= 1650) {
      category = 'KELEPÇE & MONTAJ & SARF';
      if (i === 1464) {
        subCategory = 'BORU KILIFLARI';
        name = '1" BORU KILIFI (KIRMIZI/MAVİ)';
        description = 'Yalıtımlı koruyucu oluklu plastik boru kılıfı';
        price = 5.0;
        wholesalePrice = 4.0;
        stock = 2164;
        unit = 'METRE';
      } else if (i === 1465) {
        subCategory = 'BORU KILIFLARI';
        name = '1/2" BORU KILIFI (KIRMIZI/MAVİ)';
        description = '1/2 inç koruyucu spiral plastik boru kılıfı';
        price = 4.5;
        wholesalePrice = 3.5;
        stock = 3500;
        unit = 'METRE';
      } else {
        subCategory = 'BORU İZOLASYON & KELEPÇE';
        const size = SIZES[i % SIZES.length];
        name = `${size} BORU İZOLASYONU & TRİFONLU KELEPÇE (${i})`;
        description = `${size} polietilen boru izolasyon kılıfı ve montaj kelepçesi`;
        price = 15.0 + (i % 10) * 8;
        wholesalePrice = price * 0.75;
        stock = 500;
      }
    }

    // --- RANGE 1651-1780: VİTRİFİYE, BANYO, GÖMME REZERVUAR, KLOZET & LAVABOLAR ---
    else if (i >= 1651 && i <= 1780) {
      category = 'VİTRİFİYE & BANYO';
      if (i === 1730) {
        subCategory = 'TURKUAZ VİTRİFİYE';
        name = 'AQUA ASMA KLOZET TAKIMI (TURKUAZ)';
        description = 'Rimless (kanalsız) hijyenik yıkama sistemli asma klozet ve amortisörlü kapak';
        price = 6085.0;
        wholesalePrice = 4950.0;
        stock = 12;
        featured = true;
      } else if (i === 1731) {
        subCategory = 'TURKUAZ VİTRİFİYE';
        name = 'BELLA ASMA KLOZET TAKIMI (TURKUAZ)';
        description = 'Kompakt ölçülü kanalsız asma klozet ve yavaş kapanan kapak';
        price = 5450.0;
        wholesalePrice = 4400.0;
        stock = 15;
      } else if (i === 1732) {
        subCategory = 'GÖMME REZERVUAR';
        name = 'TURKUAZ GÖMME REZERVUAR SETİ (ASMA KLOZET UYUMLU)';
        description = '3/6 Litre çift kademeli sessiz dolum mekanizmalı 8 cm ince gömme rezervuar';
        price = 3650.0;
        wholesalePrice = 2950.0;
        stock = 25;
        unit = 'TAKIM';
        featured = true;
      } else if (i === 1733) {
        subCategory = 'GÖMME REZERVUAR';
        name = 'ÇİFT KADEMELİ KROM KUMANDA PANELİ';
        description = 'Parlak kromajlı gömme rezervuar basma butonu';
        price = 450.0;
        wholesalePrice = 350.0;
        stock = 45;
      } else if (i === 1734) {
        subCategory = 'TURKUAZ VİTRİFİYE';
        name = '60 CM TEZGAH ÜSTÜ ÇANAK LAVABO (TURKUAZ)';
        description = '60x40 cm modern beyaz porselen tezgah üstü çanak lavabo';
        price = 2450.0;
        wholesalePrice = 1980.0;
        stock = 16;
      } else if (i === 1735) {
        subCategory = 'MONTAJ MALZEMELERİ';
        name = 'KÖRÜKLÜ KLOZET KADASI (EKSANTRİK)';
        description = 'Klozet pis su gider bağlantı körüğü contalı';
        price = 95.0;
        wholesalePrice = 65.0;
        stock = 140;
      } else if (i === 1736) {
        subCategory = 'SİFONLAR';
        name = 'KÖRÜKLÜ LAVABO SİFONU (PİRİNÇ VİDALI)';
        description = 'Paslanmaz süzgeçli ve pirinç vidalı körüklü lavabo sifonu';
        price = 65.0;
        wholesalePrice = 42.0;
        stock = 280;
      } else {
        subCategory = 'VİTRİFİYE & SİFON AKSESUARLARI';
        const itemType = (i % 4 === 0) ? 'LAVABO AÇ-KAPA SİFONU' : (i % 4 === 1) ? 'KLOZET İÇ TAKIMI (ÇİFT KADEMELİ)' : (i % 4 === 2) ? 'YER SÜZGECİ PASLANMAZ 10X10' : 'BANYO DUŞ KANALI 40 CM';
        name = `${itemType} - TURKUAZ & STANDART (${i})`;
        description = '1. sınıf hijyenik banyo ve gider ekipmanı';
        price = 150.0 + (i % 15) * 45;
        wholesalePrice = price * 0.75;
        stock = 80 + (i % 100);
      }
    }

    // --- RANGE 1781-1835: PIRINÇ KÜRESEL VANALAR (PN25 & PN16), DOĞALGAZ VANALARI, KİLİTLİ VANALAR ---
    else {
      category = 'VANALAR & ÇEKVALFLER';
      if (i === 1791) {
        subCategory = 'ÖZENİŞ VANALAR';
        name = '1" ÖZEN İŞ VANA';
        description = '1 inç tam geçişli ağır tip pirinç küresel vana';
        price = 738.57;
        wholesalePrice = 620.0;
        stock = 18;
      } else if (i === 1821) {
        subCategory = 'KÜRESEL VANALAR';
        name = '1" DAR VANA';
        description = '1 inç dar gövde pirinç küresel su vanası';
        price = 195.0;
        wholesalePrice = 160.0;
        stock = 45;
      } else if (i === 1825) {
        subCategory = 'KÜRESEL VANALAR';
        name = '1/2" VANA (PİRİNÇ KÜRESEL PN25)';
        description = '1/2 inç tam geçişli pirinç küresel su vanası, PN25 basınca dayanıklı';
        price = 165.0;
        wholesalePrice = 132.0;
        stock = 180;
        featured = true;
      } else if (i === 1826) {
        subCategory = 'KÜRESEL VANALAR';
        name = '3/4" VANA (PİRİNÇ KÜRESEL PN25)';
        description = '3/4 inç tam geçişli pirinç küresel su vanası';
        price = 235.0;
        wholesalePrice = 188.0;
        stock = 140;
        featured = true;
      } else if (i === 1827) {
        subCategory = 'KÜRESEL VANALAR';
        name = '1" VANA (PİRİNÇ KÜRESEL)';
        description = '1 inç PN25 tam geçişli pirinç küresel su vanası';
        price = 315.0;
        wholesalePrice = 255.0;
        stock = 65;
        featured = true;
      } else if (i === 1828) {
        subCategory = 'KÜRESEL VANALAR';
        name = '1 1/4" VANA (PİRİNÇ KÜRESEL PN25)';
        description = '1 1/4 inç tam geçişli pirinç küresel su vanası';
        price = 540.0;
        wholesalePrice = 435.0;
        stock = 45;
      } else if (i === 1829) {
        subCategory = 'KÜRESEL VANALAR';
        name = '1 1/2" VANA (PİRİNÇ KÜRESEL PN25)';
        description = '1 1/2 inç ağır tip pirinç küresel vana';
        price = 760.0;
        wholesalePrice = 615.0;
        stock = 35;
      } else if (i === 1830) {
        subCategory = 'KÜRESEL VANALAR';
        name = '2" VANA (PİRİNÇ KÜRESEL PN25)';
        description = '2 inç ağır tip tam geçişli pirinç küresel vana';
        price = 1150.0;
        wholesalePrice = 940.0;
        stock = 25;
      } else if (i === 1831) {
        subCategory = 'DOĞALGAZ VANALARI';
        name = '1/2" DOĞALGAZ VANASI (MOP 5)';
        description = '1/2 inç TSE EN 331 onaylı sarı kollu pirinç doğalgaz vanası';
        price = 175.0;
        wholesalePrice = 140.0;
        stock = 220;
        featured = true;
      } else if (i === 1832) {
        subCategory = 'DOĞALGAZ VANALARI';
        name = '3/4" DOĞALGAZ VANASI (MOP 5)';
        description = '3/4 inç TSE EN 331 onaylı sarı kollu gaz vanası';
        price = 245.0;
        wholesalePrice = 198.0;
        stock = 160;
        featured = true;
      } else if (i === 1833) {
        subCategory = 'KİLİTLİ VANALAR';
        name = '1" KİLİTLİ SAYAÇ VANASI';
        description = '1 inç mühürlenebilir kilitli doğalgaz ve sayaç vanası';
        price = 388.0;
        wholesalePrice = 315.0;
        stock = 46;
        featured = true;
      } else if (i === 1834) {
        subCategory = 'DOĞALGAZ VANALARI';
        name = '1" DOĞALGAZ VANASI (MOP 5)';
        description = '1 inç TSE EN 331 onaylı doğalgaz küresel vanası';
        price = 345.0;
        wholesalePrice = 280.0;
        stock = 90;
        featured = true;
      } else if (i === 1835) {
        subCategory = 'KİLİTLİ VANALAR';
        name = '3/4" KİLİTLİ SAYAÇ VANASI';
        description = '3/4 inç mühür kulaklı kilitli gaz ve su vanası';
        price = 295.0;
        wholesalePrice = 240.0;
        stock = 75;
      } else {
        const size = SIZES[i % SIZES.length];
        subCategory = 'KÜRESEL VANALAR';
        name = `${size} PN25 PİRİNÇ KÜRESEL VANA (${i})`;
        description = `${size} tam geçişli pirinç gövdeli su ve tesisat vanası`;
        price = 180.0 + (i % 10) * 40;
        wholesalePrice = price * 0.8;
        stock = 60 + (i % 50);
      }
    }

    products.push({
      id,
      name,
      category,
      subCategory,
      description,
      price: Math.round(price * 100) / 100,
      wholesalePrice: Math.round((wholesalePrice || price * 0.8) * 100) / 100,
      stock,
      unit,
      minOrderQuantity,
      imageUrl: '',
      sku,
      barcode,
      vatRate: 20,
      featured,
    });
  }

  return products;
}
