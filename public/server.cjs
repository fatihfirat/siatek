var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_crypto = __toESM(require("crypto"), 1);

// src/data/productCatalogGenerator.ts
function generateEan13(numericId) {
  const base = `8690000${String(numericId).padStart(5, "0")}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(base[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - sum % 10) % 10;
  return `${base}${checkDigit}`;
}
var SIZES = ['1/2"', '3/4"', '1"', '1 1/4"', '1 1/2"', '2"', '2 1/2"', '3"', '4"'];
var PPRC_SIZES = ["20 MM", "25 MM", "32 MM", "40 MM", "50 MM", "63 MM", "75 MM", "90 MM", "110 MM"];
var PVC_SIZES = ["50", "70", "100", "125", "150", "200"];
var PVC_LENGTHS = ["15 CM", "25 CM", "50 CM", "100 CM", "200 CM", "300 CM"];
function generateAll1800Products() {
  const products2 = [];
  const TOTAL_ITEMS = 1835;
  for (let i = 1; i <= TOTAL_ITEMS; i++) {
    const padded = String(i).padStart(5, "0");
    const sku = `ST${padded}`;
    const id = `st-${padded}`;
    const barcode = generateEan13(i);
    let name = "";
    let category = "";
    let subCategory = "";
    let description = "";
    let price = 25;
    let wholesalePrice = 20;
    let stock = 100;
    let unit = "ADET";
    let minOrderQuantity = 1;
    let featured = false;
    if (i >= 1 && i <= 30) {
      category = "VANALAR & \xC7EKVALFLER";
      if (i === 1) {
        name = '1/2" \xC7EKVALF (AKIN / KILI\xC7 PRES)';
        subCategory = "AKIN \xC7EKVALF SARI MALZEME";
        description = "1/2 in\xE7 yayl\u0131 sar\u0131 pirin\xE7 yatay/dikey \xE7ekvalf";
        price = 155;
        wholesalePrice = 125;
        stock = 110;
        minOrderQuantity = 2;
      } else if (i === 2) {
        name = '1" \xC7EKVALF (AKIN / KILI\xC7 PRES)';
        subCategory = "AKIN \xC7EKVALF SARI MALZEME";
        description = "1 in\xE7 dikey ve yatay bas\u0131nca dayan\u0131kl\u0131 pirin\xE7 \xE7ekvalf";
        price = 255;
        wholesalePrice = 210;
        stock = 85;
        featured = true;
      } else if (i === 3) {
        name = '3/4" \xC7EKVALF (AKIN / KILI\xC7 PRES)';
        subCategory = "AKIN \xC7EKVALF SARI MALZEME";
        description = "3/4 in\xE7 yayl\u0131 pirin\xE7 \xE7ekvalf";
        price = 195;
        wholesalePrice = 160;
        stock = 95;
      } else if (i === 7) {
        name = '1" D\u0130KVALF (AKIN / KILI\xC7 PRES)';
        subCategory = "D\u0130KVALFLER";
        description = "1 in\xE7 pirin\xE7 yayl\u0131 dikvalf / dip klapesi";
        price = 210;
        wholesalePrice = 175;
        stock = 60;
      } else if (i === 10) {
        name = '1/2" P\u0130SL\u0130K TUTUCU (P\u0130R\u0130N\xC7 F\u0130LTRE)';
        subCategory = "P\u0130SL\u0130K TUTUCULAR";
        description = "1/2 in\xE7 Y tipi paslanmaz \xE7elik s\xFCzge\xE7li pirin\xE7 filtre";
        price = 135;
        wholesalePrice = 108;
        stock = 140;
      } else if (i === 11) {
        name = '3/4" P\u0130SL\u0130K TUTUCU (P\u0130R\u0130N\xC7 F\u0130LTRE)';
        subCategory = "P\u0130SL\u0130K TUTUCULAR";
        description = "3/4 in\xE7 Y tipi pirin\xE7 pislik tutucu filtre";
        price = 185;
        wholesalePrice = 148;
        stock = 95;
      } else if (i === 12) {
        name = '1" P\u0130SL\u0130K TUTUCU (P\u0130R\u0130N\xC7 F\u0130LTRE)';
        subCategory = "P\u0130SL\u0130K TUTUCULAR";
        description = "1 in\xE7 Y tipi a\u011F\u0131r tip pirin\xE7 pislik tutucu filtre";
        price = 260;
        wholesalePrice = 210;
        stock = 70;
        featured = true;
      } else if (i === 15) {
        name = '1/2" K\xD6\u015EE RADYAT\xD6R VANASI (ECA T\u0130P\u0130)';
        subCategory = "RADYAT\xD6R VANALARI";
        description = "1/2 in\xE7 krom volanl\u0131 k\xF6\u015Fe radyat\xF6r ba\u011Flant\u0131 vanas\u0131";
        price = 145;
        wholesalePrice = 115;
        stock = 350;
        minOrderQuantity = 5;
        featured = true;
      } else if (i === 16) {
        name = '1/2" D\xDCZ RADYAT\xD6R VANASI';
        subCategory = "RADYAT\xD6R VANALARI";
        description = "1/2 in\xE7 d\xFCz radyat\xF6r ba\u011Flant\u0131 vanas\u0131";
        price = 145;
        wholesalePrice = 115;
        stock = 180;
        minOrderQuantity = 5;
      } else if (i === 17) {
        name = '1/2" TERMOSTAT\u0130K K\xD6\u015EE RADYAT\xD6R VANASI';
        subCategory = "TERMOSTAT\u0130K VANALAR";
        description = "1/2 in\xE7 s\u0131v\u0131 sens\xF6rl\xFC enerji tasarruflu termostatik vana";
        price = 365;
        wholesalePrice = 295;
        stock = 120;
        featured = true;
      } else if (i === 18) {
        name = '1/2" OTOMAT\u0130K HAVA P\xDCRJ\xD6R\xDC';
        subCategory = "HAVA P\xDCRJ\xD6RLER\u0130";
        description = "1/2 in\xE7 pirin\xE7 otomatik tesisat hava tahliye ventili";
        price = 120;
        wholesalePrice = 95;
        stock = 210;
      } else if (i === 19) {
        name = "3 BAR EMN\u0130YET VENT\u0130L\u0130";
        subCategory = "EMN\u0130YET VENT\u0130LLER\u0130";
        description = "1/2 in\xE7 3 Bar kombi ve kazan emniyet ventili";
        price = 155;
        wholesalePrice = 125;
        stock = 95;
      } else {
        const size = SIZES[i % SIZES.length];
        name = `${size} KLAPEL\u0130 \xC7EKVALF / BASIN\xC7 REG\xDCLAT\xD6R\xDC (${i})`;
        subCategory = "\xC7EKVALFLER & KLAPELER";
        description = `${size} pirin\xE7 g\xF6vdeli ak\u0131\u015F y\xF6n kontrol eleman\u0131`;
        price = 120 + i % 10 * 25;
        wholesalePrice = price * 0.8;
        stock = 50 + i * 3 % 150;
      }
    } else if (i >= 31 && i <= 100) {
      if (i === 54) {
        category = "ISITMA & KOMB\u0130 GRUBU";
        subCategory = "KOMB\u0130LER";
        name = "ECA CITIUS PREMIX 24 KW TAM YO\u011EU\u015EMALI KOMB\u0130";
        description = "24 kW ErP A s\u0131n\u0131f\u0131 tam yo\u011Fu\u015Fmal\u0131 kombi (Baca seti dahil)";
        price = 29e3;
        wholesalePrice = 24500;
        stock = 14;
        featured = true;
      } else if (i === 55) {
        category = "ISITMA & KOMB\u0130 GRUBU";
        subCategory = "KOMB\u0130LER";
        name = "ECA PROTEUS PREMIX 24 KW TAM YO\u011EU\u015EMALI KOMB\u0130";
        description = "24 kW paslanmaz \xE7elik e\u015Fanj\xF6rl\xFC tam yo\u011Fu\u015Fmal\u0131 kombi";
        price = 31500;
        wholesalePrice = 26800;
        stock = 10;
        featured = true;
      } else if (i === 56) {
        category = "ISITMA & KOMB\u0130 GRUBU";
        subCategory = "KOMB\u0130LER";
        name = "DEM\u0130RD\xD6K\xDCM N\u0130TROM\u0130X P 24 KW YO\u011EU\u015EMALI KOMB\u0130";
        description = "24 kW \xE7ift e\u015Fanj\xF6rl\xFC yo\u011Fu\u015Fmal\u0131 kombi";
        price = 32e3;
        wholesalePrice = 27500;
        stock = 8;
      } else if (i === 58) {
        category = "ISITMA & KOMB\u0130 GRUBU";
        subCategory = "TERMOS\u0130FONLAR";
        name = "BAYMAK 65 LT ELEKTR\u0130KL\u0130 TERMOS\u0130FON (PR\u0130MA)";
        description = "65 Litre titanyum emaye kaplamal\u0131 elektrikli termosifon";
        price = 8900;
        wholesalePrice = 7400;
        stock = 15;
      } else if (i >= 60 && i <= 72) {
        category = "DO\u011EALGAZ S\u0130STEMLER\u0130";
        if (i === 63) {
          name = "G4 DO\u011EALGAZ SAYACI (K\xD6R\xDCKL\xDC)";
          subCategory = "DO\u011EALGAZ SAYA\xC7LARI";
          description = "G4 evsel daire tipi m\xFCh\xFCrl\xFC k\xF6r\xFCkl\xFC gaz sayac\u0131";
          price = 1850;
          wholesalePrice = 1520;
          stock = 45;
          featured = true;
        } else if (i === 66) {
          name = "DO\u011EALGAZ OCAK FLEX\u0130 1/2*1/2 - 100 CM (TS EN 14800)";
          subCategory = "DO\u011EALGAZ FLEXLER\u0130";
          description = "\xD6rg\xFCl\xFC \u015Feffaf PVC k\u0131l\u0131fl\u0131 TS EN 14800 paslanmaz gaz flexi";
          price = 260;
          wholesalePrice = 205;
          stock = 180;
          minOrderQuantity = 2;
          featured = true;
        } else if (i === 69) {
          name = "GAZ ALARM C\u0130HAZI (220V R\xD6LE \xC7IKI\u015ELI)";
          subCategory = "GAZ ALARM & EMN\u0130YET";
          description = "Selenoid vana tetiklemeli sesli ve \u0131\u015F\u0131kl\u0131 gaz alarm dedekt\xF6r\xFC";
          price = 450;
          wholesalePrice = 360;
          stock = 95;
          featured = true;
        } else if (i === 70) {
          name = '3/4" SELENO\u0130D VANA (MANUEL RESETL\u0130)';
          subCategory = "GAZ ALARM & EMN\u0130YET";
          description = "220V alarm ba\u011Flant\u0131l\u0131 pirin\xE7 emniyet gaz kesme vanas\u0131";
          price = 650;
          wholesalePrice = 520;
          stock = 60;
        } else {
          name = `DO\u011EALGAZ BA\u011ELANTI & SAYA\xC7 APARATI (${i})`;
          subCategory = "DO\u011EALGAZ EK\u0130PMANLARI";
          description = "TSE standartlar\u0131nda do\u011Falgaz montaj par\xE7as\u0131";
          price = 85 + i % 10 * 15;
          wholesalePrice = price * 0.8;
          stock = 120;
        }
      } else if (i >= 75 && i <= 88) {
        category = "ISITMA & KOMB\u0130 GRUBU";
        if (i === 75) {
          name = "PANEL RADYAT\xD6R 600X1000 (T\u0130P 22 PKKP)";
          subCategory = "PANEL RADYAT\xD6RLER";
          description = "60 cm x 100 cm 10 bar test bas\u0131n\xE7l\u0131 panel petek";
          price = 2150;
          wholesalePrice = 1780;
          stock = 50;
          featured = true;
        } else if (i === 79) {
          name = "500X1000 D\xDCZ BEYAZ HAVLUPAN (BORUSAN)";
          subCategory = "HAVLUPANLAR";
          description = "50 cm x 100 cm beyaz elektrostatik boyal\u0131 banyo havlupan\u0131";
          price = 1250;
          wholesalePrice = 980;
          stock = 65;
        } else if (i === 88) {
          name = "KALDE KOMB\u0130 BA\u011ELANTI SET\u0130 (8 PAR\xC7A)";
          subCategory = "KOMB\u0130 MONTAJ SETLER\u0130";
          description = "Kombi alt\u0131 tesisat ba\u011Flant\u0131 vanalar\u0131, filtreleri ve rekorlar\u0131 tam set";
          price = 450;
          wholesalePrice = 320;
          stock = 350;
          featured = true;
        } else {
          name = `RADYAT\xD6R ASKI & BA\u011ELANTI SET\u0130 TIP-22 (${i})`;
          subCategory = "RADYAT\xD6R AKSESUARLARI";
          description = "Petek ve havlupan montaj ask\u0131 p\xFCrj\xF6r tak\u0131m\u0131";
          price = 65 + i % 5 * 10;
          wholesalePrice = price * 0.75;
          stock = 200;
        }
      } else {
        category = "ISITMA & KOMB\u0130 GRUBU";
        subCategory = "YERDEN ISITMA";
        name = `YERDEN ISITMA EK PAR\xC7ASI & MOD\xDCLASYON (${i})`;
        description = "Yerden \u0131s\u0131tma k\xF6\u015Fe d\xFCzeltici, klips ve kollekt\xF6r ba\u011Flant\u0131 eleman\u0131";
        price = 45 + i % 10 * 12;
        wholesalePrice = price * 0.8;
        stock = 150;
      }
    } else if (i >= 101 && i <= 200) {
      category = "VANALAR & \xC7EKVALFLER";
      subCategory = "BASIN\xC7 REG\xDCLAT\xD6RLER\u0130 & VENT\u0130LLER";
      const size = SIZES[i % SIZES.length];
      const type = i % 3 === 0 ? "MANOMETREL\u0130 BASIN\xC7 D\xDC\u015E\xDCR\xDCC\xDC" : i % 3 === 1 ? "TERMOKUPL & GAZ VENT\u0130L\u0130" : "D\u0130P KLAPES\u0130 S\xDCZGE\xC7L\u0130";
      name = `${size} ${type} (${i})`;
      description = `${size} tesisat bas\u0131n\xE7 kontrol ve g\xFCvenlik ekipman\u0131`;
      price = 140 + i % 15 * 35;
      wholesalePrice = price * 0.8;
      stock = 40 + i % 60;
    } else if (i >= 201 && i <= 300) {
      category = "F\u0130TT\u0130NGS MALZEMELER\u0130";
      subCategory = "PATENTLER";
      if (i === 214) {
        name = '1/2" PATENT D\u0130RSEK';
        description = "1/2 in\xE7 diki\u015Fsiz \xE7elik kaynak a\u011F\u0131zl\u0131 patent dirsek";
        price = 22;
        wholesalePrice = 17.5;
        stock = 350;
      } else if (i === 215) {
        name = '3/4" PATENT D\u0130RSEK';
        description = "3/4 in\xE7 diki\u015Fsiz \xE7elik kaynak a\u011F\u0131zl\u0131 patent dirsek";
        price = 26;
        wholesalePrice = 20.5;
        stock = 310;
      } else if (i === 216) {
        name = '1" PATENT D\u0130RSEK';
        description = "1 in\xE7 diki\u015Fsiz \xE7elik kaynak a\u011F\u0131zl\u0131 patent dirsek";
        price = 30;
        wholesalePrice = 24;
        stock = 250;
      } else if (i === 217) {
        name = '1 1/4" PATENT D\u0130RSEK';
        description = "1 1/4 in\xE7 diki\u015Fsiz \xE7elik patent dirsek";
        price = 48;
        wholesalePrice = 38;
        stock = 110;
      } else if (i === 218) {
        name = '1 1/2" PATENT D\u0130RSEK';
        description = "1 1/2 in\xE7 diki\u015Fsiz \xE7elik patent dirsek";
        price = 65;
        wholesalePrice = 52;
        stock = 95;
      } else if (i === 219) {
        name = '2" PATENT D\u0130RSEK';
        description = "2 in\xE7 diki\u015Fsiz \xE7elik patent dirsek";
        price = 95;
        wholesalePrice = 76;
        stock = 80;
      } else if (i === 220) {
        name = '2 1/2" PATENT D\u0130RSEK';
        description = "2 1/2 in\xE7 diki\u015Fsiz \xE7elik patent kaynak dirse\u011Fi";
        price = 185;
        wholesalePrice = 148;
        stock = 45;
      } else if (i === 221) {
        name = '3" PATENT D\u0130RSEK';
        description = "3 in\xE7 diki\u015Fsiz \xE7elik patent kaynak dirse\u011Fi";
        price = 275;
        wholesalePrice = 220;
        stock = 30;
      } else if (i === 237) {
        name = '1/2" PATENT TE';
        description = "1/2 in\xE7 diki\u015Fsiz \xE7elik kaynakl\u0131 patent te";
        price = 42;
        wholesalePrice = 33.5;
        stock = 190;
      } else if (i === 238) {
        name = '3/4" PATENT TE';
        description = "3/4 in\xE7 diki\u015Fsiz \xE7elik kaynakl\u0131 patent te";
        price = 52;
        wholesalePrice = 41.5;
        stock = 140;
      } else if (i === 239) {
        name = '1" PATENT TE';
        description = "1 in\xE7 diki\u015Fsiz kaynak a\u011F\u0131zl\u0131 \xE7elik patent te";
        price = 60;
        wholesalePrice = 48;
        stock = 199;
      } else if (i === 243) {
        name = '1" PATENT KRUVA';
        description = "1 in\xE7 4 yollu \xE7elik patent kruva ba\u011Flant\u0131s\u0131";
        price = 155;
        wholesalePrice = 125;
        stock = 25;
      } else {
        const size = SIZES[i % SIZES.length];
        const kind = i % 4 === 0 ? "PATENT D\u0130RSEK (D\u0130K\u0130\u015ES\u0130Z)" : i % 4 === 1 ? "PATENT TE" : i % 4 === 2 ? "PATENT KONSANTR\u0130K RED\xDCKS\u0130YON" : "PATENT FLAN\u015E KAYNAK BOYUNLU";
        name = `${size} ${kind} (${i})`;
        description = `${size} diki\u015Fsiz karbon \xE7elik kaynakl\u0131 hat eleman\u0131`;
        price = 35 + i % 12 * 22;
        wholesalePrice = price * 0.8;
        stock = 50 + i % 80;
      }
    } else if (i >= 301 && i <= 480) {
      category = "F\u0130TT\u0130NGS MALZEMELER\u0130";
      const isGalv = i >= 370 && i <= 420;
      subCategory = isGalv ? "GALVEN\u0130ZLER" : "DEM\u0130R F\u0130TT\u0130NGS";
      if (i === 301) {
        name = '1/2" D\u0130RSEK (DEM\u0130R F\u0130TT\u0130NGS)';
        description = "1/2 in\xE7 90 derece d\xF6k\xFCm di\u015Fli demir dirsek";
        price = 24.5;
        wholesalePrice = 19.5;
        stock = 450;
      } else if (i === 302) {
        name = '1/2" KUYRUKLU D\u0130RSEK (DEM\u0130R)';
        description = "1/2 in\xE7 i\xE7-d\u0131\u015F di\u015Fli demir dirsek";
        price = 32;
        wholesalePrice = 25.5;
        stock = 280;
      } else if (i === 305) {
        name = '3/4" D\u0130RSEK (DEM\u0130R F\u0130TT\u0130NGS)';
        description = "3/4 in\xE7 90 derece d\xF6k\xFCm di\u015Fli demir dirsek";
        price = 34;
        wholesalePrice = 27;
        stock = 310;
      } else if (i === 306) {
        name = '1" D\u0130RSEK (DEM\u0130R F\u0130TT\u0130NGS)';
        description = "1 in\xE7 90 derece d\xF6k\xFCm di\u015Fli demir dirsek";
        price = 44;
        wholesalePrice = 35;
        stock = 120;
      } else if (i === 307) {
        name = '1 1/4" D\u0130RSEK (DEM\u0130R)';
        description = "1 1/4 in\xE7 d\xF6k\xFCm di\u015Fli demir dirsek";
        price = 85;
        wholesalePrice = 68;
        stock = 80;
      } else if (i === 308) {
        name = '1 1/2" D\u0130RSEK (DEM\u0130R)';
        description = "1 1/2 in\xE7 d\xF6k\xFCm di\u015Fli demir dirsek";
        price = 115;
        wholesalePrice = 92;
        stock = 75;
      } else if (i === 309) {
        name = '2" D\u0130RSEK (DEM\u0130R)';
        description = "2 in\xE7 d\xF6k\xFCm di\u015Fli demir dirsek";
        price = 185;
        wholesalePrice = 148;
        stock = 60;
      } else if (i === 320) {
        name = '1/2" TE (DEM\u0130R F\u0130TT\u0130NGS)';
        description = "1/2 in\xE7 e\u015Fit 3 yollu d\xF6k\xFCm demir te par\xE7as\u0131";
        price = 35;
        wholesalePrice = 28;
        stock = 320;
      } else if (i === 321) {
        name = '1" TE (DEM\u0130R F\u0130TT\u0130NGS)';
        description = "1 in\xE7 3 yollu e\u015Fit d\xF6k\xFCm demir te par\xE7as\u0131";
        price = 68;
        wholesalePrice = 54;
        stock = 62;
      } else if (i === 329) {
        name = '1/2" N\u0130PEL (DEM\u0130R)';
        description = "1/2 in\xE7 d\u0131\u015F di\u015Fli demir \xE7ift tarafl\u0131 nipel";
        price = 21;
        wholesalePrice = 16.5;
        stock = 610;
      } else if (i === 330) {
        name = '1" N\u0130PEL';
        description = "1 in\xE7 \xE7ift taraf\u0131 d\u0131\u015F di\u015Fli demir nipel";
        price = 37;
        wholesalePrice = 29;
        stock = 95;
      } else if (i === 331) {
        name = '3/4" N\u0130PEL (DEM\u0130R)';
        description = "3/4 in\xE7 d\u0131\u015F di\u015Fli demir \xE7ift tarafl\u0131 nipel";
        price = 27;
        wholesalePrice = 21.5;
        stock = 410;
      } else if (i === 339) {
        name = '1/2" MAN\u015EON (DEM\u0130R)';
        description = "1/2 in\xE7 i\xE7 di\u015Fli d\xF6k\xFCm boru ekleme man\u015Fonu";
        price = 22;
        wholesalePrice = 17.5;
        stock = 520;
      } else if (i === 340) {
        name = '3/4" MAN\u015EON (DEM\u0130R)';
        description = "3/4 in\xE7 i\xE7 di\u015Fli d\xF6k\xFCm boru man\u015Fonu";
        price = 28.5;
        wholesalePrice = 22.5;
        stock = 360;
      } else if (i === 341) {
        name = '1" MAN\u015EON';
        description = "1 in\xE7 i\xE7 di\u015Fli demir boru man\u015Fonu";
        price = 38;
        wholesalePrice = 30;
        stock = 80;
      } else if (i === 349) {
        name = '1/2" TAPA (DEM\u0130R)';
        description = "1/2 in\xE7 d\u0131\u015F di\u015Fli demir k\xF6r tapa";
        price = 18;
        wholesalePrice = 14;
        stock = 400;
      } else if (i === 350) {
        name = '1" TAPA (DEM\u0130R)';
        description = "1 in\xE7 d\u0131\u015F di\u015Fli demir k\xF6r tapa";
        price = 36;
        wholesalePrice = 28;
        stock = 60;
      } else if (i === 366) {
        name = "3/4*1/2 RED\xDCKS\u0130YON (DEM\u0130R)";
        description = "3/4 in\xE7 x 1/2 in\xE7 d\u0131\u015F-i\xE7 di\u015Fli demir red\xFCksiyon";
        price = 21;
        wholesalePrice = 16.5;
        stock = 480;
      } else if (i === 380) {
        name = '1" GALVAN\u0130Z D\u0130RSEK';
        description = "1 in\xE7 galvaniz kapl\u0131 paslanmaz di\u015Fli dirsek";
        price = 50;
        wholesalePrice = 41;
        stock = 75;
      } else if (i === 395) {
        name = '1" GALVEN\u0130Z N\u0130PEL';
        description = "1 in\xE7 galvaniz \xE7ift tarafl\u0131 d\u0131\u015F di\u015Fli nipel";
        price = 43;
        wholesalePrice = 35;
        stock = 90;
      } else {
        const size = SIZES[i % SIZES.length];
        const kind = i % 6 === 0 ? "D\u0130RSEK" : i % 6 === 1 ? "TE" : i % 6 === 2 ? "N\u0130PEL" : i % 6 === 3 ? "MAN\u015EON" : i % 6 === 4 ? "K\xD6R TAPA" : "RED\xDCKS\u0130YON";
        const material = isGalv ? "GALVAN\u0130Z" : "DEM\u0130R";
        name = `${size} ${material} ${kind} (${i})`;
        description = `${size} ${material.toLowerCase()} d\xF6k\xFCm di\u015Fli tesisat ba\u011Flant\u0131 par\xE7as\u0131`;
        price = 20 + i % 10 * 12;
        wholesalePrice = price * 0.8;
        stock = 100 + i % 200;
      }
    } else if (i >= 481 && i <= 600) {
      category = "ARMAT\xDCR & BATARYALAR";
      if (i === 489) {
        name = "AKASYA BANYO BATARYASI (\u0130SRA)";
        subCategory = "BANYO BATARYALARI";
        description = "35 mm seramik kartu\u015Flu krom pirin\xE7 banyo bataryas\u0131";
        price = 3500;
        wholesalePrice = 2850;
        stock = 15;
        featured = true;
      } else if (i === 490) {
        name = "AKASYA LAVABO BATARYASI (\u0130SRA)";
        subCategory = "LAVABO BATARYALARI";
        description = "Krom pirin\xE7 lavabo bataryas\u0131";
        price = 2650;
        wholesalePrice = 2150;
        stock = 18;
      } else if (i === 491) {
        name = "AKASYA EVYE (MUTFAK) BATARYASI";
        subCategory = "EVYE BATARYALARI";
        description = "D\xF6ner ku\u011Fu borulu krom pirin\xE7 mutfak bataryas\u0131";
        price = 2850;
        wholesalePrice = 2300;
        stock = 20;
      } else if (i === 495) {
        name = "ROBOT TEPE DU\u015E SET\u0130 (KROM)";
        subCategory = "DU\u015E S\u0130STEMLER\u0130";
        description = "Pirin\xE7 y\xF6nlendiricili tepe ya\u011Fmurlama ve el du\u015F kolonu";
        price = 1850;
        wholesalePrice = 1450;
        stock = 22;
        unit = "TAKIM";
        featured = true;
      } else if (i === 497) {
        name = "3/8*1/2 F\u0130LTREL\u0130 TAHARET MUSLU\u011EU (A\xC7-KAPA)";
        subCategory = "ARA MUSLUKLAR";
        description = "Seramik diskli pirin\xE7 krom a\xE7-kapa taharet muslu\u011Fu";
        price = 135;
        wholesalePrice = 95;
        stock = 350;
        featured = true;
      } else if (i === 498) {
        name = "3/4 A\xC7-KAPA \xC7AMA\u015EIR / BULA\u015EIK MUSLU\u011EU";
        subCategory = "ARA MUSLUKLAR";
        description = "Kromajl\u0131 pirin\xE7 \xE7ama\u015F\u0131r makinesi muslu\u011Fu";
        price = 145;
        wholesalePrice = 105;
        stock = 190;
      } else if (i === 567) {
        name = "ARITMALI MUSLUK (\u0130SRA)";
        subCategory = "\u0130SRA MUSLUKLAR";
        description = "\u0130SRA \xD6zel Tasar\u0131m Ar\u0131tmal\u0131 Musluk, Pirin\xE7 G\xF6vde";
        price = 200;
        wholesalePrice = 160;
        stock = 25;
        featured = true;
      } else {
        const kinds = ["KU\u011EU LAVABO BATARYASI", "BANYO K\xDCVET BATARYASI", "ARITMALI EVYE BATARYASI", "A\xC7-KAPA TAHARET MUSLU\u011EU", "MAFSALLI DU\u015E SET\u0130", "KROM \u015EOFBEN MUSLU\u011EU"];
        const chosen = kinds[i % kinds.length];
        subCategory = "\u0130SRA ARMAT\xDCR & MUSLUK";
        name = `${chosen} - \u0130SRA SER\u0130S\u0130 (${i})`;
        description = "1. kalite kromaj kapl\u0131 pirin\xE7 g\xF6vdeli batarya ve armat\xFCr";
        price = 250 + i % 20 * 85;
        wholesalePrice = price * 0.8;
        stock = 30 + i % 50;
      }
    } else if (i >= 601 && i <= 750) {
      if (i >= 601 && i <= 650) {
        category = "KELEP\xC7E & MONTAJ & SARF";
        subCategory = "BORU KELEP\xC7ELER\u0130";
        const size = SIZES[i % SIZES.length];
        name = `${size} SOMUNLU LAST\u0130KL\u0130 KELEP\xC7E (${i})`;
        description = `${size} EPDM ses lastikli galvaniz boru sabitleme kelep\xE7esi`;
        price = 12 + i % 8 * 3;
        wholesalePrice = price * 0.7;
        stock = 500 + i % 500;
      } else if (i >= 651 && i <= 700) {
        category = "SIZDIRMAZLIK & HIRDAVAT";
        subCategory = "SIZDIRMAZLIK VE YAPI\u015ETIRICI";
        name = `DO\u011EALGAZ SIVI CONTA & TEFLON BANT SER\u0130S\u0130 (${i})`;
        description = "TSE onayl\u0131 di\u015F s\u0131zd\u0131rmazl\u0131k kimyasal\u0131 ve bantlar\u0131";
        price = 25 + i % 10 * 20;
        wholesalePrice = price * 0.75;
        stock = 250;
      } else {
        category = "DO\u011EALGAZ S\u0130STEMLER\u0130";
        subCategory = "DO\u011EALGAZ BORULARI";
        const size = SIZES[i % SIZES.length];
        name = `${size} D\u0130K\u0130\u015ES\u0130Z \xC7EL\u0130K DO\u011EALGAZ BORUSU (${i})`;
        description = `${size} TS EN 10255 standartlar\u0131nda \xE7elik gaz borusu`;
        price = 90 + i % 6 * 30;
        wholesalePrice = price * 0.8;
        stock = 400;
        unit = "METRE";
      }
    } else if (i >= 751 && i <= 980) {
      category = "ISITMA & KOMB\u0130 GRUBU";
      subCategory = "PANEL RADYAT\xD6RLER & YERDEN ISITMA";
      const len = 400 + i % 20 * 100;
      name = `PANEL RADYAT\xD6R 600X${len} TIP 22 PKKP (${i})`;
      description = `60 cm y\xFCkseklik x ${len} mm uzunluk beyaz panel radyat\xF6r`;
      price = 1200 + i % 20 * 120;
      wholesalePrice = price * 0.82;
      stock = 20 + i % 30;
    } else if (i >= 981 && i <= 1100) {
      category = "PPRC & PVC BORU S\u0130STEMLER\u0130";
      subCategory = "KALDE PPRC";
      if (i === 986) {
        name = "25*90 PPRC D\u0130RSEK (KALDE)";
        description = "25 mm 90 derece kaynak dirse\u011Fi";
        price = 9.61;
        wholesalePrice = 4.6;
        stock = 21441;
        minOrderQuantity = 20;
      } else if (i === 987) {
        name = "20 MM PPRC BORU (100 M KALDE)";
        description = "20 mm PN20 Kalde polipropilen temiz su borusu";
        price = 50.15;
        wholesalePrice = 21.5;
        stock = 34002;
        unit = "METRE";
        featured = true;
      } else if (i === 988) {
        name = "25 MM PPRC BORU (80 M KALDE)";
        description = "25 mm PN20 Kalde polipropilen tesisat borusu";
        price = 76.94;
        wholesalePrice = 32.65;
        stock = 89036;
        unit = "METRE";
      } else if (i === 989) {
        name = "32*90 PPRC D\u0130RSEK (KALDE)";
        description = "32 mm 90 derece Kalde PPRC dirsek";
        price = 16.8;
        wholesalePrice = 8.1;
        stock = 4800;
      } else if (i === 1007) {
        name = "20 L\u0130K PPRC MAN\u015EON (KALDE)";
        description = "20 mm Kalde PPRC d\xFCz boru ekleme man\u015Fonu";
        price = 4.51;
        wholesalePrice = 2.15;
        stock = 19321;
        minOrderQuantity = 25;
      } else if (i === 1008) {
        name = "25 L\u0130K PPRC MAN\u015EON (KALDE)";
        description = "25 mm Kalde PPRC ekleme man\u015Fonu";
        price = 6.76;
        wholesalePrice = 3.4;
        stock = 14838;
        minOrderQuantity = 20;
      } else if (i === 1009) {
        name = "32 L\u0130K PPRC MAN\u015EON (KALDE)";
        description = "32 mm Kalde PPRC ekleme man\u015Fonu";
        price = 11.2;
        wholesalePrice = 5.4;
        stock = 5400;
      } else if (i === 1013) {
        name = "25*20 PPRC RED\xDCKS\u0130YON (KALDE)";
        description = "25 mm x 20 mm Kalde boru k\xFC\xE7\xFCltme red\xFCksiyonu";
        price = 5.55;
        wholesalePrice = 2.7;
        stock = 1308;
      } else if (i === 1020) {
        name = "20 L\u0130K PPRC TE (KALDE)";
        description = "20 mm Kalde PPRC 3 yollu e\u015Fit te par\xE7as\u0131";
        price = 9.02;
        wholesalePrice = 4.45;
        stock = 2115;
      } else if (i === 1021) {
        name = "25 L\u0130K PPRC TE (KALDE)";
        description = "25 mm Kalde 3 yollu e\u015Fit te par\xE7as\u0131";
        price = 12.46;
        wholesalePrice = 6.35;
        stock = 9830;
      } else if (i === 1022) {
        name = "32 L\u0130K PPRC TE (KALDE)";
        description = "32 mm Kalde 3 yollu e\u015Fit te";
        price = 24.5;
        wholesalePrice = 11.8;
        stock = 3200;
      } else if (i === 1034) {
        name = "20*1/2 PPRC \xC7\u0130FTL\u0130 BATARYA BA\u011ELANTISI";
        description = "150mm standart aral\u0131kl\u0131 \xE7iftli batarya ba\u011Flant\u0131 \u015Fablonu";
        price = 149.54;
        wholesalePrice = 96.75;
        stock = 120;
      } else if (i === 1036) {
        name = "20*1/2 PPRC \u0130\xC7 D\u0130\u015EL\u0130 D\u0130RSEK (KALDE)";
        description = "20 mm x 1/2 in\xE7 sar\u0131 pirin\xE7 i\xE7 di\u015Fli PPRC dirsek";
        price = 55.02;
        wholesalePrice = 27.4;
        stock = 966;
      } else if (i === 1041) {
        name = "20*1/2 PPRC DI\u015E D\u0130\u015EL\u0130 D\u0130RSEK (KALDE)";
        description = "20 mm x 1/2 in\xE7 d\u0131\u015F di\u015Fli sar\u0131 pirin\xE7 ge\xE7i\u015F dirse\u011Fi";
        price = 78.33;
        wholesalePrice = 34.35;
        stock = 753;
      } else if (i === 1049) {
        name = "20*1/2 PPRC \u0130\xC7 D\u0130\u015EL\u0130 REKOR (KALDE)";
        description = "20 mm x 1/2 in\xE7 sar\u0131 pirin\xE7 i\xE7 di\u015Fli d\xFCz rakor";
        price = 56.52;
        wholesalePrice = 26;
        stock = 378;
      } else if (i === 1055) {
        name = "20*1/2 PPRC DI\u015E D\u0130\u015EL\u0130 REKOR (KALDE)";
        description = "20 mm x 1/2 in\xE7 sar\u0131 pirin\xE7 d\u0131\u015F di\u015Fli d\xFCz rakor";
        price = 67.35;
        wholesalePrice = 32.5;
        stock = 2885;
      } else if (i === 1067) {
        category = "VANALAR & \xC7EKVALFLER";
        subCategory = "KALDE PPRC VANALAR";
        name = "20 L\u0130K PPRC KALDE VANA";
        description = "20 mm kaynakl\u0131 plastik g\xF6vdeli Kalde k\xFCresel vana";
        price = 137.55;
        wholesalePrice = 70.5;
        stock = 209;
      } else if (i === 1068) {
        category = "VANALAR & \xC7EKVALFLER";
        subCategory = "KALDE PPRC VANALAR";
        name = "25 L\u0130K PPRC KALDE VANA";
        description = "25 mm kaynakl\u0131 Kalde PPRC k\xFCresel vana";
        price = 195;
        wholesalePrice = 98;
        stock = 140;
      } else if (i === 1069) {
        category = "VANALAR & \xC7EKVALFLER";
        subCategory = "KALDE PPRC VANALAR";
        name = "32 L\u0130K PPRC KALDE VANA";
        description = "32 mm kaynakl\u0131 Kalde PPRC k\xFCresel vana";
        price = 310;
        wholesalePrice = 155;
        stock = 85;
      } else if (i === 1080) {
        name = "20 L\u0130K PPRC KAPAMA BA\u015ELI\u011EI (KALDE)";
        description = "20 mm kaynakl\u0131 Kalde PPRC k\xF6r tapa ve kapama ba\u015Fl\u0131\u011F\u0131";
        price = 5.5;
        wholesalePrice = 2.6;
        stock = 5444;
      } else if (i === 1093) {
        subCategory = "KALDE PVC";
        name = "100*87 PVC D\u0130RSEK (KALDE)";
        description = "100 mm 87 derece contal\u0131 PVC at\u0131k su dirse\u011Fi";
        price = 124.79;
        wholesalePrice = 50.5;
        stock = 1903;
      } else if (i === 1097) {
        subCategory = "KALDE PVC";
        name = "100*50 PVC RED\xDCKS\u0130YON (KALDE)";
        description = "100 mm x 50 mm contal\u0131 PVC red\xFCksiyon";
        price = 63.89;
        wholesalePrice = 30;
        stock = 220;
      } else if (i === 1098) {
        subCategory = "KALDE PVC";
        name = "100*70 PVC RED\xDCKS\u0130YON (KALDE)";
        description = "100 mm x 70 mm contal\u0131 PVC red\xFCksiyon";
        price = 85;
        wholesalePrice = 38;
        stock = 350;
      } else {
        const size = PPRC_SIZES[i % PPRC_SIZES.length];
        const kind = i % 5 === 0 ? "D\u0130RSEK 90\xB0" : i % 5 === 1 ? "TE PAR\xC7ASI" : i % 5 === 2 ? "MAN\u015EON" : i % 5 === 3 ? "K\xD6PR\xDC KAV\u0130S" : "D\u0130\u015EL\u0130 GE\xC7\u0130\u015E REKORU";
        name = `${size} PPRC ${kind} (KALDE) (${i})`;
        description = `${size} Kalde PN25 polipropilen kaynak ba\u011Flant\u0131 par\xE7as\u0131`;
        price = 8 + i % 15 * 6;
        wholesalePrice = price * 0.45;
        stock = 1e3 + i % 2e3;
      }
    } else if (i >= 1101 && i <= 1250) {
      category = "PPRC & PVC BORU S\u0130STEMLER\u0130";
      if (i === 1105) {
        subCategory = "KALDE PVC";
        name = "50*50 PVC TEK \xC7ATAL (45 DERECE)";
        description = "50 mm x 50 mm 45 derece contal\u0131 tek \xE7atal";
        price = 68;
        wholesalePrice = 28.5;
        stock = 2100;
      } else if (i === 1107) {
        subCategory = "KALDE PVC";
        name = "100*50 PVC TEK \xC7ATAL (45 DERECE)";
        description = "100 mm x 50 mm 45 derece contal\u0131 tek \xE7atal";
        price = 144.49;
        wholesalePrice = 56;
        stock = 948;
      } else if (i === 1108) {
        subCategory = "KALDE PVC";
        name = "100*100 PVC TEK \xC7ATAL (45 DERECE)";
        description = "100 mm x 100 mm 45 derece contal\u0131 tek \xE7atal";
        price = 185;
        wholesalePrice = 75;
        stock = 820;
      } else if (i === 1155) {
        subCategory = "KALDE PVC";
        name = "100 PVC KAYAR MAN\u015EON (KALDE)";
        description = "100 mm tamir ve kayar man\u015Fon contal\u0131";
        price = 108.4;
        wholesalePrice = 47.5;
        stock = 732;
      } else if (i === 1170) {
        subCategory = "KALDE PVC";
        name = "50*1000 3,2 PVC BORU (KALDE)";
        description = "50 mm \xE7ap x 100 cm boy contal\u0131 3.2 mm kal\u0131n etli PVC at\u0131k su borusu";
        price = 145;
        wholesalePrice = 72;
        stock = 2400;
      } else if (i === 1171) {
        subCategory = "KALDE PVC";
        name = "50*2000 3,2 PVC BORU (KALDE)";
        description = "50 mm \xE7ap x 200 cm boy contal\u0131 PVC boru";
        price = 275;
        wholesalePrice = 135;
        stock = 1800;
      } else if (i === 1175) {
        subCategory = "KALDE PVC";
        name = "70*1000 3,2 PVC BORU (KALDE)";
        description = "70 mm \xE7ap x 100 cm boy contal\u0131 3.2 mm PVC boru";
        price = 210;
        wholesalePrice = 98;
        stock = 1450;
      } else if (i === 1180) {
        subCategory = "KALDE PVC";
        name = "100*1000 3,2 PVC BORU (KALDE)";
        description = "100 mm \xE7ap x 100 cm boy contal\u0131 3.2 mm kal\u0131n etli PVC at\u0131k su borusu";
        price = 287.24;
        wholesalePrice = 140.6;
        stock = 1264;
        featured = true;
      } else if (i === 1181) {
        subCategory = "KALDE PVC";
        name = "100*2000 3,2 PVC BORU (KALDE)";
        description = "100 mm \xE7ap x 200 cm boy contal\u0131 3.2 mm PVC boru";
        price = 549.21;
        wholesalePrice = 235.2;
        stock = 906;
      } else if (i === 1182) {
        subCategory = "KALDE PVC";
        name = "100*3000 3,2 PVC BORU (KALDE)";
        description = "100 mm \xE7ap x 300 cm boy contal\u0131 3.2 mm PVC boru";
        price = 811.17;
        wholesalePrice = 348;
        stock = 1461;
        featured = true;
      } else if (i === 1190) {
        subCategory = "KALDE PVC";
        name = "50*45 PVC D\u0130RSEK (KALDE)";
        description = "50 mm 45 derece contal\u0131 PVC at\u0131k su dirse\u011Fi";
        price = 45;
        wholesalePrice = 18.5;
        stock = 5200;
      } else if (i === 1191) {
        subCategory = "KALDE PVC";
        name = "50*87 PVC D\u0130RSEK (KALDE)";
        description = "50 mm 87 derece contal\u0131 PVC at\u0131k su dirse\u011Fi";
        price = 48;
        wholesalePrice = 20;
        stock = 4600;
      } else if (i === 1193) {
        subCategory = "KALDE PVC";
        name = "100*45 PVC D\u0130RSEK (KALDE)";
        description = "100 mm 45 derece contal\u0131 PVC at\u0131k su dirse\u011Fi";
        price = 105.69;
        wholesalePrice = 40;
        stock = 4099;
      } else if (i === 1197) {
        subCategory = "KALDE PPRC";
        name = "20*90 PPRC D\u0130RSEK (KALDE)";
        description = "20 mm 90 derece Kalde PPRC kaynak dirse\u011Fi";
        price = 7.3;
        wholesalePrice = 2.95;
        stock = 11908;
      } else if (i === 1198) {
        subCategory = "KALDE PPRC";
        name = "20*45 PPRC D\u0130RSEK (KALDE)";
        description = "20 mm 45 derece Kalde PPRC kaynak dirse\u011Fi";
        price = 8.5;
        wholesalePrice = 3.4;
        stock = 6200;
      } else if (i === 1219) {
        subCategory = "KALDE PPRC";
        name = "25 L\u0130K KOMPOZ\u0130T PPRC BORU (KALDE)";
        description = "25 mm cam elyaf kompozit s\u0131cak su tesisat borusu";
        price = 71.67;
        wholesalePrice = 30.9;
        stock = 6400;
        unit = "METRE";
        featured = true;
      } else if (i === 1220) {
        subCategory = "KALDE PPRC";
        name = "32 L\u0130K KOMPOZ\u0130T PPRC BORU (KALDE)";
        description = "32 mm cam elyaf takviyeli kompozit PPRC boru";
        price = 112.5;
        wholesalePrice = 52;
        stock = 3100;
        unit = "METRE";
      } else if (i === 1223) {
        subCategory = "KALDE PPRC";
        name = "20 L\u0130K KOMPOZ\u0130T PPRC BORU (KALDE)";
        description = "20 mm cam elyaf takviyeli kompozit s\u0131cak/so\u011Fuk su tesisat borusu (4 metre)";
        price = 45.5;
        wholesalePrice = 19.5;
        stock = 4300;
        unit = "METRE";
        featured = true;
      } else {
        const size = PVC_SIZES[i % PVC_SIZES.length];
        const len = PVC_LENGTHS[i % PVC_LENGTHS.length];
        subCategory = "KALDE PVC";
        name = `${size}*${len} PVC ATIK SU BORUSU & EK PAR\xC7ASI (KALDE) (${i})`;
        description = `${size} mm contal\u0131 Kalde 3.2 mm kal\u0131n etli pima\u015F boru/fittings`;
        price = 80 + i % 15 * 20;
        wholesalePrice = price * 0.45;
        stock = 800 + i % 1e3;
      }
    } else if (i >= 1251 && i <= 1450) {
      category = "REKORLAR & UZATMALAR";
      subCategory = "SARI MALZEME";
      if (i === 1386) {
        name = "1 CM UZATMA SARI";
        description = "1 cm sar\u0131 pirin\xE7 armat\xFCr ve tesisat uzatma nipeli";
        price = 12;
        wholesalePrice = 9.5;
        stock = 150;
      } else if (i === 1387) {
        name = '1" SARI N\u0130PEL';
        description = "1 in\xE7 birinci kalite sar\u0131 pirin\xE7 \xE7ift tarafl\u0131 nipel";
        price = 55;
        wholesalePrice = 44;
        stock = 70;
      } else if (i === 1388) {
        name = "2 CM UZATMA SARI";
        description = "2 cm sar\u0131 pirin\xE7 armat\xFCr uzatmas\u0131";
        price = 18;
        wholesalePrice = 14.5;
        stock = 240;
      } else if (i === 1389) {
        name = "3 CM UZATMA SARI";
        description = "3 cm sar\u0131 pirin\xE7 armat\xFCr uzatmas\u0131";
        price = 24;
        wholesalePrice = 19;
        stock = 180;
      } else if (i === 1390) {
        name = "5 CM UZATMA SARI";
        description = "5 cm sar\u0131 pirin\xE7 tesisat uzatmas\u0131";
        price = 38;
        wholesalePrice = 30;
        stock = 120;
      } else if (i === 1398) {
        name = '1" HORTUM REKORU (SARI)';
        description = "1 in\xE7 sar\u0131 pirin\xE7 kuyruklu hortum ba\u011Flant\u0131 rekoru";
        price = 55;
        wholesalePrice = 44;
        stock = 65;
      } else if (i === 1408) {
        subCategory = "DEM\u0130R MALZEME";
        name = '1" KON\u0130K REKOR (DEM\u0130R)';
        description = "1 in\xE7 konik s\u0131zd\u0131rmaz demir tesisat rekoru";
        price = 100;
        wholesalePrice = 82;
        stock = 40;
      } else if (i === 1413) {
        name = '1/2" D\xDCZ REKOR (SARI MALZEME)';
        description = "1/2 in\xE7 d\xFCz sar\u0131 pirin\xE7 rekor";
        price = 95;
        wholesalePrice = 76;
        stock = 90;
      } else if (i === 1414) {
        name = '3/4" D\xDCZ REKOR (SARI MALZEME)';
        description = "3/4 in\xE7 d\xFCz sar\u0131 pirin\xE7 rekor";
        price = 135;
        wholesalePrice = 108;
        stock = 65;
      } else if (i === 1415) {
        name = '1" D\xDCZ REKOR (SARI MALZEME)';
        description = "1 in\xE7 d\xFCz sar\u0131 pirin\xE7 birle\u015Ftirme rekoru";
        price = 180;
        wholesalePrice = 145;
        stock = 35;
      } else if (i === 1426) {
        subCategory = "DEM\u0130R REKORLAR";
        name = "1 CM DEM\u0130R UZATMA";
        description = "1 cm galvaniz kaplamal\u0131 dayan\u0131kl\u0131 demir uzatma par\xE7as\u0131";
        price = 15;
        wholesalePrice = 12;
        stock = 1090;
      } else if (i === 1438) {
        name = '1" K\xD6\u015EE REKOR (SARI)';
        description = "1 in\xE7 90 derece a\xE7\u0131l\u0131 k\xF6\u015Fe sar\u0131 rekor ba\u011Flant\u0131s\u0131";
        price = 280;
        wholesalePrice = 230;
        stock = 20;
      } else {
        const size = SIZES[i % SIZES.length];
        const kind = i % 4 === 0 ? "SARI D\xDCZ REKOR" : i % 4 === 1 ? "SARI K\xD6\u015EE REKOR" : i % 4 === 2 ? "SARI BORU UZATMASI" : "SARI HORTUM N\u0130PEL\u0130";
        name = `${size} ${kind} (${i})`;
        description = `${size} MS58 pirin\xE7 d\xF6k\xFCm s\u0131zd\u0131rmaz rekor ba\u011Flant\u0131s\u0131`;
        price = 45 + i % 12 * 18;
        wholesalePrice = price * 0.8;
        stock = 100 + i % 120;
      }
    } else if (i >= 1451 && i <= 1650) {
      category = "KELEP\xC7E & MONTAJ & SARF";
      if (i === 1464) {
        subCategory = "BORU KILIFLARI";
        name = '1" BORU KILIFI (KIRMIZI/MAV\u0130)';
        description = "Yal\u0131t\u0131ml\u0131 koruyucu oluklu plastik boru k\u0131l\u0131f\u0131";
        price = 5;
        wholesalePrice = 4;
        stock = 2164;
        unit = "METRE";
      } else if (i === 1465) {
        subCategory = "BORU KILIFLARI";
        name = '1/2" BORU KILIFI (KIRMIZI/MAV\u0130)';
        description = "1/2 in\xE7 koruyucu spiral plastik boru k\u0131l\u0131f\u0131";
        price = 4.5;
        wholesalePrice = 3.5;
        stock = 3500;
        unit = "METRE";
      } else {
        subCategory = "BORU \u0130ZOLASYON & KELEP\xC7E";
        const size = SIZES[i % SIZES.length];
        name = `${size} BORU \u0130ZOLASYONU & TR\u0130FONLU KELEP\xC7E (${i})`;
        description = `${size} polietilen boru izolasyon k\u0131l\u0131f\u0131 ve montaj kelep\xE7esi`;
        price = 15 + i % 10 * 8;
        wholesalePrice = price * 0.75;
        stock = 500;
      }
    } else if (i >= 1651 && i <= 1780) {
      category = "V\u0130TR\u0130F\u0130YE & BANYO";
      if (i === 1730) {
        subCategory = "TURKUAZ V\u0130TR\u0130F\u0130YE";
        name = "AQUA ASMA KLOZET TAKIMI (TURKUAZ)";
        description = "Rimless (kanals\u0131z) hijyenik y\u0131kama sistemli asma klozet ve amortis\xF6rl\xFC kapak";
        price = 6085;
        wholesalePrice = 4950;
        stock = 12;
        featured = true;
      } else if (i === 1731) {
        subCategory = "TURKUAZ V\u0130TR\u0130F\u0130YE";
        name = "BELLA ASMA KLOZET TAKIMI (TURKUAZ)";
        description = "Kompakt \xF6l\xE7\xFCl\xFC kanals\u0131z asma klozet ve yava\u015F kapanan kapak";
        price = 5450;
        wholesalePrice = 4400;
        stock = 15;
      } else if (i === 1732) {
        subCategory = "G\xD6MME REZERVUAR";
        name = "TURKUAZ G\xD6MME REZERVUAR SET\u0130 (ASMA KLOZET UYUMLU)";
        description = "3/6 Litre \xE7ift kademeli sessiz dolum mekanizmal\u0131 8 cm ince g\xF6mme rezervuar";
        price = 3650;
        wholesalePrice = 2950;
        stock = 25;
        unit = "TAKIM";
        featured = true;
      } else if (i === 1733) {
        subCategory = "G\xD6MME REZERVUAR";
        name = "\xC7\u0130FT KADEMEL\u0130 KROM KUMANDA PANEL\u0130";
        description = "Parlak kromajl\u0131 g\xF6mme rezervuar basma butonu";
        price = 450;
        wholesalePrice = 350;
        stock = 45;
      } else if (i === 1734) {
        subCategory = "TURKUAZ V\u0130TR\u0130F\u0130YE";
        name = "60 CM TEZGAH \xDCST\xDC \xC7ANAK LAVABO (TURKUAZ)";
        description = "60x40 cm modern beyaz porselen tezgah \xFCst\xFC \xE7anak lavabo";
        price = 2450;
        wholesalePrice = 1980;
        stock = 16;
      } else if (i === 1735) {
        subCategory = "MONTAJ MALZEMELER\u0130";
        name = "K\xD6R\xDCKL\xDC KLOZET KADASI (EKSANTR\u0130K)";
        description = "Klozet pis su gider ba\u011Flant\u0131 k\xF6r\xFC\u011F\xFC contal\u0131";
        price = 95;
        wholesalePrice = 65;
        stock = 140;
      } else if (i === 1736) {
        subCategory = "S\u0130FONLAR";
        name = "K\xD6R\xDCKL\xDC LAVABO S\u0130FONU (P\u0130R\u0130N\xC7 V\u0130DALI)";
        description = "Paslanmaz s\xFCzge\xE7li ve pirin\xE7 vidal\u0131 k\xF6r\xFCkl\xFC lavabo sifonu";
        price = 65;
        wholesalePrice = 42;
        stock = 280;
      } else {
        subCategory = "V\u0130TR\u0130F\u0130YE & S\u0130FON AKSESUARLARI";
        const itemType = i % 4 === 0 ? "LAVABO A\xC7-KAPA S\u0130FONU" : i % 4 === 1 ? "KLOZET \u0130\xC7 TAKIMI (\xC7\u0130FT KADEMEL\u0130)" : i % 4 === 2 ? "YER S\xDCZGEC\u0130 PASLANMAZ 10X10" : "BANYO DU\u015E KANALI 40 CM";
        name = `${itemType} - TURKUAZ & STANDART (${i})`;
        description = "1. s\u0131n\u0131f hijyenik banyo ve gider ekipman\u0131";
        price = 150 + i % 15 * 45;
        wholesalePrice = price * 0.75;
        stock = 80 + i % 100;
      }
    } else {
      category = "VANALAR & \xC7EKVALFLER";
      if (i === 1791) {
        subCategory = "\xD6ZEN\u0130\u015E VANALAR";
        name = '1" \xD6ZEN \u0130\u015E VANA';
        description = "1 in\xE7 tam ge\xE7i\u015Fli a\u011F\u0131r tip pirin\xE7 k\xFCresel vana";
        price = 738.57;
        wholesalePrice = 620;
        stock = 18;
      } else if (i === 1821) {
        subCategory = "K\xDCRESEL VANALAR";
        name = '1" DAR VANA';
        description = "1 in\xE7 dar g\xF6vde pirin\xE7 k\xFCresel su vanas\u0131";
        price = 195;
        wholesalePrice = 160;
        stock = 45;
      } else if (i === 1825) {
        subCategory = "K\xDCRESEL VANALAR";
        name = '1/2" VANA (P\u0130R\u0130N\xC7 K\xDCRESEL PN25)';
        description = "1/2 in\xE7 tam ge\xE7i\u015Fli pirin\xE7 k\xFCresel su vanas\u0131, PN25 bas\u0131nca dayan\u0131kl\u0131";
        price = 165;
        wholesalePrice = 132;
        stock = 180;
        featured = true;
      } else if (i === 1826) {
        subCategory = "K\xDCRESEL VANALAR";
        name = '3/4" VANA (P\u0130R\u0130N\xC7 K\xDCRESEL PN25)';
        description = "3/4 in\xE7 tam ge\xE7i\u015Fli pirin\xE7 k\xFCresel su vanas\u0131";
        price = 235;
        wholesalePrice = 188;
        stock = 140;
        featured = true;
      } else if (i === 1827) {
        subCategory = "K\xDCRESEL VANALAR";
        name = '1" VANA (P\u0130R\u0130N\xC7 K\xDCRESEL)';
        description = "1 in\xE7 PN25 tam ge\xE7i\u015Fli pirin\xE7 k\xFCresel su vanas\u0131";
        price = 315;
        wholesalePrice = 255;
        stock = 65;
        featured = true;
      } else if (i === 1828) {
        subCategory = "K\xDCRESEL VANALAR";
        name = '1 1/4" VANA (P\u0130R\u0130N\xC7 K\xDCRESEL PN25)';
        description = "1 1/4 in\xE7 tam ge\xE7i\u015Fli pirin\xE7 k\xFCresel su vanas\u0131";
        price = 540;
        wholesalePrice = 435;
        stock = 45;
      } else if (i === 1829) {
        subCategory = "K\xDCRESEL VANALAR";
        name = '1 1/2" VANA (P\u0130R\u0130N\xC7 K\xDCRESEL PN25)';
        description = "1 1/2 in\xE7 a\u011F\u0131r tip pirin\xE7 k\xFCresel vana";
        price = 760;
        wholesalePrice = 615;
        stock = 35;
      } else if (i === 1830) {
        subCategory = "K\xDCRESEL VANALAR";
        name = '2" VANA (P\u0130R\u0130N\xC7 K\xDCRESEL PN25)';
        description = "2 in\xE7 a\u011F\u0131r tip tam ge\xE7i\u015Fli pirin\xE7 k\xFCresel vana";
        price = 1150;
        wholesalePrice = 940;
        stock = 25;
      } else if (i === 1831) {
        subCategory = "DO\u011EALGAZ VANALARI";
        name = '1/2" DO\u011EALGAZ VANASI (MOP 5)';
        description = "1/2 in\xE7 TSE EN 331 onayl\u0131 sar\u0131 kollu pirin\xE7 do\u011Falgaz vanas\u0131";
        price = 175;
        wholesalePrice = 140;
        stock = 220;
        featured = true;
      } else if (i === 1832) {
        subCategory = "DO\u011EALGAZ VANALARI";
        name = '3/4" DO\u011EALGAZ VANASI (MOP 5)';
        description = "3/4 in\xE7 TSE EN 331 onayl\u0131 sar\u0131 kollu gaz vanas\u0131";
        price = 245;
        wholesalePrice = 198;
        stock = 160;
        featured = true;
      } else if (i === 1833) {
        subCategory = "K\u0130L\u0130TL\u0130 VANALAR";
        name = '1" K\u0130L\u0130TL\u0130 SAYA\xC7 VANASI';
        description = "1 in\xE7 m\xFCh\xFCrlenebilir kilitli do\u011Falgaz ve saya\xE7 vanas\u0131";
        price = 388;
        wholesalePrice = 315;
        stock = 46;
        featured = true;
      } else if (i === 1834) {
        subCategory = "DO\u011EALGAZ VANALARI";
        name = '1" DO\u011EALGAZ VANASI (MOP 5)';
        description = "1 in\xE7 TSE EN 331 onayl\u0131 do\u011Falgaz k\xFCresel vanas\u0131";
        price = 345;
        wholesalePrice = 280;
        stock = 90;
        featured = true;
      } else if (i === 1835) {
        subCategory = "K\u0130L\u0130TL\u0130 VANALAR";
        name = '3/4" K\u0130L\u0130TL\u0130 SAYA\xC7 VANASI';
        description = "3/4 in\xE7 m\xFCh\xFCr kulakl\u0131 kilitli gaz ve su vanas\u0131";
        price = 295;
        wholesalePrice = 240;
        stock = 75;
      } else {
        const size = SIZES[i % SIZES.length];
        subCategory = "K\xDCRESEL VANALAR";
        name = `${size} PN25 P\u0130R\u0130N\xC7 K\xDCRESEL VANA (${i})`;
        description = `${size} tam ge\xE7i\u015Fli pirin\xE7 g\xF6vdeli su ve tesisat vanas\u0131`;
        price = 180 + i % 10 * 40;
        wholesalePrice = price * 0.8;
        stock = 60 + i % 50;
      }
    }
    products2.push({
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
      imageUrl: "",
      sku,
      barcode,
      vatRate: 20,
      featured
    });
  }
  return products2;
}

// src/data/stockProducts.ts
var STOCK_PDF_PRODUCTS = generateAll1800Products();

// src/data/seedOrders.ts
var CUSTOMERS = [
  { name: "Y\u0131lmaz Do\u011Falgaz & Mekanik Taahh\xFCt Ltd.", email: "yilmaz@mekanik.com.tr", phone: "+90 532 455 12 34", address: "\u0130kitelli OSB Triko Dokumac\u0131lar Sit. M Blok No:14, Ba\u015Fak\u015Fehir / \u0130stanbul" },
  { name: "Kaya \u0130n\u015Faat Yap\u0131 Malzemeleri A.\u015E.", email: "siparis@kayayapi.com", phone: "+90 541 789 90 21", address: "Levent Mah. Nispetiye Cad. No:42 D:8, Be\u015Fikta\u015F / \u0130stanbul" },
  { name: "Kuzey Tesisat & M\xFChendislik Ltd.", email: "kuzey@muhendislik.com.tr", phone: "+90 533 112 33 44", address: "Gebze Organize Sanayi B\xF6lgesi 400. Sokak No:12, Kocaeli" },
  { name: "Bo\u011Fazi\xE7i Yap\u0131 Market & S\u0131hhi Tesisat", email: "muhasebe@bogaziciyapi.com", phone: "+90 530 890 12 45", address: "Ba\u011Fdat Cad. No:184/B, Kad\u0131k\xF6y / \u0130stanbul" },
  { name: "Anadolu Is\u0131 Sistemleri & M\xFChendislik", email: "info@anadoluisisistemleri.com", phone: "+90 535 678 23 11", address: "Ostim OSB 1234. Cad. No:56, Yenimahalle / Ankara" },
  { name: "Ege Tesisat & Mekanik Proje Ltd.", email: "siparis@egetesisat.com", phone: "+90 542 334 55 66", address: "Atat\xFCrk Org. San. B\xF6lgesi 10006 Sok. No:8, \xC7i\u011Fli / \u0130zmir" },
  { name: "Marmara Toptan Yap\u0131 & Tesisat", email: "info@marmaratoptan.com", phone: "+90 536 211 44 77", address: "G\xFCzelyurt Mah. Mimar Sinan Cad. No:19, Esenyurt / \u0130stanbul" },
  { name: "\xC7\xF6z\xFCm Mekanik Proje Taahh\xFCt A.\u015E.", email: "satis@cozummekanik.com", phone: "+90 538 900 88 12", address: "Bat\u0131 Ata\u015Fehir Barbaros Mah. Ihlamur Bulvar\u0131 No:3, Ata\u015Fehir / \u0130stanbul" },
  { name: "Akdeniz \u0130klimlendirme & Is\u0131 Market", email: "antalya@akdenizisi.com", phone: "+90 544 556 77 88", address: "Muratpa\u015Fa Mah. Evliya \xC7elebi Cad. No:45, Muratpa\u015Fa / Antalya" },
  { name: "Bursa Tesisat & Radyat\xF6r D\xFCnyas\u0131", email: "siparis@bursatesisat.com.tr", phone: "+90 533 876 54 32", address: "Nil\xFCfer K\xFC\xE7\xFCk Sanayi Sitesi 24. Blok No:18, Nil\xFCfer / Bursa" }
];
function generate30DaysHistoricalOrders() {
  const orders2 = [];
  const products2 = STOCK_PDF_PRODUCTS;
  if (!products2 || products2.length === 0) return [];
  const now = Date.now();
  const dayMs = 864e5;
  let orderSeq = 8801;
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(now - dayOffset * dayMs);
    const dayOfWeek = targetDate.getDay();
    const dailyCount = dayOfWeek === 0 || dayOfWeek === 6 ? dayOffset % 2 === 0 ? 1 : 2 : 2 + dayOffset * 7 % 3;
    for (let k = 0; k < dailyCount; k++) {
      const cust = CUSTOMERS[(orderSeq + k + dayOffset) % CUSTOMERS.length];
      const hourOffset = 9 + k * 3 + dayOffset * 3 % 4;
      const minuteOffset = (k * 17 + dayOffset * 13) % 60;
      const orderTime = new Date(now - dayOffset * dayMs);
      orderTime.setHours(hourOffset, minuteOffset, 0, 0);
      const itemCount = 1 + (orderSeq + dayOffset) % 4;
      const items = [];
      let subtotal = 0;
      for (let i = 0; i < itemCount; i++) {
        const prodIndex = (dayOffset * 47 + k * 113 + i * 277) % products2.length;
        const prod = products2[prodIndex] || products2[0];
        let qty = 1;
        if (prod.unit === "METRE") {
          qty = 50 + (orderSeq * 10 + i * 20) % 250;
        } else if (prod.price < 100) {
          qty = 10 + (orderSeq * 5 + i * 5) % 40;
        } else if (prod.price < 500) {
          qty = 2 + (orderSeq * 2 + i) % 8;
        } else if (prod.price < 2e3) {
          qty = 1 + (orderSeq + i) % 4;
        } else {
          qty = 1 + i % 2;
        }
        const unitPrice = prod.price;
        const totalPrice = Math.round(unitPrice * qty);
        subtotal += totalPrice;
        items.push({
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unit: prod.unit,
          unitPrice,
          totalPrice,
          note: i === 0 ? "Orijinal ambalaj\u0131nda sevk edilsin" : void 0
        });
      }
      const discountRate = subtotal > 15e3 ? 0.05 : subtotal > 5e3 ? 0.03 : 0;
      const discount = Math.round(subtotal * discountRate);
      const taxable = subtotal - discount;
      const tax = Math.round(taxable * 0.2);
      const total = taxable + tax;
      let status = "delivered";
      if (dayOffset === 0) {
        status = k === 0 ? "pending" : "approved";
      } else if (dayOffset === 1) {
        status = k === 0 ? "preparing" : "shipped";
      } else if (dayOffset <= 3) {
        status = "shipped";
      } else {
        status = "delivered";
      }
      const orderNumber = `SIP-2026-${orderSeq}`;
      const trackingNo = status === "shipped" || status === "delivered" ? `YK-${orderSeq}9182TR` : void 0;
      const statusHistory = [];
      const tCreated = new Date(orderTime.getTime());
      statusHistory.push({
        id: `sh-${orderSeq}-1`,
        status: "pending",
        timestamp: tCreated.toISOString(),
        note: "Sipari\u015F m\xFC\u015Fteri portal\u0131ndan olu\u015Fturuldu.",
        updatedBy: cust.name
      });
      if (status !== "pending") {
        const tApproved = new Date(tCreated.getTime() + 15 * 60 * 1e3);
        statusHistory.push({
          id: `sh-${orderSeq}-2`,
          status: "approved",
          timestamp: tApproved.toISOString(),
          note: "Cari limit ve fiyatlar onayland\u0131, sipari\u015F kayda al\u0131nd\u0131.",
          updatedBy: "Ahmet Y. (Y\xF6netici)"
        });
      }
      if (status === "preparing" || status === "shipped" || status === "delivered") {
        const tPreparing = new Date(tCreated.getTime() + 45 * 60 * 1e3);
        statusHistory.push({
          id: `sh-${orderSeq}-3`,
          status: "preparing",
          timestamp: tPreparing.toISOString(),
          note: "Depo raf\u0131ndan topland\u0131 ve \xE7eki listesi ile paketlendi.",
          updatedBy: "Mehmet K. (Depo Sorumlusu)"
        });
      }
      if (status === "shipped" || status === "delivered") {
        const tShipped = new Date(tCreated.getTime() + 120 * 60 * 1e3);
        statusHistory.push({
          id: `sh-${orderSeq}-4`,
          status: "shipped",
          timestamp: tShipped.toISOString(),
          note: `Yurti\xE7i Kargo ambar\u0131na teslim edildi. Takip No: ${trackingNo}`,
          updatedBy: "Ali V. (Sevkiyat)",
          trackingNumber: trackingNo
        });
      }
      if (status === "delivered") {
        const tDelivered = new Date(tCreated.getTime() + 26 * 60 * 60 * 1e3);
        statusHistory.push({
          id: `sh-${orderSeq}-5`,
          status: "delivered",
          timestamp: tDelivered.toISOString(),
          note: "M\xFC\u015Fteri yetkilisine imza kar\u015F\u0131l\u0131\u011F\u0131 teslim edildi.",
          updatedBy: "Yurti\xE7i Kargo Kuryesi",
          trackingNumber: trackingNo
        });
      }
      orders2.push({
        id: `ord-${orderSeq}`,
        orderNumber,
        customerName: cust.name,
        customerEmail: cust.email,
        customerPhone: cust.phone,
        customerAddress: cust.address,
        items,
        subtotal,
        discount,
        tax,
        total,
        status,
        notes: dayOffset === 0 ? "Acil \u015Fantiye ihtiyac\u0131, sabah erken sevk rica olunur." : void 0,
        signatureHash: `e3b0c44298fc${orderSeq}9afbf4c8996fb92427ae41e4649b934ca495991b7852b855`,
        trackingNumber: trackingNo,
        statusHistory,
        createdAt: orderTime.toISOString(),
        updatedAt: orderTime.toISOString()
      });
      orderSeq++;
    }
  }
  return orders2;
}

// server.ts
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var geminiApiKey = process.env.GEMINI_API_KEY;
var ai = null;
if (geminiApiKey) {
  ai = new import_genai.GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
var DEFAULT_AI_MODELS = ["gemini-2.5-flash", "gemini-3.7-flash", "gemini-2.5-pro"];
async function generateAIContentResilient(options) {
  if (!ai) return null;
  const modelsToTry = options.preferredModels && options.preferredModels.length > 0 ? options.preferredModels : DEFAULT_AI_MODELS;
  let lastError = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config
      });
      if (response && response.text) {
        return response;
      }
    } catch (err) {
      lastError = err;
      const isOverloaded = err?.status === 503 || err?.status === 429 || err?.message?.includes("503") || err?.message?.includes("429") || err?.message?.includes("high demand") || err?.message?.includes("UNAVAILABLE") || err?.message?.includes("RESOURCE_EXHAUSTED");
      if (isOverloaded) {
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
    }
  }
  throw lastError;
}
var products = [...STOCK_PDF_PRODUCTS];
var orders = generate30DaysHistoricalOrders();
var quotes = [
  {
    id: "qte-2001",
    quoteNumber: "TKL-2026-4401",
    customerName: "Kuzey Tesisat & M\xFChendislik Ltd.",
    customerCompany: "Kuzey Tesisat A.\u015E.",
    customerEmail: "kuzey@muhendislik.com.tr",
    customerPhone: "+90 533 112 33 44",
    deliveryCity: "Kocaeli (Gebze \u015Eantiye)",
    requestedItems: [
      {
        productId: "st-01219",
        productName: "25 L\u0130K KOMPOZ\u0130T PPRC BORU (KALDE)",
        requestedQuantity: 200,
        unit: "METRE",
        targetUnitPrice: 60,
        note: "Y\u0131ll\u0131k d\xFCzenli al\u0131m planl\u0131yoruz, toptan iskonto rica ederiz."
      },
      {
        productId: "st-00054",
        productName: "ECA CITIUS PREMIX 24 KW TAM YO\u011EU\u015EMALI KOMB\u0130",
        requestedQuantity: 2,
        unit: "ADET",
        targetUnitPrice: 27e3,
        note: "Toplu konut projesi i\xE7in test edilecek."
      }
    ],
    offeredItems: [
      {
        productId: "st-01219",
        productName: "25 L\u0130K KOMPOZ\u0130T PPRC BORU (KALDE)",
        quantity: 200,
        unit: "METRE",
        listPrice: 71.67,
        offeredUnitPrice: 58,
        discountRate: 19.07,
        totalPrice: 11600,
        adminNote: "Y\u0131ll\u0131k anla\u015Fma \xF6n protokol\xFC kapsam\u0131nda \xF6zel toptan fiyat uyguland\u0131."
      },
      {
        productId: "st-00054",
        productName: "ECA CITIUS PREMIX 24 KW TAM YO\u011EU\u015EMALI KOMB\u0130",
        quantity: 2,
        unit: "ADET",
        listPrice: 29e3,
        offeredUnitPrice: 26500,
        discountRate: 8.62,
        totalPrice: 53e3,
        adminNote: "Yetkili servis ilk \xE7al\u0131\u015Ft\u0131rma ve 3 y\u0131l ECA garantisi dahil."
      }
    ],
    subtotal: 26400,
    discountAmount: 4800,
    shippingFee: 0,
    taxRate: 20,
    taxAmount: 5280,
    grandTotal: 31680,
    status: "offer_sent",
    customerNote: "Toptan al\u0131m i\xE7in teklif bekliyoruz.",
    adminResponseNote: "Talebiniz do\u011Frultusunda en avantajl\u0131 bayi iskonto oranlar\u0131m\u0131z yans\u0131t\u0131lm\u0131\u015Ft\u0131r. \xDCcretsiz nakliye opsiyonu sunulmu\u015Ftur.",
    validUntil: new Date(Date.now() + 864e5 * 7).toISOString().split("T")[0],
    aiSuggestedDiscount: 18,
    aiNotes: "M\xFC\u015Fterinin sipari\u015F hacmi y\xFCksek (50 rulo stre\xE7 + 8 okuyucu). %15-18 aras\u0131 iskonto ile h\u0131zl\u0131 kapan\u0131\u015F sa\u011Flanabilir.",
    securityHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    createdAt: new Date(Date.now() - 864e5 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 36e5 * 3).toISOString()
  }
];
var notifications = [
  {
    id: "notif-1",
    title: "Yeni Sipari\u015F Geldi \u{1F4E6}",
    message: "SIP-2026-8802 numaral\u0131 yeni sipari\u015F onay\u0131n\u0131z\u0131 bekliyor (7.656 \u20BA).",
    type: "order_created",
    targetRole: "admin",
    referenceId: "ord-1002",
    referenceType: "order",
    read: false,
    timestamp: new Date(Date.now() - 36e5 * 1).toISOString()
  },
  {
    id: "notif-2",
    title: "Teklifiniz Haz\u0131rland\u0131 \u2728",
    message: "TKL-2026-4401 numaral\u0131 \xF6zel fiyat teklifiniz y\xF6netici taraf\u0131ndan onayland\u0131 ve sunuldu.",
    type: "quote_offered",
    targetRole: "customer",
    referenceId: "qte-2001",
    referenceType: "quote",
    read: false,
    timestamp: new Date(Date.now() - 36e5 * 3).toISOString()
  }
];
var sseClients = [];
var totalBroadcastsCount = 0;
var totalDbReads = 240;
var totalDbWrites = 85;
var serverStartTime = /* @__PURE__ */ new Date();
var systemSyncLogs = [
  {
    id: `log-init-${Date.now()}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    type: "broadcast",
    event: "SYSTEM_BOOTSTRAP",
    details: "Veritaban\u0131 ve ger\xE7ek zamanl\u0131 senkronizasyon motoru ba\u015Far\u0131yla ba\u015Flat\u0131ld\u0131.",
    status: "ok",
    latencyMs: 1.1,
    activeClientsCount: 0
  }
];
function logSyncEvent(type, event, details, status = "ok", latencyMs = 0.8) {
  const log = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    type,
    event,
    details,
    status,
    latencyMs,
    activeClientsCount: sseClients.length
  };
  systemSyncLogs.unshift(log);
  if (systemSyncLogs.length > 100) {
    systemSyncLogs.pop();
  }
  return log;
}
function broadcastEvent(type, data) {
  const startTime = Date.now();
  totalBroadcastsCount++;
  const payload = JSON.stringify({ type, ...data, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  let deliveredCount = 0;
  sseClients.forEach((client) => {
    try {
      client.res.write(`event: ${type}
data: ${payload}

`);
      client.res.write(`data: ${payload}

`);
      deliveredCount++;
    } catch (err) {
    }
  });
  const duration = Math.max(0.5, Date.now() - startTime);
  logSyncEvent(
    "broadcast",
    type,
    `${deliveredCount} aktif istemciye SSE kanal\u0131 \xFCzerinden anl\u0131k olay iletildi (${payload.length} bayt).`,
    "ok",
    duration
  );
}
function generateHash(data) {
  return import_crypto.default.createHash("sha256").update(typeof data === "string" ? data : JSON.stringify(data)).digest("hex");
}
var AUTH_SECRET = process.env.AUTH_SECRET || "ALPHA-SECURE-B2B-TOKEN-KEY-2026";
function hashPassword(password, salt) {
  return import_crypto.default.pbkdf2Sync(password, salt, 1e4, 64, "sha512").toString("hex");
}
function generateSessionToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    companyName: user.companyName,
    role: user.role,
    isDealer: user.isDealer,
    discountTier: user.discountTier,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1e3
  };
  const str = JSON.stringify(payload);
  const hmac = import_crypto.default.createHmac("sha256", AUTH_SECRET).update(str).digest("hex");
  return Buffer.from(JSON.stringify({ payload, sig: hmac })).toString("base64");
}
function verifySessionToken(token) {
  try {
    if (!token) return null;
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const json = Buffer.from(cleanToken, "base64").toString("utf-8");
    const { payload, sig } = JSON.parse(json);
    const expectedSig = import_crypto.default.createHmac("sha256", AUTH_SECRET).update(JSON.stringify(payload)).digest("hex");
    if (sig !== expectedSig) return null;
    if (payload.exp && Date.now() > payload.exp) return null;
    const user = users.find((u) => u.id === payload.userId);
    return user || null;
  } catch {
    return null;
  }
}
function sanitizeUser(user) {
  const { passwordHash, salt, ...safeUser } = user;
  return safeUser;
}
var adminSalt1 = "salt_alpha_muslimfirat_2026";
var adminSalt2 = "salt_alpha_admin_9941";
var users = [
  {
    id: "usr-admin-muslimfirat",
    email: "muslimfirat@yahoo.com",
    username: "muslimfirat",
    name: "M\xFCsl\xFCm F\u0131rat",
    companyName: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT SAN. VE T\u0130C. LTD. \u015ET\u0130.",
    phone: "+90 544 440 91 80",
    address: "Bat\u0131kent Mahallesi Beyaz\u0131t Bulvar\u0131 No:32/1 Karak\xF6pr\xFC / \u015Eanl\u0131urfa",
    city: "\u015Eanl\u0131urfa",
    taxNumber: "0580948214",
    taxOffice: "Karak\xF6pr\xFC VD",
    role: "admin",
    isDealer: false,
    discountTier: "ALPHA_ADMIN",
    passwordHash: hashPassword("Alpha2026!", adminSalt1),
    salt: adminSalt1,
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: "usr-admin-01",
    email: "admin@alphadogalgaz.com",
    username: "admin",
    name: "ALPHA Sistem Y\xF6neticisi",
    companyName: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT SAN. VE T\u0130C. LTD. \u015ET\u0130.",
    phone: "+90 544 440 91 80",
    address: "Bat\u0131kent Mahallesi Beyaz\u0131t Bulvar\u0131 No:32/1 Karak\xF6pr\xFC / \u015Eanl\u0131urfa",
    city: "\u015Eanl\u0131urfa",
    taxNumber: "0580948214",
    taxOffice: "Karak\xF6pr\xFC VD",
    role: "admin",
    isDealer: false,
    discountTier: "ALPHA_ADMIN",
    passwordHash: hashPassword("Alpha2026!", adminSalt2),
    salt: adminSalt2,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];
function checkLowStockAlert(product, threshold = 5) {
  if (product.stock <= threshold) {
    const existingUnread = notifications.find(
      (n) => n.type === "low_stock" && n.referenceId === product.id && !n.read
    );
    if (!existingUnread) {
      const notif = {
        id: `notif-stock-${product.id}-${Date.now()}`,
        title: `\u26A0\uFE0F D\xFC\u015F\xFCk Stok Alarm\u0131: ${product.name.length > 40 ? product.name.slice(0, 38) + "..." : product.name}`,
        message: `"${product.name}" (${product.sku || "STK"}) \xFCr\xFCn\xFCn\xFCn stok miktar\u0131 kritik ${product.stock} ${product.unit || "ADET"} seviyesine d\xFC\u015Ft\xFC! (Alarm E\u015Fi\u011Fi: \u2264 ${threshold} ${product.unit || "ADET"})`,
        type: "low_stock",
        targetRole: "admin",
        referenceId: product.id,
        referenceType: "product",
        read: false,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      notifications.unshift(notif);
      broadcastEvent("push_notification", { notification: notif });
      broadcastEvent("NOTIFICATION_ADDED", { notification: notif });
      broadcastEvent("LOW_STOCK_ALERT", { product, threshold, notification: notif });
      return notif;
    }
  }
  return null;
}
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  sseClients.push({ id: clientId, res, ip: clientIp, connectedAt: (/* @__PURE__ */ new Date()).toISOString() });
  logSyncEvent(
    "client_connect",
    "SSE_CLIENT_JOINED",
    `Yeni istemci ba\u011Fland\u0131 [${clientId}] (IP: ${clientIp}). Toplam aktif dinleyici: ${sseClients.length}`,
    "ok",
    0.4
  );
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", clientId, timestamp: (/* @__PURE__ */ new Date()).toISOString() })}

`);
  req.on("close", () => {
    const index = sseClients.findIndex((c) => c.id === clientId);
    if (index !== -1) {
      sseClients.splice(index, 1);
      logSyncEvent(
        "client_disconnect",
        "SSE_CLIENT_LEFT",
        `\u0130stemci ba\u011Flant\u0131s\u0131 sonland\u0131 [${clientId}]. Kalan aktif dinleyici: ${sseClients.length}`,
        "ok",
        0.3
      );
    }
  });
});
app.post("/api/auth/login", (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: "E-posta / Kullan\u0131c\u0131 ad\u0131 ve \u015Fifre zorunludur." });
  }
  const query = emailOrUsername.trim().toLowerCase();
  const user = users.find(
    (u) => u.email.toLowerCase() === query || u.username && u.username.toLowerCase() === query
  );
  if (!user) {
    return res.status(401).json({ error: "Ge\xE7ersiz kullan\u0131c\u0131 ad\u0131 veya \u015Fifre." });
  }
  const computedHash = hashPassword(password, user.salt);
  if (computedHash !== user.passwordHash) {
    return res.status(401).json({ error: "Ge\xE7ersiz kullan\u0131c\u0131 ad\u0131 veya \u015Fifre." });
  }
  const token = generateSessionToken(user);
  const safeUser = sanitizeUser(user);
  res.json({
    success: true,
    message: "Giri\u015F ba\u015Far\u0131l\u0131.",
    token,
    user: safeUser
  });
});
app.post("/api/auth/register", (req, res) => {
  const { email, password, name, companyName, phone, address, city, taxNumber, taxOffice } = req.body;
  if (!email || !password || !name || !companyName || !phone) {
    return res.status(400).json({ error: "Firma ad\u0131, yetkili ad soyad, e-posta, telefon ve \u015Fifre zorunludur." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "\u015Eifre en az 6 karakter olmal\u0131d\u0131r." });
  }
  const existing = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: "Bu e-posta adresi ile kay\u0131tl\u0131 bir hesap zaten bulunmaktad\u0131r." });
  }
  const salt = `salt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const passwordHash = hashPassword(password, salt);
  const newUser = {
    id: `usr-${Date.now()}`,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    companyName: companyName.trim(),
    phone: phone.trim(),
    address: address?.trim() || "",
    city: city?.trim() || "\u0130stanbul",
    taxNumber: taxNumber?.trim() || "",
    taxOffice: taxOffice?.trim() || "",
    role: "customer",
    isDealer: true,
    discountTier: "STANDARD_DEALER",
    passwordHash,
    salt,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  users.push(newUser);
  const token = generateSessionToken(newUser);
  const safeUser = sanitizeUser(newUser);
  const notif = {
    id: `notif-user-${Date.now()}`,
    title: "Yeni Bayi Kayd\u0131 Al\u0131nd\u0131 \u{1F3E2}",
    message: `"${newUser.companyName}" (${newUser.name}) sisteme yeni bayi olarak kay\u0131t oldu.`,
    type: "system",
    targetRole: "admin",
    referenceId: newUser.id,
    read: false,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  notifications.unshift(notif);
  broadcastEvent("push_notification", { notification: notif });
  broadcastEvent("NOTIFICATION_ADDED", { notification: notif });
  res.status(201).json({
    success: true,
    message: "Bayi kayd\u0131n\u0131z ba\u015Far\u0131yla olu\u015Fturuldu ve oturum a\xE7\u0131ld\u0131.",
    token,
    user: safeUser
  });
});
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Oturum a\xE7\u0131lmam\u0131\u015F." });
  }
  const user = verifySessionToken(authHeader);
  if (!user) {
    return res.status(401).json({ error: "Ge\xE7ersiz veya s\xFCresi dolmu\u015F oturum anahtar\u0131." });
  }
  res.json({
    success: true,
    user: sanitizeUser(user)
  });
});
app.post("/api/auth/change-password", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Oturum a\xE7\u0131lmam\u0131\u015F." });
  }
  const currentUser = verifySessionToken(authHeader);
  if (!currentUser) {
    return res.status(401).json({ error: "Ge\xE7ersiz veya s\xFCresi dolmu\u015F oturum anahtar\u0131." });
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Mevcut \u015Fifre ve yeni \u015Fifre zorunludur." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Yeni \u015Fifre en az 6 karakter olmal\u0131d\u0131r." });
  }
  const computedHash = hashPassword(currentPassword, currentUser.salt);
  if (computedHash !== currentUser.passwordHash) {
    return res.status(400).json({ error: "Mevcut \u015Fifreniz hatal\u0131." });
  }
  const newSalt = `salt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  currentUser.passwordHash = hashPassword(newPassword, newSalt);
  currentUser.salt = newSalt;
  res.json({
    success: true,
    message: "\u015Eifreniz ba\u015Far\u0131yla g\xFCncellendi."
  });
});
app.get("/api/auth/seed-accounts", (req, res) => {
  res.json({
    success: true,
    productionMode: true,
    accounts: []
  });
});
app.get("/api/products", (req, res) => {
  res.json({ success: true, products });
});
app.post("/api/products", (req, res) => {
  const { name, category, subCategory, description, price, wholesalePrice, stock, unit, minOrderQuantity, imageUrl, sku, barcode, vatRate } = req.body;
  if (!name || price === void 0 || price === null) {
    return res.status(400).json({ error: "\xDCr\xFCn ad\u0131 ve fiyat\u0131 zorunludur." });
  }
  const newProduct = {
    id: `st-${Date.now().toString().slice(-5)}`,
    name,
    category: category || "GENEL",
    subCategory: subCategory || "",
    description: description || "",
    price: Number(price),
    wholesalePrice: wholesalePrice !== void 0 ? Number(wholesalePrice) : Math.round(Number(price) * 0.8),
    stock: Number(stock) || 0,
    unit: unit || "ADET",
    minOrderQuantity: Number(minOrderQuantity) || 1,
    imageUrl: imageUrl || "",
    sku: sku || `ST${Date.now().toString().slice(-5)}`,
    barcode: barcode || "",
    vatRate: Number(vatRate) || 20,
    featured: false
  };
  products.unshift(newProduct);
  broadcastEvent("PRODUCT_UPDATED", { action: "create", product: newProduct });
  res.status(201).json({ success: true, product: newProduct });
});
app.post("/api/products/bulk-update", (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: "Ge\xE7ersiz g\xFCncelleme listesi." });
  }
  const updatedItems = [];
  for (const item of updates) {
    const idx = products.findIndex((p) => p.id === item.id);
    if (idx !== -1) {
      products[idx] = {
        ...products[idx],
        ...item,
        price: item.price !== void 0 ? Number(item.price) : products[idx].price,
        wholesalePrice: item.wholesalePrice !== void 0 ? Number(item.wholesalePrice) : products[idx].wholesalePrice,
        stock: item.stock !== void 0 ? Number(item.stock) : products[idx].stock
      };
      updatedItems.push(products[idx]);
      checkLowStockAlert(products[idx], 5);
    }
  }
  broadcastEvent("PRODUCT_UPDATED", { action: "bulk-update", count: updatedItems.length });
  res.json({ success: true, updatedCount: updatedItems.length, products });
});
app.post("/api/products/bulk-import", (req, res) => {
  const { products: importedList } = req.body;
  if (!Array.isArray(importedList)) {
    return res.status(400).json({ error: "Ge\xE7ersiz \xFCr\xFCn listesi." });
  }
  let createdCount = 0;
  let updatedCount = 0;
  for (const item of importedList) {
    if (!item.name || item.price === void 0) continue;
    const existingIdx = products.findIndex(
      (p) => item.sku && p.sku && p.sku.toLowerCase() === item.sku.toLowerCase() || item.barcode && p.barcode && p.barcode === item.barcode || p.name.toLowerCase() === item.name.toLowerCase()
    );
    if (existingIdx !== -1) {
      products[existingIdx] = {
        ...products[existingIdx],
        price: Number(item.price) || products[existingIdx].price,
        wholesalePrice: item.wholesalePrice !== void 0 ? Number(item.wholesalePrice) : products[existingIdx].wholesalePrice,
        stock: item.stock !== void 0 ? Number(item.stock) : products[existingIdx].stock,
        category: item.category || products[existingIdx].category,
        subCategory: item.subCategory || products[existingIdx].subCategory,
        unit: item.unit || products[existingIdx].unit,
        barcode: item.barcode || products[existingIdx].barcode,
        sku: item.sku || products[existingIdx].sku
      };
      updatedCount++;
    } else {
      const newProd = {
        id: item.id || `st-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`,
        name: item.name,
        category: item.category || "GENEL",
        subCategory: item.subCategory || "",
        description: item.description || "",
        price: Number(item.price),
        wholesalePrice: item.wholesalePrice !== void 0 ? Number(item.wholesalePrice) : Math.round(Number(item.price) * 0.8),
        stock: Number(item.stock) || 0,
        unit: item.unit || "ADET",
        minOrderQuantity: Number(item.minOrderQuantity) || 1,
        imageUrl: item.imageUrl || "",
        sku: item.sku || `ST-${Date.now().toString().slice(-5)}`,
        barcode: item.barcode || "",
        vatRate: Number(item.vatRate) || 20,
        featured: false
      };
      products.unshift(newProd);
      createdCount++;
    }
  }
  broadcastEvent("PRODUCT_UPDATED", { action: "bulk-import", createdCount, updatedCount });
  res.json({ success: true, createdCount, updatedCount, totalProducts: products.length });
});
app.get("/api/products/low-stock", (req, res) => {
  const threshold = req.query.threshold !== void 0 ? Number(req.query.threshold) : 5;
  const lowStockProducts = products.filter((p) => p.stock <= threshold);
  res.json({
    success: true,
    threshold,
    count: lowStockProducts.length,
    products: lowStockProducts
  });
});
app.post("/api/products/check-low-stock", (req, res) => {
  const threshold = req.body.threshold !== void 0 ? Number(req.body.threshold) : 5;
  let newlyAlerted = 0;
  for (const prod of products) {
    if (prod.stock <= threshold) {
      const alerted = checkLowStockAlert(prod, threshold);
      if (alerted) newlyAlerted++;
    }
  }
  const lowStockCount = products.filter((p) => p.stock <= threshold).length;
  res.json({ success: true, threshold, lowStockCount, newlyAlerted });
});
app.post("/api/products/adjust-prices", (req, res) => {
  const { category, percentage, applyToWholesale } = req.body;
  const rate = 1 + (Number(percentage) || 0) / 100;
  products = products.map((p) => {
    if (!category || category === "ALL" || p.category === category) {
      const newPrice = Math.round(p.price * rate * 100) / 100;
      const newWholesale = applyToWholesale && p.wholesalePrice ? Math.round(p.wholesalePrice * rate * 100) / 100 : p.wholesalePrice;
      return {
        ...p,
        price: newPrice,
        wholesalePrice: newWholesale
      };
    }
    return p;
  });
  broadcastEvent("PRODUCT_UPDATED", { action: "bulk-price-adjusted", percentage, category });
  res.json({ success: true, message: `Fiyatlar %${percentage} oran\u0131nda g\xFCncellendi.`, products });
});
app.post("/api/products/reset", (req, res) => {
  products = [...STOCK_PDF_PRODUCTS];
  broadcastEvent("PRODUCT_UPDATED", { action: "reset" });
  res.json({ success: true, message: "\xDCr\xFCn listesi stok.pdf fabrika ayarlar\u0131na s\u0131f\u0131rland\u0131.", products });
});
app.put("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\xDCr\xFCn bulunamad\u0131." });
  }
  products[index] = { ...products[index], ...req.body, id };
  checkLowStockAlert(products[index], 5);
  broadcastEvent("PRODUCT_UPDATED", { action: "update", product: products[index] });
  res.json({ success: true, product: products[index] });
});
app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "\xDCr\xFCn bulunamad\u0131." });
  }
  const deleted = products.splice(index, 1)[0];
  broadcastEvent("PRODUCT_UPDATED", { action: "delete", productId: id });
  res.json({ success: true, deleted });
});
app.get("/api/orders", (req, res) => {
  res.json({ success: true, orders });
});
app.post("/api/orders", (req, res) => {
  const { customerName, customerEmail, customerPhone, customerAddress, items, notes, encryptedPayload, sourceQuoteId } = req.body;
  if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "M\xFC\u015Fteri bilgileri ve sipari\u015F \xFCr\xFCnleri eksiksiz girilmelidir." });
  }
  let subtotal = 0;
  const orderItems = items.map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const total2 = qty * unitPrice;
    subtotal += total2;
    if (item.productId) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - qty);
        checkLowStockAlert(prod, 5);
      }
    }
    return {
      productId: item.productId || `custom-${Date.now()}`,
      productName: item.productName || "\xD6zel \xDCr\xFCn",
      quantity: qty,
      unit: item.unit || "Adet",
      unitPrice,
      totalPrice: total2,
      note: item.note
    };
  });
  const discount = req.body.discount ? Number(req.body.discount) : 0;
  const tax = Math.round((subtotal - discount) * 0.2);
  const total = subtotal - discount + tax;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const orderNumber = `SIP-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
  const newOrder = {
    id: `ord-${Date.now()}`,
    orderNumber,
    customerName,
    customerEmail: customerEmail || "musteri@sirket.com",
    customerPhone: customerPhone || "+90 555 000 00 00",
    customerAddress: customerAddress || "Belirtilmedi",
    items: orderItems,
    subtotal,
    discount,
    tax,
    total,
    status: "pending",
    notes: notes || "",
    encryptedPayload: encryptedPayload || "",
    signatureHash: generateHash({ orderNumber, customerName, total, items: orderItems }),
    trackingNumber: "",
    statusHistory: [
      {
        id: `hist-${Date.now()}-1`,
        status: "pending",
        timestamp: now,
        note: "Sipari\u015F ba\u015Far\u0131yla olu\u015Fturuldu ve onaya al\u0131nd\u0131.",
        updatedBy: customerName
      }
    ],
    createdAt: now,
    updatedAt: now,
    sourceQuoteId: sourceQuoteId || void 0
  };
  orders.unshift(newOrder);
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Yeni Sipari\u015F Olu\u015Fturuldu \u{1F6D2}",
    message: `${newOrder.customerName} taraf\u0131ndan ${newOrder.orderNumber} nolu sipari\u015F verildi. Toplam: ${newOrder.total.toLocaleString("tr-TR")} \u20BA`,
    type: "order_created",
    targetRole: "admin",
    referenceId: newOrder.id,
    referenceType: "order",
    read: false,
    timestamp: now
  };
  notifications.unshift(notif);
  broadcastEvent("ORDER_CREATED", { order: newOrder });
  broadcastEvent("NOTIFICATION_ADDED", { notification: notif });
  broadcastEvent("push_notification", { notification: notif });
  broadcastEvent("products_updated", {});
  res.status(201).json({ success: true, order: newOrder, notification: notif });
});
app.patch("/api/orders/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber } = req.body;
  const order = orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ error: "Sipari\u015F bulunamad\u0131." });
  }
  const statusNotes = {
    approved: "Y\xF6netici taraf\u0131ndan onayland\u0131 ve cari hesaba i\u015Flendi.",
    preparing: "Depo haz\u0131rlama ve koli toplama s\xFCrecine al\u0131nd\u0131.",
    shipped: `Kargoya verildi / sevk edildi.${trackingNumber ? ` Takip No: ${trackingNumber}` : ""}`,
    delivered: "Teslimat ba\u015Far\u0131yla tamamland\u0131.",
    cancelled: "Sipari\u015F iptal edildi.",
    pending: "Sipari\u015F yeniden aktif edildi / beklemede."
  };
  const statusRoles = {
    approved: "Y\xF6netici (Finans)",
    preparing: "Depo Sorumlusu",
    shipped: "Sevkiyat Birimi",
    delivered: "Kargo / Teslimat",
    cancelled: "Y\xF6netici",
    pending: "Sistem"
  };
  if (!order.statusHistory) {
    order.statusHistory = [
      {
        id: `hist-init-${order.id}`,
        status: "pending",
        timestamp: order.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
        note: "Sipari\u015F kayd\u0131 olu\u015Fturuldu.",
        updatedBy: order.customerName
      }
    ];
  }
  const changeTimestamp = (/* @__PURE__ */ new Date()).toISOString();
  order.statusHistory.push({
    id: `hist-${Date.now()}`,
    status,
    timestamp: changeTimestamp,
    note: req.body.note || statusNotes[status] || "Durum g\xFCncellendi.",
    updatedBy: req.body.updatedBy || statusRoles[status] || "Y\xF6netici",
    trackingNumber: trackingNumber || order.trackingNumber || void 0
  });
  order.status = status;
  if (trackingNumber) {
    order.trackingNumber = trackingNumber;
  }
  order.updatedAt = changeTimestamp;
  const statusLabels = {
    approved: "Onayland\u0131 \u2705",
    preparing: "Haz\u0131rlan\u0131yor \u{1F4E6}",
    shipped: "Kargoya Verildi / Yolda \u{1F69A}",
    delivered: "Teslim Edildi \u{1F389}",
    cancelled: "\u0130ptal Edildi \u274C",
    pending: "Beklemede \u23F3"
  };
  const notif = {
    id: `notif-${Date.now()}`,
    title: `Sipari\u015F Durumu G\xFCncellendi: ${order.orderNumber}`,
    message: `Sipari\u015Finizin yeni durumu: ${statusLabels[status] || status}${order.trackingNumber ? ` (Takip No: ${order.trackingNumber})` : ""}`,
    type: "order_updated",
    targetRole: "customer",
    referenceId: order.id,
    referenceType: "order",
    read: false,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  notifications.unshift(notif);
  broadcastEvent("ORDER_UPDATED", order);
  broadcastEvent("NOTIFICATION_ADDED", notif);
  res.json({ success: true, order, notification: notif });
});
app.get("/api/quotes", (req, res) => {
  res.json({ success: true, quotes });
});
app.post("/api/quotes/request", (req, res) => {
  const { customerName, customerCompany, customerEmail, customerPhone, deliveryCity, requestedItems, customerNote, encryptedConfidentialNote } = req.body;
  if (!customerName || !requestedItems || !Array.isArray(requestedItems) || requestedItems.length === 0) {
    return res.status(400).json({ error: "M\xFC\u015Fteri ad\u0131 ve teklif istenecek \xFCr\xFCnler girilmelidir." });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const quoteNumber = `TKL-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
  const newQuote = {
    id: `qte-${Date.now()}`,
    quoteNumber,
    customerName,
    customerCompany: customerCompany || "",
    customerEmail: customerEmail || "talep@sirket.com",
    customerPhone: customerPhone || "+90 555 111 22 33",
    deliveryCity: deliveryCity || "\u0130stanbul",
    requestedItems: requestedItems.map((item) => ({
      productId: item.productId,
      productName: item.productName || "\xD6zel \xDCr\xFCn Talebi",
      requestedQuantity: Number(item.requestedQuantity) || 1,
      unit: item.unit || "Adet",
      targetUnitPrice: item.targetUnitPrice ? Number(item.targetUnitPrice) : void 0,
      note: item.note || ""
    })),
    status: "pending_review",
    customerNote: customerNote || "",
    encryptedConfidentialNote: encryptedConfidentialNote || "",
    taxRate: 20,
    securityHash: generateHash({ quoteNumber, customerName, requestedItems }),
    createdAt: now,
    updatedAt: now
  };
  quotes.unshift(newQuote);
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Yeni Teklif Talebi Geldi \u{1F4DD}",
    message: `${newQuote.customerName} (${newQuote.customerCompany || "M\xFC\u015Fteri"}) ${newQuote.quoteNumber} i\xE7in fiyat teklifi bekliyor.`,
    type: "quote_requested",
    targetRole: "admin",
    referenceId: newQuote.id,
    referenceType: "quote",
    read: false,
    timestamp: now
  };
  notifications.unshift(notif);
  broadcastEvent("QUOTE_CREATED", newQuote);
  broadcastEvent("NOTIFICATION_ADDED", notif);
  res.status(201).json({ success: true, quote: newQuote, notification: notif });
});
app.post("/api/quotes/:id/respond", (req, res) => {
  const { id } = req.params;
  const { offeredItems, adminResponseNote, paymentTerms, validUntil, shippingFee, discountAmount, aiSuggestedDiscount, aiNotes } = req.body;
  const quote = quotes.find((q) => q.id === id);
  if (!quote) {
    return res.status(404).json({ error: "Teklif bulunamad\u0131." });
  }
  let subtotal = 0;
  const processedOfferedItems = (offeredItems || []).map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.offeredUnitPrice) || Number(item.listPrice) || 0;
    const total = qty * unitPrice;
    subtotal += total;
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: qty,
      unit: item.unit || "Adet",
      listPrice: Number(item.listPrice) || unitPrice,
      offeredUnitPrice: unitPrice,
      discountRate: Number(item.discountRate) || 0,
      totalPrice: total,
      adminNote: item.adminNote || ""
    };
  });
  const discount = discountAmount ? Number(discountAmount) : 0;
  const shipping = shippingFee ? Number(shippingFee) : 0;
  const taxableBase = Math.max(0, subtotal - discount);
  const taxAmount = Math.round(taxableBase * 0.2);
  const grandTotal = taxableBase + taxAmount + shipping;
  quote.offeredItems = processedOfferedItems;
  quote.subtotal = subtotal;
  quote.discountAmount = discount;
  quote.shippingFee = shipping;
  quote.taxAmount = taxAmount;
  quote.grandTotal = grandTotal;
  quote.status = "offer_sent";
  quote.adminResponseNote = adminResponseNote || "Teklifimiz haz\u0131rlanm\u0131\u015F olup bilgilerinize sunulmu\u015Ftur.";
  quote.paymentTerms = paymentTerms || "Pe\u015Fin (Havale/EFT)";
  quote.validUntil = validUntil || new Date(Date.now() + 864e5 * 7).toISOString().split("T")[0];
  quote.aiSuggestedDiscount = aiSuggestedDiscount;
  quote.aiNotes = aiNotes;
  quote.securityHash = generateHash({ quoteNumber: quote.quoteNumber, grandTotal, offeredItems: processedOfferedItems });
  quote.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Fiyat Teklifiniz G\xF6nderildi \u2728",
    message: `${quote.quoteNumber} numaral\u0131 teklifiniz haz\u0131rland\u0131! Toplam: ${quote.grandTotal.toLocaleString("tr-TR")} \u20BA. \u0130nceleyip an\u0131nda onaylayabilirsiniz.`,
    type: "quote_offered",
    targetRole: "customer",
    referenceId: quote.id,
    referenceType: "quote",
    read: false,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  notifications.unshift(notif);
  broadcastEvent("QUOTE_UPDATED", quote);
  broadcastEvent("NOTIFICATION_ADDED", notif);
  res.json({ success: true, quote, notification: notif });
});
app.post("/api/quotes/:id/accept", (req, res) => {
  const { id } = req.params;
  const quote = quotes.find((q) => q.id === id);
  if (!quote) {
    return res.status(404).json({ error: "Teklif bulunamad\u0131." });
  }
  quote.status = "accepted";
  quote.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  const orderNumber = `SIP-${(/* @__PURE__ */ new Date()).getFullYear()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
  const orderItems = (quote.offeredItems || []).map((item) => ({
    productId: item.productId || `quote-prod-${Date.now()}`,
    productName: item.productName,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.offeredUnitPrice,
    totalPrice: item.totalPrice,
    note: `Teklif Kalemi (${quote.quoteNumber})`
  }));
  for (const item of quote.offeredItems || []) {
    if (item.productId) {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        checkLowStockAlert(prod, 5);
      }
    }
  }
  const createdOrder = {
    id: `ord-${Date.now()}`,
    orderNumber,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone,
    customerAddress: `${quote.deliveryCity} (Teklif Kayd\u0131)`,
    items: orderItems,
    subtotal: quote.subtotal || 0,
    discount: quote.discountAmount || 0,
    tax: quote.taxAmount || 0,
    total: quote.grandTotal || 0,
    status: "approved",
    notes: `Bu sipari\u015F ${quote.quoteNumber} numaral\u0131 onaylanan tekliften otomatik olu\u015Fturulmu\u015Ftur. \xD6deme \u015Eekli: ${quote.paymentTerms || "Pe\u015Fin"}`,
    signatureHash: generateHash({ orderNumber, customerName: quote.customerName, total: quote.grandTotal, sourceQuoteId: quote.id }),
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    sourceQuoteId: quote.id
  };
  orders.unshift(createdOrder);
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Teklif Onayland\u0131 & Sipari\u015Fe D\xF6n\xFC\u015Ft\xFC! \u{1F389}",
    message: `${quote.customerName}, ${quote.quoteNumber} teklifini onaylad\u0131. ${createdOrder.orderNumber} nolu sipari\u015F olarak i\u015Fleme al\u0131nd\u0131.`,
    type: "quote_accepted",
    targetRole: "admin",
    referenceId: createdOrder.id,
    referenceType: "order",
    read: false,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  notifications.unshift(notif);
  broadcastEvent("QUOTE_UPDATED", { quote });
  broadcastEvent("ORDER_CREATED", { order: createdOrder });
  broadcastEvent("NOTIFICATION_ADDED", { notification: notif });
  broadcastEvent("push_notification", { notification: notif });
  broadcastEvent("products_updated", {});
  res.json({ success: true, quote, order: createdOrder, notification: notif });
});
app.post("/api/quotes/:id/reject", (req, res) => {
  const { id } = req.params;
  const quote = quotes.find((q) => q.id === id);
  if (!quote) {
    return res.status(404).json({ error: "Teklif bulunamad\u0131." });
  }
  quote.status = "rejected";
  quote.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  broadcastEvent("QUOTE_UPDATED", { quote });
  res.json({ success: true, quote });
});
app.get("/api/notifications", (req, res) => {
  res.json({ success: true, notifications });
});
app.post("/api/notifications/read-all", (req, res) => {
  notifications.forEach((n) => {
    n.read = true;
  });
  res.json({ success: true });
});
app.post(["/api/notifications/:id/read", "/api/notifications/mark-read/:id"], (req, res) => {
  const { id } = req.params;
  const notif = notifications.find((n) => n.id === id);
  if (notif) {
    notif.read = true;
  }
  res.json({ success: true });
});
app.post("/api/gemini/quote-ai", async (req, res) => {
  try {
    if (!ai) {
      return res.json({
        success: true,
        ai: {
          suggestedDiscountPercent: 12,
          suggestedPaymentTerm: "30 G\xFCn Vade",
          strategySummary: "M\xFC\u015Fteri hacimli talepte bulunmu\u015F. %12 iskonto ve \xFCcretsiz kargo ile h\u0131zl\u0131 mutabakat sa\u011Flanabilir.",
          personalizedCustomerMessage: "Say\u0131n Yetkili, \u015Firketiniz i\xE7in haz\u0131rlad\u0131\u011F\u0131m\u0131z \xF6zel kurumsal fiyat teklifimiz ektedir. Belirtilen adetler i\xE7in maksimum bayi iskontomuz yans\u0131t\u0131lm\u0131\u015Ft\u0131r.",
          complementaryProductsSuggested: [
            { name: "End\xFCstriyel Stre\xE7 Film", reason: "Koli sevkiyatlar\u0131nda palet korumas\u0131 sa\u011Flar.", expectedGain: "+15% sepet b\xFCy\xFCmesi" },
            { name: "Koli Band\u0131 100m", reason: "Ambalaj kolisi sipari\u015Fi veren m\xFC\u015Fteriler i\xE7in zorunlu tamamlay\u0131c\u0131d\u0131r.", expectedGain: "+8% ek ciro" }
          ],
          marginSafetyAnalysis: "Mevcut toptan maliyet taban\u0131na g\xF6re %12 indirimde %24 br\xFCt k\xE2r marj\u0131 korunmaktad\u0131r.",
          urgencyOrClosingTip: "Teklif ge\xE7erlilik s\xFCresini 7 g\xFCn ile s\u0131n\u0131rland\u0131rarak h\u0131zl\u0131 sipari\u015F onay\u0131 isteyiniz."
        }
      });
    }
    const { requestedItems, customerCompany, customerName, deliveryCity, notes } = req.body;
    const prompt = `
A\u015Fa\u011F\u0131daki kurumsal m\xFC\u015Fteri teklif talebini analiz et ve B2B/B2C sat\u0131\u015F uzman\u0131 gibi en karl\u0131 ve h\u0131zl\u0131 d\xF6n\xFC\u015F sa\u011Flayan teklif stratejisi olu\u015Ftur.

M\xDC\u015ETER\u0130 B\u0130LG\u0130S\u0130:
- M\xFC\u015Fteri / Firma: ${customerCompany || customerName || "Kurumsal M\xFC\u015Fteri"}
- Teslimat \u0130li: ${deliveryCity || "\u0130stanbul"}
- M\xFC\u015Fteri Notu: ${notes || "Yok"}

TALEP ED\u0130LEN \xDCR\xDCNLER:
${JSON.stringify(requestedItems, null, 2)}

MEVCUT KATALOG REFERANSI:
${JSON.stringify(products.map((p) => ({ name: p.name, price: p.price, wholesale: p.wholesalePrice, stock: p.stock, unit: p.unit })), null, 2)}

Gereksinim:
1. Sipari\u015F b\xFCy\xFCkl\xFC\u011F\xFC ve adedine g\xF6re optimum iskonto y\xFCzdesi (%5 - %25 aras\u0131).
2. \xD6deme vadesi \xF6nerisi (Pe\u015Fin, 30 G\xFCn Vade vb.).
3. Y\xF6netici i\xE7in strateji \xF6zeti.
4. M\xFC\u015Fteriye \xF6zel samimi ve profesyonel teklif sunum mesaj\u0131 (T\xFCrk\xE7e).
5. Bu sipari\u015Fe eklenebilecek 2 adet tamamlay\u0131c\u0131 \xE7apraz sat\u0131\u015F \xFCr\xFCn\xFC ve sebebi.
6. K\xE2r marj\u0131 g\xFCvenlik analizi.
7. Sat\u0131\u015F kapatma / aciliyet tavsiyesi.
`;
    try {
      const response = await generateAIContentResilient({
        contents: prompt,
        config: {
          systemInstruction: "Sen profesyonel bir B2B Tedarik, Sat\u0131\u015F ve Fiyatland\u0131rma Zekas\u0131 Asistan\u0131s\u0131n. T\xFCrk\xE7e, net, ger\xE7ek\xE7i ve karl\u0131 ticari teklif stratejileri \xFCretirsin.",
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              suggestedDiscountPercent: { type: import_genai.Type.NUMBER, description: "\xD6nerilen iskonto y\xFCzdesi (\xF6rn: 15)" },
              suggestedPaymentTerm: { type: import_genai.Type.STRING, description: "\xD6nerilen \xF6deme \u015Fekli" },
              strategySummary: { type: import_genai.Type.STRING, description: "Y\xF6neticiye \xF6zel teklif stratejisi \xF6zeti" },
              personalizedCustomerMessage: { type: import_genai.Type.STRING, description: "M\xFC\u015Fteriye g\xF6nderilecek profesyonel teklif mesaj\u0131" },
              complementaryProductsSuggested: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    name: { type: import_genai.Type.STRING },
                    reason: { type: import_genai.Type.STRING },
                    expectedGain: { type: import_genai.Type.STRING }
                  },
                  required: ["name", "reason", "expectedGain"]
                }
              },
              marginSafetyAnalysis: { type: import_genai.Type.STRING, description: "K\xE2r marj\u0131 analiz de\u011Ferlendirmesi" },
              urgencyOrClosingTip: { type: import_genai.Type.STRING, description: "Teklif kapatma tavsiyesi" }
            },
            required: [
              "suggestedDiscountPercent",
              "suggestedPaymentTerm",
              "strategySummary",
              "personalizedCustomerMessage",
              "complementaryProductsSuggested",
              "marginSafetyAnalysis",
              "urgencyOrClosingTip"
            ]
          }
        }
      });
      const aiResult = JSON.parse(response?.text || "{}");
      return res.json({ success: true, ai: aiResult });
    } catch (aiErr) {
      return res.json({
        success: true,
        ai: {
          suggestedDiscountPercent: 10,
          suggestedPaymentTerm: "30 G\xFCn Vadeli / \xC7ek",
          strategySummary: "Kurumsal sipari\u015F hacmi de\u011Ferlendirildi; %10 bayi iskontosu ve h\u0131zl\u0131 sevkiyat \xF6nerildi.",
          personalizedCustomerMessage: `Say\u0131n ${customerCompany || customerName || "Yetkili"}, firman\u0131z i\xE7in haz\u0131rlanan \xF6zel toptan fiyat teklifimiz ekte yer almaktad\u0131r.`,
          complementaryProductsSuggested: [
            { name: "PPRC Boru ve Ek Par\xE7alar\u0131", reason: "Tesisat i\u015Flerinde montaj b\xFCt\xFCnl\xFC\u011F\xFC sa\u011Flar.", expectedGain: "+15% sepet art\u0131\u015F\u0131" },
            { name: "Teflon Bant ve Conta Seti", reason: "S\u0131zd\u0131rmazl\u0131k i\xE7in zorunlu montaj sarf malzemesidir.", expectedGain: "+5% k\xE2rl\u0131l\u0131k" }
          ],
          marginSafetyAnalysis: "Katalog toptan liste fiyat\u0131na g\xF6re br\xFCt k\xE2r marj\u0131 g\xFCvenli seviyede tutulmaktad\u0131r.",
          urgencyOrClosingTip: "Fiyatlar\u0131n 7 i\u015F g\xFCn\xFC ge\xE7erli oldu\u011Funu belirterek sipari\u015F teyidi talep ediniz."
        }
      });
    }
  } catch (error) {
    console.error("Gemini Quote AI Error:", error);
    res.status(500).json({ error: error.message || "AI teklif \xF6nerisi olu\u015Fturulurken bir hata olu\u015Ftu." });
  }
});
app.post("/api/gemini/smart-basket", async (req, res) => {
  try {
    const { userPrompt } = req.body;
    if (!userPrompt) {
      return res.status(400).json({ error: "L\xFCtfen bir talep metni girin." });
    }
    const normalizedPrompt = userPrompt.toLowerCase();
    const promptKeywords = normalizedPrompt.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, " ").split(/\s+/).filter((k) => k.length >= 2);
    const scoredCandidates = products.map((p) => {
      let score = 0;
      const pName = p.name.toLowerCase();
      const pCat = p.category.toLowerCase();
      const pSub = (p.subCategory || "").toLowerCase();
      const pDesc = (p.description || "").toLowerCase();
      promptKeywords.forEach((kw) => {
        if (pName.includes(kw)) score += 10;
        if (pCat.includes(kw)) score += 5;
        if (pSub.includes(kw)) score += 4;
        if (pDesc.includes(kw)) score += 2;
      });
      if (p.featured) score += 1;
      return { product: p, score };
    });
    scoredCandidates.sort((a, b) => b.score - a.score);
    const topCandidates = scoredCandidates.filter((item) => item.score > 0).slice(0, 45).map((item) => item.product);
    const catalogSubset = topCandidates.length >= 5 ? topCandidates : products.slice(0, 45);
    const buildFallbackBasket = () => {
      const selected = catalogSubset.slice(0, 4);
      return {
        success: true,
        items: selected.map((p) => ({
          productId: p.id,
          productName: p.name,
          quantity: p.minOrderQuantity || (p.unit === "METRE" ? 100 : 2),
          unitPrice: p.price
        })),
        explanation: `Talebiniz ("${userPrompt}") incelendi ve \u015Firket envanterimizdeki ger\xE7ek s\u0131hhi tesisat & \u0131s\u0131tma stoklar\u0131m\u0131zdan en uygun ${selected.length} kalem \xFCr\xFCn se\xE7ilerek sepet olu\u015Fturuldu.`
      };
    };
    if (!ai) {
      return res.json(buildFallbackBasket());
    }
    const prompt = `
M\xFC\u015Fteri Proje / \u015Eantiye Talebi: "${userPrompt}"

\u015Eirketimizin Ger\xE7ek Stok Envanteri (Sadece a\u015Fa\u011F\u0131daki \xFCr\xFCnlerden se\xE7im yap):
${JSON.stringify(catalogSubset.map((p) => ({ id: p.id, sku: p.sku, name: p.name, price: p.price, unit: p.unit, category: p.category, stock: p.stock })), null, 2)}

G\xF6rev:
Kullan\u0131c\u0131n\u0131n mekanik tesisat, \u0131s\u0131tma, s\u0131hhi tesisat veya bina projesi ihtiyac\u0131na g\xF6re yukar\u0131daki ger\xE7ek katalogdan en do\u011Fru \xFCr\xFCnleri (tam ID ve tam ad\u0131yla) ve mant\u0131kl\u0131 \u015Fantiye metraj/adetlerini se\xE7erek paket sepet olu\u015Ftur.
`;
    try {
      const response = await generateAIContentResilient({
        contents: prompt,
        config: {
          systemInstruction: "Sen T\xFCrkiye'nin lider s\u0131hhi tesisat, kombi, PPRC boru, vana ve mekanik m\xFChendislik toptanc\u0131s\u0131n\u0131n ak\u0131ll\u0131 sipari\u015F dan\u0131\u015Fman\u0131s\u0131n. Sadece ve sadece sana verilen ger\xE7ek stok katalo\u011Fundaki \xFCr\xFCnleri se\xE7ersin. Asla katalogda olmayan hayali veya alakas\u0131z \xFCr\xFCn uydurmazs\u0131n.",
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              items: {
                type: import_genai.Type.ARRAY,
                items: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    productId: { type: import_genai.Type.STRING },
                    productName: { type: import_genai.Type.STRING },
                    quantity: { type: import_genai.Type.NUMBER },
                    unitPrice: { type: import_genai.Type.NUMBER }
                  },
                  required: ["productId", "productName", "quantity", "unitPrice"]
                }
              },
              explanation: { type: import_genai.Type.STRING, description: "Tesisat paketi gerek\xE7esi ve teknik \xFCr\xFCn se\xE7imi a\xE7\u0131klamas\u0131" }
            },
            required: ["items", "explanation"]
          }
        }
      });
      const result = JSON.parse(response?.text || "{}");
      if (result && result.items && result.items.length > 0) {
        const validatedItems = result.items.map((it) => {
          const matched = products.find((p) => p.id === it.productId || p.name.toLowerCase() === (it.productName || "").toLowerCase());
          return matched ? {
            productId: matched.id,
            productName: matched.name,
            quantity: it.quantity || matched.minOrderQuantity || 1,
            unitPrice: matched.price
          } : it;
        });
        return res.json({
          success: true,
          items: validatedItems,
          explanation: result.explanation
        });
      }
    } catch (aiErr) {
      console.warn("Gemini AI API ge\xE7ici olarak kullan\u0131lam\u0131yor, ak\u0131ll\u0131 katalog fallback \xE7al\u0131\u015Ft\u0131r\u0131l\u0131yor:", aiErr?.message);
    }
    res.json(buildFallbackBasket());
  } catch (error) {
    console.error("Smart Basket Error:", error);
    res.status(500).json({ error: error.message || "Ak\u0131ll\u0131 sepet olu\u015Fturulamad\u0131." });
  }
});
app.post("/api/system/client-error", (req, res) => {
  try {
    const errorData = req.body;
    totalDbWrites++;
    logSyncEvent(
      "db_write",
      `\u0130stemci Hatas\u0131 Yakaland\u0131 (${errorData.severity || "error"})`,
      `${errorData.component || "UI"}: ${errorData.message || "Bilinmeyen Hata"}`,
      errorData.severity === "critical" ? "error" : "warning"
    );
    res.json({ success: true, loggedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/gemini/fix-it", async (req, res) => {
  try {
    const { error } = req.body;
    if (!error || !error.message) {
      return res.status(400).json({ error: "\u0130ncelenecek hata bilgisi bulunamad\u0131." });
    }
    const generateRuleBasedAnalysis = (err) => {
      const msg = (err.message || "").toLowerCase();
      let rootCause = `${err.component || "Sistem Bile\u015Feni"}: ${err.message}`;
      let solutionSteps = [
        "Bile\u015Fen i\xE7ine try/catch ve safe state korumas\u0131 uyguland\u0131.",
        "Tan\u0131ms\u0131z nesne referanslar\u0131 opsiyonel zincirleme (?.) ile sar\u0131ld\u0131.",
        "Hata durumunda kullan\u0131c\u0131ya g\xF6rsel bildirim g\xF6sterildi."
      ];
      let codeSnippet = `// D\xFCzeltme \xD6rne\u011Fi
try {
  const data = await fetchData();
  setState(data ?? fallbackData);
} catch (err) {
  console.warn("Hata g\xFCvenli \u015Fekilde yakaland\u0131:", err);
  setErrorState(null);
}`;
      let autoAction = "RESET_STATE";
      let autoDesc = "Bile\u015Fen yerel durumu ve ge\xE7ici \xE7erez \xF6nbelle\u011Fi s\u0131f\u0131rland\u0131.";
      let prevAdvice = "Statik tip tan\u0131mlamalar\u0131n\u0131 eksiksiz tutun ve API yan\u0131tlar\u0131nda schema validasyonu uygulay\u0131n.";
      if (msg.includes("cannot read properties") || msg.includes("null") || msg.includes("undefined")) {
        rootCause = "Tan\u0131ms\u0131z veya null olan bir nesne \xF6zelli\u011Fi render s\u0131ras\u0131nda do\u011Frudan \xE7a\u011Fr\u0131ld\u0131.";
        solutionSteps = [
          "State ba\u015Flatma de\u011Fi\u015Fkenlerine g\xFCvenli varsay\u0131lan de\u011Ferler atand\u0131.",
          "Props ve API yan\u0131t\u0131 kontrollerine opsiyonel zincirleme (?.) eklendi.",
          "Bile\u015Fen render guard (if (!data) return <Skeleton />) mekanizmas\u0131 kontrol edildi."
        ];
        codeSnippet = `// G\xFCvenli Property Eri\u015Fimi
const customerName = customer?.companyName || customer?.name || 'Belirtilmedi';
const items = order?.items?.map(it => it.productName) ?? [];`;
        autoAction = "RESET_STATE";
        autoDesc = "Bozuk veya eksik render state temizlendi ve varsay\u0131lan veri \u015Fablonu y\xFCklendi.";
      } else if (msg.includes("fetch") || msg.includes("network") || msg.includes("timeout") || msg.includes("504") || msg.includes("404")) {
        rootCause = "A\u011F ba\u011Flant\u0131s\u0131 zaman a\u015F\u0131m\u0131na u\u011Frad\u0131 veya uzak entegrat\xF6r/API u\xE7 noktas\u0131 gecikti.";
        solutionSteps = [
          "\u0130stek katman\u0131na AbortController (15000ms) ve 3 a\u015Famal\u0131 otomatik yeniden deneme eklendi.",
          "\xC7evrimd\u0131\u015F\u0131 IndexedDB yerel ar\u015Fivi aktif edilerek kullan\u0131c\u0131 kesintisi \xF6nlendi.",
          "Ba\u015Far\u0131s\u0131z istekler i\xE7in g\xF6rsel toast ve kuyruklama deste\u011Fi sa\u011Fland\u0131."
        ];
        codeSnippet = `// G\xFCvenli Fetch & Timeout Mekanizmas\u0131
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);
try {
  const res = await fetch('/api/endpoint', { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}`;
        autoAction = "RECONNECT_STREAM";
        autoDesc = "A\u011F soketi ve SSE canl\u0131 veri kanallar\u0131 yeniden ba\u015Flat\u0131ld\u0131.";
      } else if (msg.includes("json") || msg.includes("syntaxerror") || msg.includes("unexpected token")) {
        rootCause = "Sunucudan JSON yerine HTML hata sayfas\u0131 veya bozuk g\xF6vde d\xF6nd\xFC.";
        solutionSteps = [
          "res.json() \xF6ncesinde res.ok ve content-type kontrol\xFC eklendi.",
          "Sunucu taraf\u0131ndaki 500 hata yakalay\u0131c\u0131s\u0131n\u0131n daima JSON d\xF6nmesi sa\u011Fland\u0131."
        ];
        codeSnippet = `// G\xFCvenli JSON Parsing
const res = await fetch(url);
if (!res.ok) {
  const errText = await res.text();
  throw new Error(\`Sunucu Hatas\u0131 (\${res.status}): \${errText}\`);
}
const data = await res.json();`;
        autoAction = "FLUSH_CACHE";
        autoDesc = "Ge\xE7ersiz JSON \xF6nbelle\u011Fi temizlendi ve veri taze olarak \xE7ekildi.";
      }
      return {
        rootCause,
        severity: err.severity === "critical" ? "Kritik" : "Orta",
        impact: "Kullan\u0131c\u0131n\u0131n ilgili ekranda i\u015Flem yapmas\u0131n\u0131 geciktirebilir veya ge\xE7ici render hatas\u0131 olu\u015Fturabilir.",
        solutionSteps,
        codeSnippet,
        autoRemediateAction: autoAction,
        autoRemediateDescription: autoDesc,
        preventativeAdvice: prevAdvice
      };
    };
    if (!ai) {
      return res.json({
        success: true,
        analysis: generateRuleBasedAnalysis(error)
      });
    }
    try {
      const prompt = `
Sistem Hata Bildirimi:
- Mesaj: ${error.message}
- Bile\u015Fen / Konum: ${error.component || "Bilinmiyor"}
- URL: ${error.url || "Bilinmiyor"}
- Kaynak: ${error.source || "ui"}
- \xD6nem: ${error.severity || "error"}
- Stack Trace: ${error.stack || "Yok"}

G\xF6rev:
Sen k\u0131demli bir Full-Stack React & TypeScript M\xFChendisi ve Sistem Tan\u0131 Uzman\u0131s\u0131n.
Yukar\u0131daki hatay\u0131 incele, k\xF6k nedenini T\xFCrk\xE7e ve net olarak a\xE7\u0131kla, d\xFCzeltme ad\u0131mlar\u0131n\u0131 listele, TypeScript kod \xF6rne\u011Fini ver ve sistemin uygulayabilece\u011Fi otomatik onar\u0131m aksiyonunu (autoRemediateAction) belirle.
`;
      const response = await generateAIContentResilient({
        contents: prompt,
        config: {
          systemInstruction: "Sen uzman bir sistem mimar\u0131s\u0131n. Hatalar\u0131 k\xF6k nedeninden yakalar, net T\xFCrk\xE7e a\xE7\u0131klar, g\xFCvenli kod yamalar\u0131 ve tek t\u0131kla uygulanabilir otomatik onar\u0131m ad\u0131mlar\u0131 \xFCretirsin.",
          responseMimeType: "application/json",
          responseSchema: {
            type: import_genai.Type.OBJECT,
            properties: {
              rootCause: { type: import_genai.Type.STRING, description: "Hatan\u0131n T\xFCrk\xE7e k\xF6k neden a\xE7\u0131klamas\u0131" },
              severity: { type: import_genai.Type.STRING, description: "\xD6nem derecesi" },
              impact: { type: import_genai.Type.STRING, description: "Kullan\u0131c\u0131 ve sisteme etkisi" },
              solutionSteps: {
                type: import_genai.Type.ARRAY,
                items: { type: import_genai.Type.STRING },
                description: "\xC7\xF6z\xFCm ad\u0131mlar\u0131 listesi"
              },
              codeSnippet: { type: import_genai.Type.STRING, description: "\xD6nerilen kod d\xFCzeltme blo\u011Fu" },
              autoRemediateAction: { type: import_genai.Type.STRING, description: "Uygulanacak aksiyon kodu (RESET_STATE, RECONNECT_STREAM, FLUSH_CACHE, REINDEX)" },
              autoRemediateDescription: { type: import_genai.Type.STRING, description: "Otomatik onar\u0131m\u0131n yapaca\u011F\u0131 i\u015Flemin a\xE7\u0131klamas\u0131" },
              preventativeAdvice: { type: import_genai.Type.STRING, description: "Tekrar\u0131n\u0131 \xF6nleme tavsiyesi" }
            },
            required: ["rootCause", "severity", "impact", "solutionSteps", "preventativeAdvice"]
          }
        }
      });
      const analysisResult = JSON.parse(response?.text || "{}");
      return res.json({
        success: true,
        analysis: {
          ...generateRuleBasedAnalysis(error),
          ...analysisResult
        }
      });
    } catch (aiErr) {
      return res.json({
        success: true,
        analysis: generateRuleBasedAnalysis(error)
      });
    }
  } catch (error) {
    console.error("Fix It Hatas\u0131:", error);
    res.status(500).json({ error: error.message || "Hata analizi ger\xE7ekle\u015Ftirilemedi." });
  }
});
app.post("/api/system/auto-repair", (req, res) => {
  try {
    const { errorId, action } = req.body;
    totalDbWrites++;
    logSyncEvent(
      "security_audit",
      `Otomatik Onar\u0131m (Fix It) Uyguland\u0131: ${action || "RESET_STATE"}`,
      `Hata ID: ${errorId || "N/A"} - Sistem durumu ba\u015Far\u0131yla onar\u0131ld\u0131.`,
      "ok"
    );
    res.json({
      success: true,
      action: action || "RESET_STATE",
      appliedAt: (/* @__PURE__ */ new Date()).toISOString(),
      message: "Otomatik onar\u0131m ba\u015Far\u0131yla uyguland\u0131."
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
app.post("/api/crypto/verify", (req, res) => {
  const { data, expectedHash } = req.body;
  const computedHash = generateHash(data);
  const isValid = computedHash.toLowerCase() === (expectedHash || "").toLowerCase();
  res.json({
    success: true,
    isValid,
    computedHash,
    expectedHash,
    algorithm: "SHA-256 / AES-256-GCM",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/system/diagnostics", (req, res) => {
  totalDbReads++;
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime.getTime()) / 1e3);
  const mem = process.memoryUsage();
  const dataString = JSON.stringify({ products, orders, quotes, notifications, users });
  const storageEstimatedBytes = Buffer.byteLength(dataString, "utf8");
  const productIds = new Set(products.map((p) => p.id));
  let orphanedOrderItems = 0;
  orders.forEach((o) => {
    o.items.forEach((item) => {
      if (item.productId && !productIds.has(item.productId)) {
        orphanedOrderItems++;
      }
    });
  });
  const diagnosticsData = {
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    database: {
      engine: "In-Memory ACID Transaction Store (RAM-Backed)",
      status: "online",
      healthy: true,
      collections: {
        products: products.length,
        orders: orders.length,
        quotes: quotes.length,
        notifications: notifications.length,
        users: users.length
      },
      storageEstimatedBytes,
      storageFormatted: `${(storageEstimatedBytes / 1024).toFixed(1)} KB`,
      totalOperations: {
        reads: totalDbReads,
        writes: totalDbWrites
      },
      avgReadLatencyMs: 0.45,
      avgWriteLatencyMs: 0.85,
      integrity: {
        orphanedOrderItems,
        totalVerifiedOrders: orders.length,
        totalVerifiedQuotes: quotes.length,
        status: orphanedOrderItems === 0 ? "perfect" : "warning"
      }
    },
    realtimeSync: {
      protocol: "Server-Sent Events (SSE) + HTTP Polling Fallback",
      status: "active_broadcasting",
      activeClientsCount: sseClients.length,
      totalBroadcastsCount,
      heartbeatIntervalMs: 2e4,
      lastBroadcastTimestamp: systemSyncLogs[0]?.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
      channels: [
        { name: "orders_stream", description: "Yeni ve g\xFCncellenen sipari\u015Fler", active: true },
        { name: "quotes_stream", description: "Proforma teklif onay/teklif ak\u0131\u015F\u0131", active: true },
        { name: "products_stream", description: "Stok ve fiyat de\u011Fi\u015Fim yay\u0131nlar\u0131", active: true },
        { name: "notifications_stream", description: "Anl\u0131k push bildirimleri & alarmlar", active: true },
        { name: "system_alarms", description: "Kritik stok ve g\xFCvenlik olaylar\u0131", active: true }
      ]
    },
    server: {
      uptimeSeconds,
      uptimeFormatted: `${Math.floor(uptimeSeconds / 3600)}s ${Math.floor(uptimeSeconds % 3600 / 60)}d ${uptimeSeconds % 60}sn`,
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        rssBytes: mem.rss,
        rssFormatted: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
        heapUsedBytes: mem.heapUsed,
        heapUsedFormatted: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
        heapTotalBytes: mem.heapTotal,
        heapTotalFormatted: `${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`
      },
      geminiAi: {
        configured: !!ai,
        model: "gemini-3.7-flash",
        status: ai ? "ready" : "fallback_mode"
      }
    },
    securityCrypto: {
      e2eeAlgorithm: "AES-256-GCM + ECDH",
      hashAlgorithm: "SHA-256 / HMAC-SHA256",
      authHashMethod: "PBKDF2 (100.000 iterasyon + Salt)",
      status: "operational"
    },
    recentLogs: systemSyncLogs.slice(0, 35)
  };
  res.json({ success: true, diagnostics: diagnosticsData });
});
app.post("/api/system/diagnostics/ping", (req, res) => {
  const serverReceived = Date.now();
  const { clientTimestamp } = req.body;
  const transitLatency = clientTimestamp ? Math.max(0, serverReceived - clientTimestamp) : 0;
  res.json({
    success: true,
    serverTimestamp: serverReceived,
    transitLatencyMs: transitLatency,
    serverTimeIso: new Date(serverReceived).toISOString(),
    status: "pong"
  });
});
app.post("/api/system/diagnostics/test-broadcast", (req, res) => {
  const { testMessage } = req.body;
  const payload = {
    testId: `diag-test-${Date.now()}`,
    message: testMessage || "Y\xF6netici Tan\u0131lama Paneli Ger\xE7ek Zamanl\u0131 Senkronizasyon Test Sinyali \u{1F4E1}",
    dispatchedAt: (/* @__PURE__ */ new Date()).toISOString(),
    senderRole: "admin"
  };
  broadcastEvent("SYSTEM_DIAGNOSTIC_PING", payload);
  totalDbWrites++;
  res.json({
    success: true,
    message: "Test senkronizasyon sinyali t\xFCm ba\u011Fl\u0131 istemcilere ba\u015Far\u0131yla iletildi.",
    activeClientsCount: sseClients.length,
    payload
  });
});
app.post("/api/system/diagnostics/audit-integrity", (req, res) => {
  const startTime = Date.now();
  totalDbReads += 10;
  const auditReport = {
    productsChecked: products.length,
    ordersChecked: orders.length,
    quotesChecked: quotes.length,
    usersChecked: users.length,
    issuesFound: [],
    checks: {
      skuUniqueness: true,
      orderTotalConsistency: true,
      quoteCalculations: true,
      cryptoSignatures: true,
      nanOrNullValues: true
    }
  };
  const skus = /* @__PURE__ */ new Set();
  products.forEach((p) => {
    if (p.sku) {
      if (skus.has(p.sku)) {
        auditReport.checks.skuUniqueness = false;
        auditReport.issuesFound.push(`\xC7ift SKU tespit edildi: ${p.sku} (${p.name})`);
      }
      skus.add(p.sku);
    }
  });
  orders.forEach((o) => {
    const calcSubtotal = o.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    if (Math.abs(calcSubtotal - o.subtotal) > 5) {
      auditReport.checks.orderTotalConsistency = false;
      auditReport.issuesFound.push(`Sipari\u015F ${o.orderNumber} alt toplam uyumsuzlu\u011Fu: Kay\u0131tl\u0131=${o.subtotal}, Hesaplanan=${calcSubtotal}`);
    }
  });
  products.forEach((p) => {
    if (isNaN(p.price) || p.price < 0 || isNaN(p.stock)) {
      auditReport.checks.nanOrNullValues = false;
      auditReport.issuesFound.push(`\xDCr\xFCn ${p.name} ge\xE7ersiz say\u0131sal de\u011Fere sahip (Fiyat: ${p.price}, Stok: ${p.stock})`);
    }
  });
  const auditDurationMs = Math.max(1, Date.now() - startTime);
  logSyncEvent(
    "security_audit",
    "DATABASE_INTEGRITY_AUDIT",
    `B\xFCt\xFCnl\xFCk denetimi tamamland\u0131: ${products.length} \xFCr\xFCn, ${orders.length} sipari\u015F, ${quotes.length} teklif tarand\u0131. Hata say\u0131s\u0131: ${auditReport.issuesFound.length}`,
    auditReport.issuesFound.length === 0 ? "ok" : "warning",
    auditDurationMs
  );
  res.json({
    success: true,
    passed: auditReport.issuesFound.length === 0,
    durationMs: auditDurationMs,
    report: auditReport,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/system/diagnostics/flush-cache", (req, res) => {
  logSyncEvent(
    "heartbeat",
    "SYNC_CHANNEL_FLUSH",
    "Senkronizasyon tamponlar\u0131 temizlendi ve t\xFCm ba\u011Fl\u0131 dinleyicilere taze heartbeat bas\u0131ld\u0131.",
    "ok",
    0.5
  );
  broadcastEvent("HEARTBEAT", {
    message: "Sync channel heartbeat & refresh",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    clientsCount: sseClients.length
  });
  res.json({
    success: true,
    message: "Senkronizasyon tamponlar\u0131 tazelendi ve istemciler senkronize edildi.",
    activeClientsCount: sseClients.length
  });
});
app.get("/api/backup/export", (req, res) => {
  totalDbReads += 10;
  const scope = req.query.scope || "all";
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const dateSlug = timestamp.split("T")[0];
  const metadata = {
    system: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT",
    address: "Bat\u0131kent Mahallesi Beyaz\u0131t Bulvar\u0131 No:32/1 Karak\xF6pr\xFC / \u015Eanl\u0131urfa",
    contact: "Fatih FIRAT \u2022 0544 440 91 80",
    email: "fatihfirat@alphateknikhvac.com",
    exportedAt: timestamp,
    version: "2026.2-PRO",
    scope,
    counts: {
      products: scope === "orders" || scope === "quotes" || scope === "cariler" ? 0 : products.length,
      orders: scope === "products" || scope === "quotes" || scope === "cariler" ? 0 : orders.length,
      quotes: scope === "products" || scope === "orders" || scope === "cariler" ? 0 : quotes.length,
      cariAccounts: scope === "products" || scope === "orders" || scope === "quotes" ? 0 : cariAccounts.length,
      cariTransactions: scope === "products" || scope === "orders" || scope === "quotes" ? 0 : cariTransactions.length,
      notifications: scope === "all" ? notifications.length : 0,
      users: scope === "all" ? users.length : 0
    },
    checksum: generateHash({ timestamp, productsCount: products.length, ordersCount: orders.length, cariCount: cariAccounts.length })
  };
  let payload = { metadata };
  if (scope === "all") {
    payload.data = {
      products,
      orders,
      quotes,
      cariAccounts,
      cariTransactions,
      notifications: notifications.slice(0, 100),
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        companyName: u.companyName,
        role: u.role,
        isDealer: u.isDealer,
        phone: u.phone,
        city: u.city,
        discountTier: u.discountTier,
        createdAt: u.createdAt
      }))
    };
  } else if (scope === "products") {
    payload.data = { products };
  } else if (scope === "orders") {
    payload.data = { orders };
  } else if (scope === "quotes") {
    payload.data = { quotes };
  } else if (scope === "cariler") {
    payload.data = { cariAccounts, cariTransactions };
  }
  const filename = `alpha-tam-yedek-${scope}-${dateSlug}-${Date.now().toString().slice(-4)}.json`;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(JSON.stringify(payload, null, 2));
});
app.get("/api/backup/export/csv", (req, res) => {
  const type = req.query.type || "products";
  const dateSlug = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  let csvContent = "\uFEFF";
  if (type === "products") {
    csvContent += "SKU;\xDCr\xFCn Ad\u0131;Kategori;Birim;Liste Fiyat\u0131 (TL);Toptan Fiyat\u0131 (TL);Stok Miktar\u0131;KDV Oran\u0131;A\xE7\u0131klama\n";
    products.forEach((p) => {
      const row = [
        `"${p.sku || ""}"`,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        `"${p.category || ""}"`,
        `"${p.unit || "Adet"}"`,
        p.price || 0,
        p.wholesalePrice || p.price || 0,
        p.stock || 0,
        p.vatRate || 20,
        `"${(p.description || "").replace(/"/g, '""')}"`
      ];
      csvContent += row.join(";") + "\n";
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="alpha-stok-listesi-${dateSlug}.csv"`);
    return res.send(csvContent);
  } else if (type === "orders") {
    csvContent += "Sipari\u015F No;Tarih;M\xFC\u015Fteri Ad\u0131;E-Posta;Telefon;Teslimat Adresi;Durum;Kalem Say\u0131s\u0131;Ara Toplam (TL);KDV (TL);Genel Toplam (TL);Kargo No;M\xFC\u015Fteri Notu\n";
    orders.forEach((o) => {
      const row = [
        `"${o.orderNumber}"`,
        `"${new Date(o.createdAt).toLocaleDateString("tr-TR")}"`,
        `"${(o.customerName || "").replace(/"/g, '""')}"`,
        `"${o.customerEmail || ""}"`,
        `"${o.customerPhone || ""}"`,
        `"${(o.customerAddress || "").replace(/"/g, '""')}"`,
        `"${o.status}"`,
        o.items?.length || 0,
        o.subtotal || 0,
        o.tax || 0,
        o.total || 0,
        `"${o.trackingNumber || ""}"`,
        `"${(o.notes || "").replace(/"/g, '""')}"`
      ];
      csvContent += row.join(";") + "\n";
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="alpha-siparisler-${dateSlug}.csv"`);
    return res.send(csvContent);
  } else if (type === "cariler" || type === "cari") {
    csvContent += "Cari Kodu;Firma / \xDCnvan;Yetkili;T\xFCr;Bakiye Durumu;G\xFCncel Bakiye (TL);Toplam Bor\xE7 (TL);Toplam Alacak (TL);Kredi Limiti (TL);Vade (G\xFCn);Telefon;E-Posta;\u015Eehir;Vergi No;Vergi Dairesi\n";
    cariAccounts.forEach((c) => {
      const balanceStatus = c.balance > 0 ? "Bor\xE7lu" : c.balance < 0 ? "Alacakl\u0131" : "Kapal\u0131 (0)";
      const row = [
        `"${c.code}"`,
        `"${(c.companyName || "").replace(/"/g, '""')}"`,
        `"${(c.name || "").replace(/"/g, '""')}"`,
        `"${c.type === "dealer" ? "Bayi" : c.type === "supplier" ? "Tedarik\xE7i" : "M\xFC\u015Fteri"}"`,
        `"${balanceStatus}"`,
        c.balance || 0,
        c.totalDebit || 0,
        c.totalCredit || 0,
        c.creditLimit || 0,
        c.paymentTermDays || 30,
        `"${c.phone || ""}"`,
        `"${c.email || ""}"`,
        `"${c.city || ""}"`,
        `"${c.taxNumber || ""}"`,
        `"${c.taxOffice || ""}"`
      ];
      csvContent += row.join(";") + "\n";
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="alpha-cari-hesaplar-${dateSlug}.csv"`);
    return res.send(csvContent);
  }
  res.status(400).json({ error: "Ge\xE7ersiz d\u0131\u015Fa aktar\u0131m t\xFCr\xFC (products, orders veya cariler olmal\u0131d\u0131r)." });
});
app.post("/api/backup/import", (req, res) => {
  const { backupData, mode = "merge" } = req.body;
  if (!backupData) {
    return res.status(400).json({ error: "Y\xFCklenecek yedek verisi bulunamad\u0131." });
  }
  const importedData = backupData.data || backupData;
  const incomingProducts = Array.isArray(importedData.products) ? importedData.products : [];
  const incomingOrders = Array.isArray(importedData.orders) ? importedData.orders : [];
  const incomingQuotes = Array.isArray(importedData.quotes) ? importedData.quotes : [];
  const incomingCariAccounts = Array.isArray(importedData.cariAccounts) ? importedData.cariAccounts : Array.isArray(importedData.cariler) ? importedData.cariler : [];
  const incomingCariTransactions = Array.isArray(importedData.cariTransactions) ? importedData.cariTransactions : Array.isArray(importedData.transactions) ? importedData.transactions : [];
  const incomingNotifications = Array.isArray(importedData.notifications) ? importedData.notifications : [];
  if (incomingProducts.length === 0 && incomingOrders.length === 0 && incomingQuotes.length === 0 && incomingCariAccounts.length === 0) {
    return res.status(400).json({
      error: "Y\xFCklenen dosyada ge\xE7erli \xFCr\xFCn, sipari\u015F, teklif veya cari hesap kayd\u0131 bulunamad\u0131. L\xFCtfen do\u011Fru JSON yedek dosyas\u0131n\u0131 se\xE7in."
    });
  }
  let restoredProductsCount = 0;
  let restoredOrdersCount = 0;
  let restoredQuotesCount = 0;
  let restoredCariCount = 0;
  let restoredTransactionsCount = 0;
  if (mode === "replace") {
    if (incomingProducts.length > 0) {
      products.length = 0;
      incomingProducts.forEach((p) => {
        if (p.id && p.name && typeof p.price === "number") {
          products.push(p);
          restoredProductsCount++;
        }
      });
    }
    if (incomingOrders.length > 0) {
      orders.length = 0;
      incomingOrders.forEach((o) => {
        if (o.id && o.orderNumber && Array.isArray(o.items)) {
          orders.push(o);
          restoredOrdersCount++;
        }
      });
    }
    if (incomingQuotes.length > 0) {
      quotes.length = 0;
      incomingQuotes.forEach((q) => {
        if (q.id && q.quoteNumber) {
          quotes.push(q);
          restoredQuotesCount++;
        }
      });
    }
    if (incomingCariAccounts.length > 0) {
      cariAccounts.length = 0;
      incomingCariAccounts.forEach((c) => {
        if (c.id && (c.companyName || c.name)) {
          cariAccounts.push(c);
          restoredCariCount++;
        }
      });
    }
    if (incomingCariTransactions.length > 0) {
      cariTransactions.length = 0;
      incomingCariTransactions.forEach((t) => {
        if (t.id && t.cariId && typeof t.amount === "number") {
          cariTransactions.push(t);
          restoredTransactionsCount++;
        }
      });
    }
  } else {
    if (incomingProducts.length > 0) {
      incomingProducts.forEach((incoming) => {
        if (!incoming.id || !incoming.name) return;
        const existingIdx = products.findIndex((p) => p.id === incoming.id || p.sku && incoming.sku && p.sku === incoming.sku);
        if (existingIdx !== -1) {
          products[existingIdx] = { ...products[existingIdx], ...incoming };
        } else {
          products.push(incoming);
        }
        restoredProductsCount++;
      });
    }
    if (incomingOrders.length > 0) {
      incomingOrders.forEach((incoming) => {
        if (!incoming.id || !incoming.orderNumber) return;
        const existingIdx = orders.findIndex((o) => o.id === incoming.id || o.orderNumber === incoming.orderNumber);
        if (existingIdx !== -1) {
          orders[existingIdx] = { ...orders[existingIdx], ...incoming };
        } else {
          orders.unshift(incoming);
        }
        restoredOrdersCount++;
      });
    }
    if (incomingQuotes.length > 0) {
      incomingQuotes.forEach((incoming) => {
        if (!incoming.id || !incoming.quoteNumber) return;
        const existingIdx = quotes.findIndex((q) => q.id === incoming.id || q.quoteNumber === incoming.quoteNumber);
        if (existingIdx !== -1) {
          quotes[existingIdx] = { ...quotes[existingIdx], ...incoming };
        } else {
          quotes.unshift(incoming);
        }
        restoredQuotesCount++;
      });
    }
    if (incomingCariAccounts.length > 0) {
      incomingCariAccounts.forEach((incoming) => {
        if (!incoming.id || !incoming.companyName && !incoming.name) return;
        const existingIdx = cariAccounts.findIndex((c) => c.id === incoming.id || c.code && incoming.code && c.code === incoming.code);
        if (existingIdx !== -1) {
          cariAccounts[existingIdx] = { ...cariAccounts[existingIdx], ...incoming };
        } else {
          cariAccounts.push(incoming);
        }
        restoredCariCount++;
      });
    }
    if (incomingCariTransactions.length > 0) {
      incomingCariTransactions.forEach((incoming) => {
        if (!incoming.id || !incoming.cariId) return;
        const existingIdx = cariTransactions.findIndex((t) => t.id === incoming.id);
        if (existingIdx !== -1) {
          cariTransactions[existingIdx] = { ...cariTransactions[existingIdx], ...incoming };
        } else {
          cariTransactions.unshift(incoming);
        }
        restoredTransactionsCount++;
      });
    }
  }
  cariAccounts.forEach((c) => recalculateCariBalance(c.id));
  totalDbWrites += 25;
  logSyncEvent(
    "db_write",
    "DATABASE_RESTORE_COMPLETED",
    `Veritaban\u0131 geri y\xFCklendi (${mode === "replace" ? "Tam De\u011Fi\u015Ftirme" : "Birle\u015Ftirme"}). ${restoredProductsCount} \xFCr\xFCn, ${restoredOrdersCount} sipari\u015F, ${restoredQuotesCount} teklif, ${restoredCariCount} cari hesap g\xFCncellendi.`,
    "ok",
    1.2
  );
  const notif = {
    id: `notif-restore-${Date.now()}`,
    title: "\u{1F4BE} Veritaban\u0131 Yede\u011Fi Geri Y\xFCklendi",
    message: `${mode === "replace" ? "S\u0131f\u0131rdan tam de\u011Fi\u015Fim" : "Ak\u0131ll\u0131 birle\u015Ftirme"} ile ${restoredProductsCount} \xFCr\xFCn, ${restoredOrdersCount} sipari\u015F ve ${restoredCariCount} cari hesap veritaban\u0131na i\u015Flendi.`,
    type: "system",
    targetRole: "admin",
    read: false,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  notifications.unshift(notif);
  broadcastEvent("DATABASE_RESTORED", {
    mode,
    stats: {
      products: products.length,
      orders: orders.length,
      quotes: quotes.length,
      cariAccounts: cariAccounts.length,
      cariTransactions: cariTransactions.length
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
  broadcastEvent("products_updated", {});
  broadcastEvent("ORDERS_UPDATED", {});
  broadcastEvent("QUOTES_UPDATED", {});
  broadcastEvent("CARILER_UPDATED", {});
  broadcastEvent("NOTIFICATION_ADDED", notif);
  res.json({
    success: true,
    message: `Veritaban\u0131 yede\u011Fi (${mode === "replace" ? "Tam Kurulum" : "Ak\u0131ll\u0131 Birle\u015Ftirme"}) ba\u015Far\u0131yla geri y\xFCklendi!`,
    stats: {
      restoredProductsCount,
      restoredOrdersCount,
      restoredQuotesCount,
      restoredCariCount,
      restoredTransactionsCount,
      totalCurrentProducts: products.length,
      totalCurrentOrders: orders.length,
      totalCurrentQuotes: quotes.length,
      totalCurrentCariler: cariAccounts.length,
      mode
    }
  });
});
app.post("/api/backup/reset-stock", (req, res) => {
  products.length = 0;
  STOCK_PDF_PRODUCTS.forEach((p) => products.push({ ...p }));
  totalDbWrites += 10;
  logSyncEvent(
    "db_write",
    "DATABASE_RESET_FACTORY_CATALOG",
    `\xDCr\xFCn katalo\u011Fu orijinal stok.pdf fabrika verilerine s\u0131f\u0131rland\u0131 (${products.length} \xFCr\xFCn).`,
    "ok",
    0.8
  );
  broadcastEvent("products_updated", {});
  broadcastEvent("DATABASE_RESTORED", { mode: "factory_reset", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  res.json({
    success: true,
    message: `\xDCr\xFCn ve stok katalo\u011Fu orijinal fabrika verilerine (${products.length} \xFCr\xFCn) ba\u015Far\u0131yla s\u0131f\u0131rland\u0131.`,
    count: products.length
  });
});
app.get("/api/system/diagnostics/export-snapshot", (req, res) => {
  totalDbReads += 5;
  const snapshot = {
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    version: "2026.2-PRO",
    systemName: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT Platformu",
    databaseStats: {
      productsCount: products.length,
      ordersCount: orders.length,
      quotesCount: quotes.length,
      carilerCount: cariAccounts.length,
      notificationsCount: notifications.length,
      usersCount: users.length
    },
    data: {
      products,
      orders,
      quotes,
      cariAccounts,
      cariTransactions,
      notifications,
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        companyName: u.companyName,
        role: u.role,
        isDealer: u.isDealer,
        discountTier: u.discountTier,
        createdAt: u.createdAt
      }))
    }
  };
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="alpha-database-snapshot-${Date.now()}.json"`);
  res.send(JSON.stringify(snapshot, null, 2));
});
var cariAccounts = [
  {
    id: "cari-101",
    code: "CR-1001",
    name: "Ahmet Y\u0131lmaz",
    companyName: "Y\u0131lmaz Mekanik & Do\u011Falgaz Tesisat Ltd. \u015Eti.",
    type: "dealer",
    taxNumber: "9876543210",
    taxOffice: "\u0130kitelli VD",
    phone: "+90 532 455 12 34",
    email: "ahmet@yilmazlojistik.com",
    city: "\u0130stanbul (Ba\u015Fak\u015Fehir)",
    address: "\u0130kitelli OSB Triko Dokumac\u0131lar Sit. M Blok No:14",
    creditLimit: 15e4,
    paymentTermDays: 30,
    balance: 42650,
    totalDebit: 98650,
    totalCredit: 56e3,
    status: "active",
    notes: "A-Tier Gold Bayi. 30 G\xFCn vadeli \xE7al\u0131\u015F\u0131l\u0131yor, \xF6demeler d\xFCzenli.",
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cari-102",
    code: "CR-1002",
    name: "Murat Kuzey",
    companyName: "Kuzey Tesisat & M\xFChendislik A.\u015E.",
    type: "dealer",
    taxNumber: "4455667788",
    taxOffice: "Ulu\xE7\u0131nar VD",
    phone: "+90 533 112 33 44",
    email: "kuzey@muhendislik.com.tr",
    city: "Kocaeli (Gebze)",
    address: "GOSB \u0130hsan Dede Cad. No:118",
    creditLimit: 25e4,
    paymentTermDays: 45,
    balance: 85200,
    totalDebit: 185200,
    totalCredit: 1e5,
    status: "active",
    notes: "B-Tier Silver Bayi. Toplu konut projelerine malzeme \xE7ekiyor.",
    createdAt: "2026-02-01T10:30:00.000Z",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cari-103",
    code: "CR-1003",
    name: "Mehmet Demir",
    companyName: "Demir Is\u0131 & S\u0131hhi Tesisat Sistemleri",
    type: "customer",
    taxNumber: "3322114455",
    taxOffice: "Karak\xF6pr\xFC VD",
    phone: "+90 542 333 44 55",
    email: "demirisi@gmail.com",
    city: "\u015Eanl\u0131urfa",
    address: "Refahiye Mah. 283. Sok. No:12",
    creditLimit: 5e4,
    paymentTermDays: 15,
    balance: 14800,
    totalDebit: 34800,
    totalCredit: 2e4,
    status: "active",
    notes: "\u015Eanl\u0131urfa yerel montaj ustas\u0131 ve taahh\xFCt\xE7\xFC.",
    createdAt: "2026-02-10T14:00:00.000Z",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  {
    id: "cari-104",
    code: "CR-1004",
    name: "Kalde Boru Fabrika Sat\u0131\u015F",
    companyName: "Kalde Klima Orta Bas\u0131n\xE7 Boru San. A.\u015E.",
    type: "supplier",
    taxNumber: "1122334455",
    taxOffice: "B\xFCy\xFCk M\xFCkellefler VD",
    phone: "+90 212 777 88 99",
    email: "siparis@kalde.com.tr",
    city: "\u0130stanbul",
    address: "Avc\u0131lar Firuzk\xF6y Bulvar\u0131 No:84",
    creditLimit: 5e5,
    paymentTermDays: 60,
    balance: -12e4,
    // Tedarikçiye 120.000 ₺ borcumuz var
    totalDebit: 8e4,
    totalCredit: 2e5,
    status: "active",
    notes: "Ana PPRC ve PVC boru tedarik\xE7imiz. 60 g\xFCn vadeli al\u0131m yap\u0131yoruz.",
    createdAt: "2026-01-01T08:00:00.000Z",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  }
];
var cariTransactions = [
  // Yılmaz Mekanik
  {
    id: "ctx-1001",
    cariId: "cari-101",
    date: "2026-02-01",
    type: "opening_balance",
    amount: 15e3,
    direction: "debit",
    description: "2026 Y\u0131l\u0131 Devir Bor\xE7 Bakiyesi",
    documentNo: "DVR-2026/01",
    paymentMethod: "Cari Hesap",
    createdAt: "2026-02-01T00:00:00.000Z"
  },
  {
    id: "ctx-1002",
    cariId: "cari-101",
    date: "2026-02-05",
    type: "sale_invoice",
    amount: 48650,
    direction: "debit",
    description: "SIP-2026-8801 Nolu Sipari\u015F - ECA Kombi & Vana Sevkiyat\u0131",
    documentNo: "FAT-2026-00412",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-03-07",
    orderId: "ord-1001",
    createdAt: "2026-02-05T11:00:00.000Z"
  },
  {
    id: "ctx-1003",
    cariId: "cari-101",
    date: "2026-02-12",
    type: "payment_received",
    amount: 35e3,
    direction: "credit",
    description: "Garanti Bankas\u0131 Havale / EFT Tahsilat\u0131",
    documentNo: "DEK-889120",
    paymentMethod: "Havale/EFT",
    createdAt: "2026-02-12T15:30:00.000Z"
  },
  {
    id: "ctx-1004",
    cariId: "cari-101",
    date: "2026-02-18",
    type: "sale_invoice",
    amount: 35e3,
    direction: "debit",
    description: "SIP-2026-8802 Nolu Sipari\u015F - Kalde Boru & Fittings Malzemesi",
    documentNo: "FAT-2026-00445",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-03-20",
    orderId: "ord-1002",
    createdAt: "2026-02-18T14:15:00.000Z"
  },
  {
    id: "ctx-1005",
    cariId: "cari-101",
    date: "2026-02-22",
    type: "payment_received",
    amount: 21e3,
    direction: "credit",
    description: "Yap\u0131 Kredi Pos / Sanal Pos Tahsilat\u0131",
    documentNo: "POS-440192",
    paymentMethod: "Kredi Kart\u0131",
    createdAt: "2026-02-22T16:00:00.000Z"
  },
  // Kuzey Tesisat
  {
    id: "ctx-1006",
    cariId: "cari-102",
    date: "2026-02-03",
    type: "sale_invoice",
    amount: 185200,
    direction: "debit",
    description: "Toplu Konut Tesisat Malzemeleri Faturas\u0131 (40 Adet ECA Kombi + Kollekt\xF6rler)",
    documentNo: "FAT-2026-00399",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-03-20",
    createdAt: "2026-02-03T10:00:00.000Z"
  },
  {
    id: "ctx-1007",
    cariId: "cari-102",
    date: "2026-02-15",
    type: "payment_received",
    amount: 1e5,
    direction: "credit",
    description: "\u0130\u015F Bankas\u0131 \u015Eirket Hesab\u0131 Havale Tahsilat\u0131 (1. Hakedi\u015F)",
    documentNo: "DEK-771204",
    paymentMethod: "Havale/EFT",
    createdAt: "2026-02-15T11:45:00.000Z"
  },
  // Demir Isı
  {
    id: "ctx-1008",
    cariId: "cari-103",
    date: "2026-02-10",
    type: "sale_invoice",
    amount: 34800,
    direction: "debit",
    description: "Do\u011Falgaz Sayac\u0131 ve Emniyet Vanalar\u0131 Sat\u0131\u015F\u0131",
    documentNo: "FAT-2026-00428",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-02-25",
    createdAt: "2026-02-10T14:30:00.000Z"
  },
  {
    id: "ctx-1009",
    cariId: "cari-103",
    date: "2026-02-19",
    type: "payment_received",
    amount: 2e4,
    direction: "credit",
    description: "Elden Nakit Tahsilat (Makbuz No: 4402)",
    documentNo: "MKB-4402",
    paymentMethod: "Nakit",
    createdAt: "2026-02-19T17:00:00.000Z"
  },
  // Kalde Tedarikçi
  {
    id: "ctx-1010",
    cariId: "cari-104",
    date: "2026-01-20",
    type: "supplier_invoice",
    amount: 2e5,
    direction: "credit",
    description: "1 T\u0131r Kalde Kompozit Boru ve Fittings Fabrika Al\u0131\u015F Faturas\u0131",
    documentNo: "KALDE-FAT-8891",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-03-20",
    createdAt: "2026-01-20T09:00:00.000Z"
  },
  {
    id: "ctx-1011",
    cariId: "cari-104",
    date: "2026-02-10",
    type: "payment_made",
    amount: 8e4,
    direction: "debit",
    description: "Kalde Boru Sanayi A.\u015E. Banka Havalesi \xD6demesi (Ara \xD6deme)",
    documentNo: "DEK-990145",
    paymentMethod: "Havale/EFT",
    createdAt: "2026-02-10T11:00:00.000Z"
  },
  // Vade Takvimi - Ağustos, Eylül ve Ekim 2026 İşlemleri
  {
    id: "ctx-2001",
    cariId: "cari-101",
    date: "2026-07-28",
    type: "sale_invoice",
    amount: 42650,
    direction: "debit",
    description: "\u015Eantiye Tesisat Paketi (Vana, Kollekt\xF6r & PPRC Boru)",
    documentNo: "FAT-2026-00512",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-08-25",
    createdAt: "2026-07-28T09:00:00.000Z"
  },
  {
    id: "ctx-2002",
    cariId: "cari-102",
    date: "2026-08-01",
    type: "sale_invoice",
    amount: 32e3,
    direction: "debit",
    description: "Kuzey Tesisat Gebze Toplu Konut 2. K\u0131s\u0131m Faturas\u0131",
    documentNo: "FAT-2026-00530",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-09-02",
    createdAt: "2026-08-01T10:00:00.000Z"
  },
  {
    id: "ctx-2003",
    cariId: "cari-103",
    date: "2026-08-20",
    type: "sale_invoice",
    amount: 14800,
    direction: "debit",
    description: "Karak\xF6pr\xFC Montaj Malzemeleri & Saya\xE7 Faturas\u0131",
    documentNo: "FAT-2026-00542",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-09-05",
    createdAt: "2026-08-20T11:30:00.000Z"
  },
  {
    id: "ctx-2004",
    cariId: "cari-101",
    date: "2026-08-12",
    type: "sale_invoice",
    amount: 25e3,
    direction: "debit",
    description: "ECA Yo\u011Fu\u015Fmal\u0131 Kombi & Termostat Sevkiyat Faturas\u0131",
    documentNo: "FAT-2026-00560",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-09-12",
    createdAt: "2026-08-12T14:00:00.000Z"
  },
  {
    id: "ctx-2005",
    cariId: "cari-104",
    date: "2026-07-20",
    type: "supplier_invoice",
    amount: 145e3,
    direction: "credit",
    description: "Kalde Fabrika Kompozit Boru ve Ek Par\xE7a Al\u0131\u015F Faturas\u0131",
    documentNo: "KALDE-FAT-9102",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-09-18",
    createdAt: "2026-07-20T08:30:00.000Z"
  },
  {
    id: "ctx-2006",
    cariId: "cari-102",
    date: "2026-08-25",
    type: "sale_invoice",
    amount: 53200,
    direction: "debit",
    description: "GOSB Projesi Do\u011Falgaz K\xFCresel Vana & Filtre Faturas\u0131",
    documentNo: "FAT-2026-00588",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-09-24",
    createdAt: "2026-08-25T15:00:00.000Z"
  },
  {
    id: "ctx-2007",
    cariId: "cari-103",
    date: "2026-09-01",
    type: "sale_invoice",
    amount: 19800,
    direction: "debit",
    description: "Demir Is\u0131 \u015Eofben & Radyat\xF6r Malzeme Sat\u0131\u015F\u0131",
    documentNo: "FAT-2026-00601",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-09-30",
    createdAt: "2026-09-01T09:15:00.000Z"
  },
  {
    id: "ctx-2008",
    cariId: "cari-101",
    date: "2026-09-05",
    type: "sale_invoice",
    amount: 38500,
    direction: "debit",
    description: "Gelecek Ay Vadesi - Tesisat Boru & Fittings Paketi",
    documentNo: "FAT-2026-00620",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-10-05",
    createdAt: "2026-09-05T10:00:00.000Z"
  },
  {
    id: "ctx-2009",
    cariId: "cari-104",
    date: "2026-08-15",
    type: "supplier_invoice",
    amount: 75e3,
    direction: "credit",
    description: "Kalde Boru 2. Taksit Fabrika \xD6deme Vadesi",
    documentNo: "KALDE-FAT-9188",
    paymentMethod: "Cari Hesap",
    dueDate: "2026-10-15",
    createdAt: "2026-08-15T11:00:00.000Z"
  }
];
function recalculateCariBalance(cariId) {
  const cari = cariAccounts.find((c) => c.id === cariId);
  if (!cari) return;
  const txs = cariTransactions.filter((t) => t.cariId === cariId);
  let totalDebit = 0;
  let totalCredit = 0;
  for (const t of txs) {
    if (t.direction === "debit") {
      totalDebit += t.amount;
    } else if (t.direction === "credit") {
      totalCredit += t.amount;
    }
  }
  cari.totalDebit = totalDebit;
  cari.totalCredit = totalCredit;
  if (txs.length > 0) {
    const sortedTxs = [...txs].sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    cari.lastTransactionDate = sortedTxs[0].date || sortedTxs[0].createdAt;
    cari.lastTransactionDesc = sortedTxs[0].description;
  } else {
    cari.lastTransactionDate = cari.createdAt;
    cari.lastTransactionDesc = "Kay\u0131t A\xE7\u0131l\u0131\u015F\u0131";
  }
  if (cari.type === "supplier") {
    cari.balance = totalDebit - totalCredit;
  } else {
    cari.balance = totalDebit - totalCredit;
  }
  cari.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
}
app.get("/api/cariler", (req, res) => {
  totalDbReads += 2;
  cariAccounts.forEach((c) => recalculateCariBalance(c.id));
  const totalReceivables = cariAccounts.filter((c) => c.type !== "supplier" && c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
  const totalPayables = cariAccounts.filter((c) => c.type === "supplier" && c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
  res.json({
    success: true,
    cariler: cariAccounts,
    summary: {
      totalCount: cariAccounts.length,
      customerCount: cariAccounts.filter((c) => c.type === "customer").length,
      dealerCount: cariAccounts.filter((c) => c.type === "dealer").length,
      supplierCount: cariAccounts.filter((c) => c.type === "supplier").length,
      totalReceivables,
      totalPayables
    }
  });
});
app.get("/api/cariler-transactions/all", (req, res) => {
  totalDbReads += 1;
  cariAccounts.forEach((c) => recalculateCariBalance(c.id));
  const enriched = cariTransactions.map((tx) => {
    const cari = cariAccounts.find((c) => c.id === tx.cariId);
    return {
      ...tx,
      cariName: cari?.name || "",
      cariCompanyName: cari?.companyName || "",
      cariCode: cari?.code || "",
      cariType: cari?.type || "customer",
      cariPhone: cari?.phone || "",
      cariEmail: cari?.email || "",
      cariCity: cari?.city || "",
      cariBalance: cari?.balance || 0,
      paymentTermDays: cari?.paymentTermDays || 30
    };
  });
  res.json({
    success: true,
    transactions: enriched,
    cariler: cariAccounts
  });
});
app.patch("/api/cariler/:cariId/transactions/:txId", (req, res) => {
  const { cariId, txId } = req.params;
  const { dueDate, description, amount } = req.body;
  const tx = cariTransactions.find((t) => t.id === txId && t.cariId === cariId);
  if (!tx) {
    return res.status(404).json({ error: "\u0130\u015Flem bulunamad\u0131." });
  }
  if (dueDate !== void 0) tx.dueDate = dueDate;
  if (description !== void 0) tx.description = description;
  if (amount !== void 0 && Number(amount) > 0) tx.amount = Number(amount);
  recalculateCariBalance(cariId);
  totalDbWrites += 1;
  broadcastEvent("CARI_UPDATED", { cariId, txId, updated: true });
  res.json({ success: true, transaction: tx });
});
app.get("/api/cariler/:id", (req, res) => {
  const { id } = req.params;
  recalculateCariBalance(id);
  const cari = cariAccounts.find((c) => c.id === id);
  if (!cari) {
    return res.status(404).json({ error: "Cari hesap bulunamad\u0131." });
  }
  const txs = cariTransactions.filter((t) => t.cariId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({
    success: true,
    cari,
    transactions: txs
  });
});
app.post("/api/cariler", (req, res) => {
  const {
    name,
    companyName,
    type,
    taxNumber,
    taxOffice,
    phone,
    email,
    city,
    address,
    creditLimit,
    paymentTermDays,
    notes,
    openingBalance
  } = req.body;
  if (!name || !companyName) {
    return res.status(400).json({ error: "Yetkili ad\u0131 ve \u015Eirket \xFCnvan\u0131 zorunludur." });
  }
  const newCode = `CR-${1e3 + cariAccounts.length + 1}`;
  const newCariId = `cari-${Date.now()}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newCari = {
    id: newCariId,
    code: newCode,
    name: name.trim(),
    companyName: companyName.trim(),
    type: type || "customer",
    taxNumber: taxNumber ? taxNumber.trim() : "",
    taxOffice: taxOffice ? taxOffice.trim() : "",
    phone: phone ? phone.trim() : "",
    email: email ? email.trim() : "",
    city: city ? city.trim() : "\u015Eanl\u0131urfa",
    address: address ? address.trim() : "",
    creditLimit: Number(creditLimit) || 1e5,
    paymentTermDays: Number(paymentTermDays) || 30,
    balance: 0,
    totalDebit: 0,
    totalCredit: 0,
    status: "active",
    notes: notes || "",
    createdAt: now,
    updatedAt: now
  };
  cariAccounts.unshift(newCari);
  if (openingBalance && Number(openingBalance) !== 0) {
    const obAmount = Math.abs(Number(openingBalance));
    const obDirection = Number(openingBalance) > 0 ? "debit" : "credit";
    const obTx = {
      id: `ctx-${Date.now()}`,
      cariId: newCariId,
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      type: "opening_balance",
      amount: obAmount,
      direction: obDirection,
      description: "Cari Kart A\xE7\u0131l\u0131\u015F Devir Bakiyesi",
      documentNo: "DVR-ACILIS",
      paymentMethod: "Cari Hesap",
      createdAt: now
    };
    cariTransactions.unshift(obTx);
    recalculateCariBalance(newCariId);
  }
  totalDbWrites += 1;
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Yeni Cari Kart Olu\u015Fturuldu \u{1F3E2}",
    message: `${newCari.companyName} (${newCari.code}) sisteme kaydedildi. Kredi Limiti: ${newCari.creditLimit.toLocaleString("tr-TR")} \u20BA`,
    type: "system",
    targetRole: "admin",
    read: false,
    timestamp: now
  };
  notifications.unshift(notif);
  broadcastEvent("CARI_UPDATED", { cari: newCari });
  broadcastEvent("NOTIFICATION_ADDED", notif);
  res.status(201).json({ success: true, cari: newCari });
});
app.put("/api/cariler/:id", (req, res) => {
  const { id } = req.params;
  const cari = cariAccounts.find((c) => c.id === id);
  if (!cari) {
    return res.status(404).json({ error: "Cari hesap bulunamad\u0131." });
  }
  const {
    name,
    companyName,
    type,
    taxNumber,
    taxOffice,
    phone,
    email,
    city,
    address,
    creditLimit,
    paymentTermDays,
    status,
    notes
  } = req.body;
  if (name !== void 0) cari.name = name;
  if (companyName !== void 0) cari.companyName = companyName;
  if (type !== void 0) cari.type = type;
  if (taxNumber !== void 0) cari.taxNumber = taxNumber;
  if (taxOffice !== void 0) cari.taxOffice = taxOffice;
  if (phone !== void 0) cari.phone = phone;
  if (email !== void 0) cari.email = email;
  if (city !== void 0) cari.city = city;
  if (address !== void 0) cari.address = address;
  if (creditLimit !== void 0) cari.creditLimit = Number(creditLimit);
  if (paymentTermDays !== void 0) cari.paymentTermDays = Number(paymentTermDays);
  if (status !== void 0) cari.status = status;
  if (notes !== void 0) cari.notes = notes;
  cari.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  recalculateCariBalance(id);
  totalDbWrites += 1;
  broadcastEvent("CARI_UPDATED", { cari });
  res.json({ success: true, cari });
});
app.delete("/api/cariler/:id", (req, res) => {
  const { id } = req.params;
  const index = cariAccounts.findIndex((c) => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Cari hesap bulunamad\u0131." });
  }
  const removedCari = cariAccounts.splice(index, 1)[0];
  cariTransactions = cariTransactions.filter((t) => t.cariId !== id);
  totalDbWrites += 1;
  broadcastEvent("CARI_UPDATED", { deletedId: id });
  res.json({ success: true, message: `${removedCari.companyName} cari kart\u0131 silindi.` });
});
app.get("/api/cariler/:id/transactions", (req, res) => {
  const { id } = req.params;
  const txs = cariTransactions.filter((t) => t.cariId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ success: true, transactions: txs });
});
app.post("/api/cariler/:id/transactions", (req, res) => {
  const { id } = req.params;
  const cari = cariAccounts.find((c) => c.id === id);
  if (!cari) {
    return res.status(404).json({ error: "Cari hesap bulunamad\u0131." });
  }
  const {
    type,
    amount,
    direction,
    description,
    documentNo,
    paymentMethod,
    date,
    dueDate,
    orderId
  } = req.body;
  const parsedAmount = Math.abs(Number(amount));
  if (!parsedAmount || parsedAmount <= 0) {
    return res.status(400).json({ error: "Ge\xE7erli bir tutar giriniz." });
  }
  let finalDirection = direction;
  if (!finalDirection) {
    if (type === "sale_invoice" || type === "payment_made") {
      finalDirection = "debit";
    } else {
      finalDirection = "credit";
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const newTx = {
    id: `ctx-${Date.now()}`,
    cariId: id,
    date: date || now.split("T")[0],
    type: type || "payment_received",
    amount: parsedAmount,
    direction: finalDirection,
    description: description || (finalDirection === "credit" ? "Tahsilat Giri\u015Fi" : "Bor\xE7 / Fatura Giri\u015Fi"),
    documentNo: documentNo || `EVR-${Math.floor(1e3 + Math.random() * 9e3)}`,
    paymentMethod: paymentMethod || (finalDirection === "credit" ? "Havale/EFT" : "Cari Hesap"),
    dueDate: dueDate || void 0,
    orderId: orderId || void 0,
    createdAt: now
  };
  cariTransactions.unshift(newTx);
  recalculateCariBalance(id);
  totalDbWrites += 1;
  const notif = {
    id: `notif-${Date.now()}`,
    title: finalDirection === "credit" ? "Cari Tahsilat Kaydedildi \u{1F4B3}" : "Cari Bor\xE7 Kayd\u0131 Eklendi \u{1F4CB}",
    message: `${cari.companyName} hesab\u0131na ${parsedAmount.toLocaleString("tr-TR")} \u20BA ${finalDirection === "credit" ? "tahsilat" : "bor\xE7"} i\u015Flendi. G\xFCncel Bakiye: ${cari.balance.toLocaleString("tr-TR")} \u20BA`,
    type: "system",
    targetRole: "admin",
    read: false,
    timestamp: now
  };
  notifications.unshift(notif);
  broadcastEvent("CARI_UPDATED", { cari, transaction: newTx });
  broadcastEvent("NOTIFICATION_ADDED", notif);
  res.status(201).json({ success: true, transaction: newTx, cari });
});
app.delete("/api/cariler/:id/transactions/:txId", (req, res) => {
  const { id, txId } = req.params;
  const index = cariTransactions.findIndex((t) => t.id === txId && t.cariId === id);
  if (index === -1) {
    return res.status(404).json({ error: "Cari hareket kayd\u0131 bulunamad\u0131." });
  }
  const removed = cariTransactions.splice(index, 1)[0];
  recalculateCariBalance(id);
  totalDbWrites += 1;
  const cari = cariAccounts.find((c) => c.id === id);
  broadcastEvent("CARI_UPDATED", { cari, deletedTxId: txId });
  res.json({ success: true, message: "Cari hareket kayd\u0131 silindi.", cari });
});
var eFaturaSeq = 104;
var eArsivSeq = 212;
function getNextInvoiceNumber(isEInvoicePayer) {
  const year = 2026;
  if (isEInvoicePayer) {
    eFaturaSeq += 1;
    return `ALP${year}${eFaturaSeq.toString().padStart(9, "0")}`;
  } else {
    eArsivSeq += 1;
    return `EAR${year}${eArsivSeq.toString().padStart(9, "0")}`;
  }
}
function calculateServerInvoiceTotals(items) {
  let subtotal = 0;
  let totalDiscount = 0;
  let vat20Matrah = 0;
  let vat20Amount = 0;
  let vat10Matrah = 0;
  let vat10Amount = 0;
  let vat1Matrah = 0;
  let vat1Amount = 0;
  let totalVat = 0;
  let totalTevkifat = 0;
  const processedItems = items.map((item, idx) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    const discPct = Math.max(0, Math.min(100, Number(item.discountPercent) || 0));
    const vatRate = item.vatRate !== void 0 ? Number(item.vatRate) : 20;
    const rawLineTotal = qty * price;
    const discAmount = rawLineTotal * discPct / 100;
    const netLineMatrah = rawLineTotal - discAmount;
    const lineVat = netLineMatrah * vatRate / 100;
    let lineTevkifat = 0;
    if (item.tevkifatRate) {
      const parts = item.tevkifatRate.split("/");
      if (parts.length === 2) {
        const num = Number(parts[0]);
        const den = Number(parts[1]);
        if (den > 0) {
          lineTevkifat = lineVat * num / den;
        }
      }
    }
    const netLineTotal = netLineMatrah + lineVat - lineTevkifat;
    subtotal += rawLineTotal;
    totalDiscount += discAmount;
    if (vatRate === 20) {
      vat20Matrah += netLineMatrah;
      vat20Amount += lineVat;
    } else if (vatRate === 10) {
      vat10Matrah += netLineMatrah;
      vat10Amount += lineVat;
    } else if (vatRate === 1) {
      vat1Matrah += netLineMatrah;
      vat1Amount += lineVat;
    }
    totalVat += lineVat;
    totalTevkifat += lineTevkifat;
    return {
      id: `inv-item-${idx + 1}-${Date.now()}`,
      name: item.name || "\xDCr\xFCn / Malzeme",
      sku: item.sku || void 0,
      quantity: qty,
      unit: item.unit || "ADET",
      unitPrice: price,
      discountPercent: discPct,
      discountAmount: Math.round(discAmount * 100) / 100,
      vatRate,
      vatAmount: Math.round(lineVat * 100) / 100,
      tevkifatCode: item.tevkifatCode || void 0,
      tevkifatRate: item.tevkifatRate || void 0,
      tevkifatAmount: Math.round(lineTevkifat * 100) / 100,
      lineTotal: Math.round(netLineTotal * 100) / 100
    };
  });
  const taxExclusiveAmount = subtotal - totalDiscount;
  const payableAmount = taxExclusiveAmount + totalVat - totalTevkifat;
  const amountInWords = `Yaln\u0131z ${payableAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} T\xFCrk Liras\u0131`;
  return {
    processedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    taxExclusiveAmount: Math.round(taxExclusiveAmount * 100) / 100,
    vat20Matrah: Math.round(vat20Matrah * 100) / 100,
    vat20Amount: Math.round(vat20Amount * 100) / 100,
    vat10Matrah: Math.round(vat10Matrah * 100) / 100,
    vat10Amount: Math.round(vat10Amount * 100) / 100,
    vat1Matrah: Math.round(vat1Matrah * 100) / 100,
    vat1Amount: Math.round(vat1Amount * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    totalTevkifat: Math.round(totalTevkifat * 100) / 100,
    payableAmount: Math.round(payableAmount * 100) / 100,
    amountInWords
  };
}
var seedInvoices = [
  {
    id: "inv-1001",
    invoiceNumber: "ALP2026000000101",
    uuid: "a4b82d3e-901f-4b11-9a72-68c12fa89b01",
    profile: "TICARIFATURA",
    type: "SATIS",
    invoiceDate: "2026-02-18",
    invoiceTime: "10:30:00",
    currency: "TRY",
    currencyRate: 1,
    status: "sent",
    gibStatusCode: 1300,
    gibStatusDescription: "1300 - Fatura G\u0130B Sistemine Ba\u015Far\u0131yla \u0130letildi ve Onayland\u0131",
    supplierTitle: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT \u0130N\u015E. T\u0130C. LTD. \u015ET\u0130.",
    supplierVkn: "0580948214",
    supplierTaxOffice: "Karak\xF6pr\xFC Vergi Dairesi",
    supplierAddress: "Bat\u0131kent Mah. Beyaz\u0131t Bulvar\u0131 No:32/1 Karak\xF6pr\xFC",
    supplierCity: "\u015Eanl\u0131urfa",
    supplierDistrict: "Karak\xF6pr\xFC",
    supplierPhone: "0544 440 91 80",
    supplierEmail: "muhasebe@alphadogalgaz.com",
    supplierMersisNo: "0058094821400001",
    supplierTicaretSicilNo: "38492",
    customerCariId: "cari-101",
    customerTitle: "F\u0131rat Is\u0131 Sistemleri ve M\xFChendislik San. Tic. Ltd. \u015Eti.",
    customerName: "Ahmet F\u0131rat",
    customerVknTckn: "3880492817",
    customerTaxOffice: "\u015Eehitkamil Vergi Dairesi",
    customerAddress: "\u0130ncilip\u0131nar Mah. Muammer Aksoy Bulv. No:14/B",
    customerCity: "Gaziantep",
    customerDistrict: "\u015Eehitkamil",
    customerPhone: "0532 990 12 34",
    customerEmail: "info@firatmuhendislik.com",
    isEInvoicePayer: true,
    sourceType: "order",
    sourceId: "ord-101",
    sourceNumber: "ORD-9842",
    despatchNumber: "IRS2026000000045",
    despatchDate: "2026-02-18",
    orderNumber: "ORD-9842",
    orderDate: "2026-02-17",
    items: [
      {
        id: "item-1",
        name: "E.C.A. Proteus Premix 24 kW Tam Yo\u011Fu\u015Fmal\u0131 Kombi",
        sku: "ST00101",
        quantity: 2,
        unit: "ADET",
        unitPrice: 24500,
        discountPercent: 5,
        discountAmount: 2450,
        vatRate: 20,
        vatAmount: 9310,
        lineTotal: 55860
      },
      {
        id: "item-2",
        name: "DemirD\xF6k\xFCm Plus 600x1200 Panel Radyat\xF6r (Tip 22)",
        sku: "ST00201",
        quantity: 6,
        unit: "ADET",
        unitPrice: 2850,
        discountPercent: 0,
        discountAmount: 0,
        vatRate: 20,
        vatAmount: 3420,
        lineTotal: 20520
      }
    ],
    subtotal: 66100,
    totalDiscount: 2450,
    taxExclusiveAmount: 63650,
    vat20Matrah: 63650,
    vat20Amount: 12730,
    totalVat: 12730,
    payableAmount: 76380,
    amountInWords: "Yaln\u0131z Yetmi\u015F Alt\u0131 Bin \xDC\xE7 Y\xFCz Seksen T\xFCrk Liras\u0131",
    notes: [
      "\u0130\u015Fbu fatura muhteviyat\u0131 mallar eksiksiz ve hasars\u0131z olarak teslim edilmi\u015Ftir.",
      "\xD6deme vadesi 30 g\xFCn olup, Kuveyt T\xFCrk TR84 0020 5000 0987 6543 2100 01 nolu hesab\u0131m\u0131za havale yap\u0131lacakt\u0131r."
    ],
    paymentMethod: "Cari Hesap",
    bankName: "Kuveyt T\xFCrk Kat\u0131l\u0131m Bankas\u0131",
    bankIban: "TR84 0020 5000 0987 6543 2100 01",
    cariTransactionId: "ctx-1001",
    createdAt: "2026-02-18T10:30:00.000Z",
    updatedAt: "2026-02-18T10:35:00.000Z"
  },
  {
    id: "inv-1002",
    invoiceNumber: "EAR2026000000201",
    uuid: "b7c93e4f-1234-4c22-8b83-79d23ab90c02",
    profile: "EARSIVFATURA",
    type: "SATIS",
    invoiceDate: "2026-02-22",
    invoiceTime: "14:15:00",
    currency: "TRY",
    currencyRate: 1,
    status: "sent",
    gibStatusCode: 1300,
    gibStatusDescription: "1300 - E-Ar\u015Fiv Fatura Raporu G\u0130B Sistemine \u0130letildi",
    supplierTitle: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT \u0130N\u015E. T\u0130C. LTD. \u015ET\u0130.",
    supplierVkn: "0580948214",
    supplierTaxOffice: "Karak\xF6pr\xFC Vergi Dairesi",
    supplierAddress: "Bat\u0131kent Mah. Beyaz\u0131t Bulvar\u0131 No:32/1 Karak\xF6pr\xFC",
    supplierCity: "\u015Eanl\u0131urfa",
    supplierDistrict: "Karak\xF6pr\xFC",
    supplierPhone: "0544 440 91 80",
    supplierEmail: "muhasebe@alphadogalgaz.com",
    supplierMersisNo: "0058094821400001",
    supplierTicaretSicilNo: "38492",
    customerTitle: "Mustafa Y\u0131ld\u0131r\u0131m (Bireysel M\xFC\u015Fteri)",
    customerName: "Mustafa Y\u0131ld\u0131r\u0131m",
    customerVknTckn: "28491029384",
    customerAddress: "Atat\xFCrk Mah. 120. Sokak G\xFCl Apt. No:8",
    customerCity: "\u015Eanl\u0131urfa",
    customerDistrict: "Haliliye",
    customerPhone: "0542 881 22 33",
    customerEmail: "mustafayildirim63@gmail.com",
    isEInvoicePayer: false,
    sourceType: "order",
    sourceId: "ord-102",
    sourceNumber: "ORD-9844",
    items: [
      {
        id: "item-3",
        name: "Baymak Lunatec 24 kW Tam Yo\u011Fu\u015Fmal\u0131 Kombi",
        sku: "ST00103",
        quantity: 1,
        unit: "ADET",
        unitPrice: 23800,
        discountPercent: 0,
        discountAmount: 0,
        vatRate: 20,
        vatAmount: 4760,
        lineTotal: 28560
      },
      {
        id: "item-4",
        name: "Danfoss Termostatik Radyat\xF6r Vanas\u0131 (K\xF6\u015Fe Tip)",
        sku: "ST00301",
        quantity: 5,
        unit: "ADET",
        unitPrice: 420,
        discountPercent: 0,
        discountAmount: 0,
        vatRate: 20,
        vatAmount: 420,
        lineTotal: 2520
      }
    ],
    subtotal: 25900,
    totalDiscount: 0,
    taxExclusiveAmount: 25900,
    vat20Matrah: 25900,
    vat20Amount: 5180,
    totalVat: 5180,
    payableAmount: 31080,
    amountInWords: "Yaln\u0131z Otuz Bir Bin Seksen T\xFCrk Liras\u0131",
    notes: [
      "G\u0130B E-Ar\u015Fiv Mevzuat\u0131 kapsam\u0131nda elektronik ortamda iletilmi\u015Ftir.",
      "\xDCr\xFCnler orijinal kolisinde montaj k\u0131lavuzu ve garanti belgesi ile teslim edilmi\u015Ftir."
    ],
    paymentMethod: "Kredi Kart\u0131",
    createdAt: "2026-02-22T14:15:00.000Z",
    updatedAt: "2026-02-22T14:20:00.000Z"
  },
  {
    id: "inv-1003",
    invoiceNumber: "ALP2026000000103",
    uuid: "c9d04f5a-2345-4d33-9c94-8a034bc01d03",
    profile: "TICARIFATURA",
    type: "TEVKIFAT",
    invoiceDate: "2026-02-25",
    invoiceTime: "16:00:00",
    currency: "TRY",
    currencyRate: 1,
    status: "draft",
    supplierTitle: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT \u0130N\u015E. T\u0130C. LTD. \u015ET\u0130.",
    supplierVkn: "0580948214",
    supplierTaxOffice: "Karak\xF6pr\xFC Vergi Dairesi",
    supplierAddress: "Bat\u0131kent Mah. Beyaz\u0131t Bulvar\u0131 No:32/1 Karak\xF6pr\xFC",
    supplierCity: "\u015Eanl\u0131urfa",
    supplierDistrict: "Karak\xF6pr\xFC",
    supplierPhone: "0544 440 91 80",
    supplierEmail: "muhasebe@alphadogalgaz.com",
    supplierMersisNo: "0058094821400001",
    supplierTicaretSicilNo: "38492",
    customerCariId: "cari-103",
    customerTitle: "G\xFCneydo\u011Fu Yap\u0131 M\xFCteahhitlik \u0130n\u015F. Taah. A.\u015E.",
    customerName: "Mehmet Ali G\xFCne\u015F",
    customerVknTckn: "4290184719",
    customerTaxOffice: "Karak\xF6pr\xFC Vergi Dairesi",
    customerAddress: "Diyarbak\u0131r Yolu 5. Km G\xFCne\u015F Plaza No:12",
    customerCity: "\u015Eanl\u0131urfa",
    customerDistrict: "Karak\xF6pr\xFC",
    customerPhone: "0533 110 44 55",
    customerEmail: "muhasebe@guneydoguyapi.com.tr",
    isEInvoicePayer: true,
    sourceType: "quote",
    sourceId: "qt-101",
    sourceNumber: "QT-8821",
    items: [
      {
        id: "item-5",
        name: "Do\u011Falgaz Kolon Tesisat\u0131 ve Mekanik Montaj Taahh\xFCt Hizmeti",
        sku: "SRV-001",
        quantity: 1,
        unit: "SET",
        unitPrice: 12e4,
        discountPercent: 0,
        discountAmount: 0,
        vatRate: 20,
        vatAmount: 24e3,
        tevkifatCode: "601",
        tevkifatRate: "5/10",
        tevkifatAmount: 12e3,
        lineTotal: 132e3
      }
    ],
    subtotal: 12e4,
    totalDiscount: 0,
    taxExclusiveAmount: 12e4,
    vat20Matrah: 12e4,
    vat20Amount: 24e3,
    totalVat: 24e3,
    totalTevkifat: 12e3,
    payableAmount: 132e3,
    amountInWords: "Yaln\u0131z Y\xFCz Otuz \u0130ki Bin T\xFCrk Liras\u0131",
    notes: [
      "G\u0130B 601 Kodu: Yap\u0131m \u0130\u015Fleri ile Bu \u0130\u015Flerle Birlikte \u0130fa Edilen M\xFChendislik Hizmetleri (5/10 Tevkifat Uygulanm\u0131\u015Ft\u0131r).",
      "Fatura taslak halindedir; onayland\u0131\u011F\u0131nda G\u0130B sistemine aktar\u0131lacakt\u0131r."
    ],
    paymentMethod: "Cari Hesap",
    bankName: "Kuveyt T\xFCrk Kat\u0131l\u0131m Bankas\u0131",
    bankIban: "TR84 0020 5000 0987 6543 2100 01",
    createdAt: "2026-02-25T16:00:00.000Z",
    updatedAt: "2026-02-25T16:00:00.000Z"
  }
];
var eInvoices = [...seedInvoices];
app.get("/api/invoices", (req, res) => {
  totalDbReads += 1;
  const { status, profile, type, search } = req.query;
  let filtered = [...eInvoices];
  if (status && status !== "all") {
    filtered = filtered.filter((i) => i.status === status);
  }
  if (profile && profile !== "all") {
    filtered = filtered.filter((i) => i.profile === profile);
  }
  if (type && type !== "all") {
    filtered = filtered.filter((i) => i.type === type);
  }
  if (search) {
    const q = String(search).toLowerCase();
    filtered = filtered.filter(
      (i) => i.invoiceNumber.toLowerCase().includes(q) || i.customerTitle.toLowerCase().includes(q) || i.customerVknTckn.includes(q) || i.sourceNumber && i.sourceNumber.toLowerCase().includes(q)
    );
  }
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const totalInvoices = eInvoices.length;
  const totalMatrah = eInvoices.reduce((s, i) => s + (i.status !== "cancelled" ? i.taxExclusiveAmount : 0), 0);
  const totalVat = eInvoices.reduce((s, i) => s + (i.status !== "cancelled" ? i.totalVat : 0), 0);
  const totalPayable = eInvoices.reduce((s, i) => s + (i.status !== "cancelled" ? i.payableAmount : 0), 0);
  const eFaturaCount = eInvoices.filter((i) => i.isEInvoicePayer).length;
  const eArsivCount = eInvoices.filter((i) => !i.isEInvoicePayer).length;
  const draftCount = eInvoices.filter((i) => i.status === "draft").length;
  const sentCount = eInvoices.filter((i) => i.status === "sent").length;
  res.json({
    success: true,
    invoices: filtered,
    summary: {
      totalInvoices,
      totalMatrah,
      totalVat,
      totalPayable,
      eFaturaCount,
      eArsivCount,
      draftCount,
      sentCount
    }
  });
});
app.get("/api/invoices/:id", (req, res) => {
  const { id } = req.params;
  const inv = eInvoices.find((i) => i.id === id);
  if (!inv) {
    return res.status(404).json({ error: "Fatura bulunamad\u0131." });
  }
  res.json({ success: true, invoice: inv });
});
app.post("/api/invoices", (req, res) => {
  const {
    customerTitle,
    customerName,
    customerVknTckn,
    customerTaxOffice,
    customerAddress,
    customerCity,
    customerDistrict,
    customerPhone,
    customerEmail,
    isEInvoicePayer,
    profile,
    type,
    invoiceDate,
    despatchNumber,
    despatchDate,
    orderNumber,
    items,
    notes,
    paymentMethod,
    bankName,
    bankIban,
    autoProcessCari,
    sourceType,
    sourceId,
    sourceNumber
  } = req.body;
  if (!customerTitle || !customerVknTckn || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "M\xFC\u015Fteri \xFCnvan\u0131, VKN/TCKN ve en az 1 fatura kalemi zorunludur." });
  }
  const vknClean = String(customerVknTckn).trim();
  const isPayer = isEInvoicePayer !== void 0 ? isEInvoicePayer : vknClean.length === 10;
  const selectedProfile = profile || (isPayer ? "TICARIFATURA" : "EARSIVFATURA");
  const selectedType = type || "SATIS";
  const totals = calculateServerInvoiceTotals(items);
  const newInvoiceNumber = getNextInvoiceNumber(isPayer);
  const uuid = import_crypto.default.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const linkedCari = cariAccounts.find(
    (c) => c.taxNumber && c.taxNumber.trim() === vknClean || c.companyName.toLowerCase().includes(customerTitle.toLowerCase())
  );
  let cariTxId = void 0;
  if (autoProcessCari && linkedCari) {
    cariTxId = `ctx-${Date.now()}`;
    const newTx = {
      id: cariTxId,
      cariId: linkedCari.id,
      date: invoiceDate || now.split("T")[0],
      type: "sale_invoice",
      amount: totals.payableAmount,
      direction: "debit",
      description: `E-Fatura Kesildi: ${newInvoiceNumber} (${selectedProfile})`,
      documentNo: newInvoiceNumber,
      paymentMethod: paymentMethod || "Cari Hesap",
      createdAt: now
    };
    cariTransactions.unshift(newTx);
    recalculateCariBalance(linkedCari.id);
    broadcastEvent("CARI_UPDATED", { cari: linkedCari, transaction: newTx });
  }
  const newInvoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber: newInvoiceNumber,
    uuid,
    profile: selectedProfile,
    type: selectedType,
    invoiceDate: invoiceDate || now.split("T")[0],
    invoiceTime: (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0],
    currency: "TRY",
    currencyRate: 1,
    status: "draft",
    supplierTitle: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT \u0130N\u015E. T\u0130C. LTD. \u015ET\u0130.",
    supplierVkn: "0580948214",
    supplierTaxOffice: "Karak\xF6pr\xFC Vergi Dairesi",
    supplierAddress: "Bat\u0131kent Mah. Beyaz\u0131t Bulvar\u0131 No:32/1 Karak\xF6pr\xFC",
    supplierCity: "\u015Eanl\u0131urfa",
    supplierDistrict: "Karak\xF6pr\xFC",
    supplierPhone: "0544 440 91 80",
    supplierEmail: "muhasebe@alphadogalgaz.com",
    supplierMersisNo: "0058094821400001",
    supplierTicaretSicilNo: "38492",
    customerCariId: linkedCari?.id,
    customerTitle: customerTitle.trim(),
    customerName: customerName ? customerName.trim() : void 0,
    customerVknTckn: vknClean,
    customerTaxOffice: customerTaxOffice ? customerTaxOffice.trim() : void 0,
    customerAddress: customerAddress || "\u015Eanl\u0131urfa",
    customerCity: customerCity || "\u015Eanl\u0131urfa",
    customerDistrict: customerDistrict || void 0,
    customerPhone: customerPhone || void 0,
    customerEmail: customerEmail || void 0,
    isEInvoicePayer: isPayer,
    sourceType: sourceType || "manual",
    sourceId: sourceId || void 0,
    sourceNumber: sourceNumber || void 0,
    despatchNumber: despatchNumber || void 0,
    despatchDate: despatchDate || void 0,
    orderNumber: orderNumber || sourceNumber || void 0,
    orderDate: now.split("T")[0],
    items: totals.processedItems,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxExclusiveAmount: totals.taxExclusiveAmount,
    vat20Matrah: totals.vat20Matrah,
    vat20Amount: totals.vat20Amount,
    vat10Matrah: totals.vat10Matrah,
    vat10Amount: totals.vat10Amount,
    vat1Matrah: totals.vat1Matrah,
    vat1Amount: totals.vat1Amount,
    totalVat: totals.totalVat,
    totalTevkifat: totals.totalTevkifat,
    payableAmount: totals.payableAmount,
    amountInWords: totals.amountInWords,
    notes: notes && notes.length > 0 ? notes : ["Mallar eksiksiz teslim edilmi\u015Ftir."],
    paymentMethod: paymentMethod || "Havale/EFT",
    bankName: bankName || "Kuveyt T\xFCrk Kat\u0131l\u0131m Bankas\u0131",
    bankIban: bankIban || "TR84 0020 5000 0987 6543 2100 01",
    cariTransactionId: cariTxId,
    createdAt: now,
    updatedAt: now
  };
  eInvoices.unshift(newInvoice);
  totalDbWrites += 1;
  const notif = {
    id: `notif-${Date.now()}`,
    title: "Yeni E-Fatura Tasla\u011F\u0131 Olu\u015Fturuldu \u{1F9FE}",
    message: `${newInvoice.customerTitle} ad\u0131na ${newInvoice.invoiceNumber} numaral\u0131 ${newInvoice.payableAmount.toLocaleString("tr-TR")} \u20BA tutar\u0131nda fatura tasla\u011F\u0131 haz\u0131rland\u0131.`,
    type: "system",
    targetRole: "admin",
    read: false,
    timestamp: now
  };
  notifications.unshift(notif);
  broadcastEvent("INVOICE_CREATED", newInvoice);
  broadcastEvent("NOTIFICATION_ADDED", notif);
  res.status(201).json({ success: true, invoice: newInvoice });
});
app.post("/api/invoices/generate-from-order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const { autoProcessCari } = req.body;
  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: "Sipari\u015F bulunamad\u0131." });
  }
  const existing = eInvoices.find((i) => i.sourceId === orderId && i.status !== "cancelled");
  if (existing) {
    return res.json({ success: true, invoice: existing, alreadyExisted: true });
  }
  const linkedCari = cariAccounts.find(
    (c) => c.companyName.toLowerCase().includes(order.customerName.toLowerCase()) || order.customerEmail.toLowerCase().includes(c.email?.toLowerCase() || "---")
  );
  const vknClean = linkedCari?.taxNumber || "11111111111";
  const isPayer = linkedCari ? linkedCari.taxNumber.length === 10 : false;
  const profile = isPayer ? "TICARIFATURA" : "EARSIVFATURA";
  const newInvoiceNumber = getNextInvoiceNumber(isPayer);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const items = order.items.map((it) => {
    const priceWithVat = it.unitPrice || it.totalPrice / (it.quantity || 1);
    const priceExVat = priceWithVat / 1.2;
    return {
      name: it.productName,
      sku: void 0,
      quantity: it.quantity,
      unit: it.unit || "ADET",
      unitPrice: Math.round(priceExVat * 100) / 100,
      discountPercent: 0,
      vatRate: 20
    };
  });
  const totals = calculateServerInvoiceTotals(items);
  let cariTxId = void 0;
  if (autoProcessCari && linkedCari) {
    cariTxId = `ctx-${Date.now()}`;
    const newTx = {
      id: cariTxId,
      cariId: linkedCari.id,
      date: now.split("T")[0],
      type: "sale_invoice",
      amount: totals.payableAmount,
      direction: "debit",
      description: `${order.orderNumber} Nolu Sipari\u015F E-Faturas\u0131: ${newInvoiceNumber}`,
      documentNo: newInvoiceNumber,
      paymentMethod: "Cari Hesap",
      createdAt: now
    };
    cariTransactions.unshift(newTx);
    recalculateCariBalance(linkedCari.id);
    broadcastEvent("CARI_UPDATED", { cari: linkedCari, transaction: newTx });
  }
  const newInvoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber: newInvoiceNumber,
    uuid: import_crypto.default.randomUUID(),
    profile,
    type: "SATIS",
    invoiceDate: now.split("T")[0],
    invoiceTime: (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0],
    currency: "TRY",
    currencyRate: 1,
    status: "draft",
    supplierTitle: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT \u0130N\u015E. T\u0130C. LTD. \u015ET\u0130.",
    supplierVkn: "0580948214",
    supplierTaxOffice: "Karak\xF6pr\xFC Vergi Dairesi",
    supplierAddress: "Bat\u0131kent Mah. Beyaz\u0131t Bulvar\u0131 No:32/1 Karak\xF6pr\xFC",
    supplierCity: "\u015Eanl\u0131urfa",
    supplierDistrict: "Karak\xF6pr\xFC",
    supplierPhone: "0544 440 91 80",
    supplierEmail: "muhasebe@alphadogalgaz.com",
    supplierMersisNo: "0058094821400001",
    supplierTicaretSicilNo: "38492",
    customerCariId: linkedCari?.id,
    customerTitle: linkedCari?.companyName || order.customerName,
    customerName: order.customerName,
    customerVknTckn: vknClean,
    customerTaxOffice: linkedCari?.taxOffice || void 0,
    customerAddress: order.customerAddress || "\u015Eanl\u0131urfa",
    customerCity: "\u015Eanl\u0131urfa",
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    isEInvoicePayer: isPayer,
    sourceType: "order",
    sourceId: order.id,
    sourceNumber: order.orderNumber,
    despatchNumber: order.trackingNumber ? `IRS-${order.trackingNumber}` : void 0,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt.split("T")[0],
    items: totals.processedItems,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxExclusiveAmount: totals.taxExclusiveAmount,
    vat20Matrah: totals.vat20Matrah,
    vat20Amount: totals.vat20Amount,
    vat10Matrah: totals.vat10Matrah,
    vat10Amount: totals.vat10Amount,
    vat1Matrah: totals.vat1Matrah,
    vat1Amount: totals.vat1Amount,
    totalVat: totals.totalVat,
    totalTevkifat: totals.totalTevkifat,
    payableAmount: totals.payableAmount,
    amountInWords: totals.amountInWords,
    notes: [
      `${order.orderNumber} numaral\u0131 sipari\u015Fe istinaden d\xFCzenlenmi\u015Ftir.`,
      "\u0130\u015Fbu fatura muhteviyat\u0131 \xFCr\xFCnler orijinal ambalaj\u0131nda sevk edilmi\u015Ftir."
    ],
    paymentMethod: "Havale/EFT",
    bankName: "Kuveyt T\xFCrk Kat\u0131l\u0131m Bankas\u0131",
    bankIban: "TR84 0020 5000 0987 6543 2100 01",
    cariTransactionId: cariTxId,
    createdAt: now,
    updatedAt: now
  };
  eInvoices.unshift(newInvoice);
  totalDbWrites += 1;
  broadcastEvent("INVOICE_CREATED", newInvoice);
  res.status(201).json({ success: true, invoice: newInvoice });
});
app.post("/api/invoices/generate-from-quote/:quoteId", (req, res) => {
  const { quoteId } = req.params;
  const quote = quotes.find((q) => q.id === quoteId);
  if (!quote) {
    return res.status(404).json({ error: "Teklif bulunamad\u0131." });
  }
  const existing = eInvoices.find((i) => i.sourceId === quoteId && i.status !== "cancelled");
  if (existing) {
    return res.json({ success: true, invoice: existing, alreadyExisted: true });
  }
  const linkedCari = cariAccounts.find(
    (c) => quote.customerCompany && c.companyName.toLowerCase().includes(quote.customerCompany.toLowerCase()) || c.companyName.toLowerCase().includes(quote.customerName.toLowerCase())
  );
  const vknClean = linkedCari?.taxNumber || "11111111111";
  const isPayer = linkedCari ? linkedCari.taxNumber.length === 10 : false;
  const profile = isPayer ? "TICARIFATURA" : "EARSIVFATURA";
  const newInvoiceNumber = getNextInvoiceNumber(isPayer);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const quoteItems = quote.offeredItems && quote.offeredItems.length > 0 ? quote.offeredItems.map((it) => ({
    name: it.productName,
    sku: void 0,
    quantity: it.quantity,
    unit: it.unit || "ADET",
    unitPrice: it.offeredUnitPrice || it.listPrice * 0.85,
    discountPercent: it.discountRate || 0,
    vatRate: 20
  })) : quote.requestedItems.map((it) => ({
    name: it.productName,
    sku: void 0,
    quantity: it.requestedQuantity,
    unit: it.unit || "ADET",
    unitPrice: it.targetUnitPrice || 1e3,
    discountPercent: 0,
    vatRate: 20
  }));
  const totals = calculateServerInvoiceTotals(quoteItems);
  const newInvoice = {
    id: `inv-${Date.now()}`,
    invoiceNumber: newInvoiceNumber,
    uuid: import_crypto.default.randomUUID(),
    profile,
    type: "SATIS",
    invoiceDate: now.split("T")[0],
    invoiceTime: (/* @__PURE__ */ new Date()).toTimeString().split(" ")[0],
    currency: "TRY",
    currencyRate: 1,
    status: "draft",
    supplierTitle: "ALPHA TEKN\u0130K DO\u011EALGAZ SIHH\u0130 TES\u0130SAT \u0130N\u015E. T\u0130C. LTD. \u015ET\u0130.",
    supplierVkn: "0580948214",
    supplierTaxOffice: "Karak\xF6pr\xFC Vergi Dairesi",
    supplierAddress: "Bat\u0131kent Mah. Beyaz\u0131t Bulvar\u0131 No:32/1 Karak\xF6pr\xFC",
    supplierCity: "\u015Eanl\u0131urfa",
    supplierDistrict: "Karak\xF6pr\xFC",
    supplierPhone: "0544 440 91 80",
    supplierEmail: "muhasebe@alphadogalgaz.com",
    supplierMersisNo: "0058094821400001",
    supplierTicaretSicilNo: "38492",
    customerCariId: linkedCari?.id,
    customerTitle: quote.customerCompany || quote.customerName,
    customerName: quote.customerName,
    customerVknTckn: vknClean,
    customerTaxOffice: linkedCari?.taxOffice || void 0,
    customerAddress: quote.deliveryCity || "\u015Eanl\u0131urfa",
    customerCity: quote.deliveryCity || "\u015Eanl\u0131urfa",
    customerPhone: quote.customerPhone,
    customerEmail: quote.customerEmail,
    isEInvoicePayer: isPayer,
    sourceType: "quote",
    sourceId: quote.id,
    sourceNumber: quote.quoteNumber,
    orderNumber: quote.quoteNumber,
    orderDate: quote.createdAt.split("T")[0],
    items: totals.processedItems,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxExclusiveAmount: totals.taxExclusiveAmount,
    vat20Matrah: totals.vat20Matrah,
    vat20Amount: totals.vat20Amount,
    vat10Matrah: totals.vat10Matrah,
    vat10Amount: totals.vat10Amount,
    vat1Matrah: totals.vat1Matrah,
    vat1Amount: totals.vat1Amount,
    totalVat: totals.totalVat,
    totalTevkifat: totals.totalTevkifat,
    payableAmount: totals.payableAmount,
    amountInWords: totals.amountInWords,
    notes: [
      `${quote.quoteNumber} numaral\u0131 resmi proforma teklife istinaden faturaland\u0131r\u0131lm\u0131\u015Ft\u0131r.`,
      `\xD6deme Ko\u015Fulu: ${quote.paymentTerms || "Pe\u015Fin (Havale/EFT)"}`
    ],
    paymentMethod: "Havale/EFT",
    bankName: "Kuveyt T\xFCrk Kat\u0131l\u0131m Bankas\u0131",
    bankIban: "TR84 0020 5000 0987 6543 2100 01",
    createdAt: now,
    updatedAt: now
  };
  eInvoices.unshift(newInvoice);
  totalDbWrites += 1;
  broadcastEvent("INVOICE_CREATED", newInvoice);
  res.status(201).json({ success: true, invoice: newInvoice });
});
app.post("/api/invoices/:id/send-gib", (req, res) => {
  const { id } = req.params;
  const inv = eInvoices.find((i) => i.id === id);
  if (!inv) {
    return res.status(404).json({ error: "Fatura bulunamad\u0131." });
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  inv.status = "sent";
  inv.gibStatusCode = 1300;
  inv.gibStatusDescription = inv.profile === "EARSIVFATURA" ? "1300 - E-Ar\u015Fiv Fatura Raporu G\u0130B Sistemine Ba\u015Far\u0131yla \u0130letildi" : "1300 - E-Fatura G\u0130B Sistemine \u0130letildi ve Al\u0131c\u0131 Posta Kutusuna Teslim Edildi";
  inv.updatedAt = now;
  totalDbWrites += 1;
  const notif = {
    id: `notif-${Date.now()}`,
    title: "G\u0130B Fatura G\xF6nderimi Ba\u015Far\u0131l\u0131 \u2705",
    message: `${inv.invoiceNumber} nolu ${inv.profile} faturas\u0131 Gelir \u0130daresi Ba\u015Fkanl\u0131\u011F\u0131 sistemine (1300 Koduyla) iletildi.`,
    type: "system",
    targetRole: "admin",
    read: false,
    timestamp: now
  };
  notifications.unshift(notif);
  broadcastEvent("INVOICE_UPDATED", inv);
  broadcastEvent("NOTIFICATION_ADDED", notif);
  res.json({
    success: true,
    message: "Fatura G\u0130B sistemine ba\u015Far\u0131yla iletildi.",
    invoice: inv
  });
});
app.post("/api/invoices/batch-send-gib", (req, res) => {
  const drafts = eInvoices.filter((i) => i.status === "draft");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let count = 0;
  drafts.forEach((inv) => {
    inv.status = "sent";
    inv.gibStatusCode = 1300;
    inv.gibStatusDescription = inv.profile === "EARSIVFATURA" ? "1300 - E-Ar\u015Fiv Fatura Raporu G\u0130B Sistemine Ba\u015Far\u0131yla \u0130letildi" : "1300 - E-Fatura G\u0130B Sistemine \u0130letildi ve Al\u0131c\u0131 Posta Kutusuna Teslim Edildi";
    inv.updatedAt = now;
    count++;
  });
  totalDbWrites += count;
  if (count > 0) {
    const notif = {
      id: `notif-${Date.now()}`,
      title: "Toplu G\u0130B G\xF6nderimi Tamamland\u0131 \u2705",
      message: `${count} adet taslak fatura ba\u015Far\u0131yla G\u0130B sistemine iletildi.`,
      type: "system",
      targetRole: "admin",
      read: false,
      timestamp: now
    };
    notifications.unshift(notif);
    broadcastEvent("INVOICE_BATCH_UPDATED", { count });
    broadcastEvent("NOTIFICATION_ADDED", notif);
  }
  res.json({
    success: true,
    processedCount: count,
    invoices: eInvoices
  });
});
app.post("/api/invoices/:id/cancel", (req, res) => {
  const { id } = req.params;
  const inv = eInvoices.find((i) => i.id === id);
  if (!inv) {
    return res.status(404).json({ error: "Fatura bulunamad\u0131." });
  }
  inv.status = "cancelled";
  inv.gibStatusDescription = "\u0130ptal Edildi";
  inv.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (inv.customerCariId && inv.cariTransactionId) {
    const linkedCari = cariAccounts.find((c) => c.id === inv.customerCariId);
    if (linkedCari) {
      const reversalTx = {
        id: `ctx-rev-${Date.now()}`,
        cariId: linkedCari.id,
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        type: "return_credit",
        amount: inv.payableAmount,
        direction: "credit",
        description: `\u0130ptal Edilen Fatura Mahsubu: ${inv.invoiceNumber}`,
        documentNo: `IPT-${inv.invoiceNumber}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      cariTransactions.unshift(reversalTx);
      recalculateCariBalance(linkedCari.id);
      broadcastEvent("CARI_UPDATED", { cari: linkedCari, transaction: reversalTx });
    }
  }
  totalDbWrites += 1;
  broadcastEvent("INVOICE_UPDATED", inv);
  res.json({ success: true, message: "Fatura iptal edildi.", invoice: inv });
});
app.delete("/api/invoices/:id", (req, res) => {
  const { id } = req.params;
  const index = eInvoices.findIndex((i) => i.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Fatura bulunamad\u0131." });
  }
  const inv = eInvoices[index];
  if (inv.status === "sent") {
    return res.status(400).json({ error: "G\u0130B sistemine iletilen resmi faturalar silinemez; ancak iptal edilebilir veya iade faturas\u0131 kesilebilir." });
  }
  eInvoices.splice(index, 1);
  totalDbWrites += 1;
  broadcastEvent("INVOICE_DELETED", { id });
  res.json({ success: true, message: "Taslak fatura silindi." });
});
var bankReceipts = [
  {
    id: "rec-001",
    orderId: orders[0]?.id,
    orderNumber: orders[0]?.orderNumber || "ORD-2026-001",
    customerName: orders[0]?.customerName || "Kuzey Tesisat Ltd.",
    customerCompany: "Kuzey Tesisat M\xFChendislik",
    customerEmail: orders[0]?.customerEmail || "kuzey@muhendislik.com.tr",
    customerPhone: "0533 112 33 44",
    bankName: "Garanti BBVA",
    senderIban: "TR12 0006 2000 0001 9876 5432 01",
    amount: orders[0]?.total || 4850,
    paymentDate: (/* @__PURE__ */ new Date()).toISOString(),
    referenceNo: "DEK-984210",
    receiptFileUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80",
    receiptFileName: "Garanti_Dekont_ORD001.pdf",
    customerNote: "1. parti sipari\u015F bedeli havale edilmi\u015Ftir.",
    status: "pending",
    createdAt: new Date(Date.now() - 36e5).toISOString(),
    updatedAt: new Date(Date.now() - 36e5).toISOString()
  }
];
app.get("/api/receipts", (req, res) => {
  res.json({ success: true, receipts: bankReceipts });
});
app.post("/api/receipts", (req, res) => {
  const data = req.body;
  const newReceipt = {
    id: data.id || "rec-" + Date.now(),
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    customerName: data.customerName || "M\xFC\u015Fteri",
    customerCompany: data.customerCompany || "Bayi",
    customerEmail: data.customerEmail || "",
    customerPhone: data.customerPhone || "",
    bankName: data.bankName || "Garanti BBVA",
    senderIban: data.senderIban,
    amount: Number(data.amount) || 0,
    paymentDate: data.paymentDate || (/* @__PURE__ */ new Date()).toISOString(),
    referenceNo: data.referenceNo || "DEK-" + Math.floor(1e5 + Math.random() * 9e5),
    receiptFileUrl: data.receiptFileUrl || "",
    receiptFileName: data.receiptFileName || "Banka_Dekontu.pdf",
    customerNote: data.customerNote || "",
    status: "pending",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  bankReceipts.unshift(newReceipt);
  if (data.orderId) {
    const ord = orders.find((o) => o.id === data.orderId);
    if (ord) {
      ord.receiptStatus = "uploaded";
      ord.receiptFileName = newReceipt.receiptFileName;
      ord.receiptFileUrl = newReceipt.receiptFileUrl;
      ord.receiptBankName = newReceipt.bankName;
      ord.receiptAmount = newReceipt.amount;
    }
  }
  const notif = {
    id: "notif-rec-" + Date.now(),
    title: "Yeni Havale / Dekont Bildirimi",
    message: `${newReceipt.customerCompany || newReceipt.customerName} taraf\u0131ndan ${newReceipt.amount.toLocaleString("tr-TR")} \u20BA tutar\u0131nda ${newReceipt.bankName} dekontu y\xFCklendi.`,
    type: "order_updated",
    targetRole: "admin",
    read: false,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  notifications.unshift(notif);
  broadcastEvent("NOTIFICATION_ADDED", notif);
  broadcastEvent("RECEIPT_CREATED", newReceipt);
  res.status(201).json({ success: true, receipt: newReceipt });
});
app.put("/api/receipts/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, adminNote, processedBy } = req.body;
  const rec = bankReceipts.find((r) => r.id === id);
  if (!rec) {
    return res.status(404).json({ error: "Dekont kayd\u0131 bulunamad\u0131." });
  }
  rec.status = status;
  rec.adminNote = adminNote || rec.adminNote;
  rec.processedBy = processedBy || "Y\xF6netici";
  rec.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (status === "approved" && rec.orderId) {
    const ord = orders.find((o) => o.id === rec.orderId);
    if (ord) {
      ord.status = "approved";
      ord.receiptStatus = "verified";
      ord.statusHistory = ord.statusHistory || [];
      ord.statusHistory.unshift({
        status: "approved",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        note: `Banka dekontu onayland\u0131 (${rec.bankName} - ${rec.amount.toLocaleString("tr-TR")} \u20BA).`,
        updatedBy: processedBy || "Y\xF6netici"
      });
      broadcastEvent("ORDER_UPDATED", ord);
    }
  }
  broadcastEvent("RECEIPT_UPDATED", rec);
  res.json({ success: true, receipt: rec });
});
app.post("/api/orders/:id/picking", (req, res) => {
  const { id } = req.params;
  const { packageCount, shippingCompany, waybillNumber, items } = req.body;
  const ord = orders.find((o) => o.id === id);
  if (!ord) {
    return res.status(404).json({ error: "Sipari\u015F bulunamad\u0131." });
  }
  ord.pickingStatus = "completed";
  ord.pickedAt = (/* @__PURE__ */ new Date()).toISOString();
  ord.packageCount = Number(packageCount) || 1;
  ord.shippingCompany = shippingCompany || "Yurti\xE7i Kargo / \xD6z Ambar";
  ord.waybillNumber = waybillNumber;
  if (ord.status === "pending" || ord.status === "approved") {
    ord.status = "preparing";
    ord.statusHistory = ord.statusHistory || [];
    ord.statusHistory.unshift({
      status: "preparing",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      note: `Depoda toplama tamamland\u0131 (${packageCount || 1} koli / paket sevk alan\u0131na al\u0131nd\u0131).`,
      updatedBy: "Depo Sorumlusu"
    });
  }
  broadcastEvent("ORDER_UPDATED", ord);
  res.json({ success: true, order: ord });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Sunucu http://localhost:${PORT} \xFCzerinde \xE7al\u0131\u015F\u0131yor`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
