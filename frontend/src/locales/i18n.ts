import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enCommon from './en/common.json';
import enMenu from './en/menu.json';
import enMenuDesc from './en/menuDesc.json';
import enPages from './en/pages.json';
import thCommon from './th/common.json';
import thMenu from './th/menu.json';
import thMenuDesc from './th/menuDesc.json';
import thPages from './th/pages.json';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, menu: enMenu, menuDesc: enMenuDesc, pages: enPages },
      th: { common: thCommon, menu: thMenu, menuDesc: thMenuDesc, pages: thPages },
    },
    fallbackLng: 'th',
    defaultNS: 'common',
    ns: ['common', 'menu', 'menuDesc', 'pages'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
