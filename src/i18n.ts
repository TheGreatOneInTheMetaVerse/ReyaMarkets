import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fa from './locales/fa.json'
import tr from './locales/tr.json'
import ha from './locales/ha.json'
import hi from './locales/hi.json'
import zh from './locales/zh.json'

const savedLang = localStorage.getItem('reya-lang') || 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fa: { translation: fa },
    tr: { translation: tr },
    ha: { translation: ha },
    hi: { translation: hi },
    zh: { translation: zh },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
