/* روند یدک — فهرست برند و مدل خودروها برای منوی دستیار هوشمند
   نسخه‌ی اولیه؛ پس از پژوهش کامل با فهرست خودروهای رایج ایران جایگزین می‌شود.
   متن میان اولین آکولاد باز و آخرین آکولاد بسته باید JSON معتبر بماند. */
window.RY_CARS = {
  "version": "seed",
  "makes": [
    { "id": "ikco", "fa": "ایران خودرو", "group": "domestic", "models": [
      { "id": "ikco-samand", "fa": "سمند" },
      { "id": "ikco-soren", "fa": "سمند سورن" },
      { "id": "ikco-dena", "fa": "دنا" },
      { "id": "ikco-dena-plus", "fa": "دنا پلاس" },
      { "id": "ikco-runna", "fa": "رانا" },
      { "id": "ikco-tara", "fa": "تارا" },
      { "id": "ikco-arisan", "fa": "آریسان" }
    ] },
    { "id": "peugeot", "fa": "پژو", "group": "domestic", "models": [
      { "id": "peugeot-206", "fa": "۲۰۶" },
      { "id": "peugeot-206-sd", "fa": "۲۰۶ صندوق‌دار" },
      { "id": "peugeot-207", "fa": "۲۰۷" },
      { "id": "peugeot-405", "fa": "۴۰۵" },
      { "id": "peugeot-pars", "fa": "پارس" }
    ] },
    { "id": "saipa", "fa": "سایپا", "group": "domestic", "models": [
      { "id": "saipa-pride-111", "fa": "پراید ۱۱۱" },
      { "id": "saipa-pride-131", "fa": "پراید ۱۳۱" },
      { "id": "saipa-pride-141", "fa": "پراید ۱۴۱ و صبا" },
      { "id": "saipa-tiba", "fa": "تیبا" },
      { "id": "saipa-tiba-2", "fa": "تیبا ۲" },
      { "id": "saipa-saina", "fa": "ساینا" },
      { "id": "saipa-quick", "fa": "کوییک" },
      { "id": "saipa-shahin", "fa": "شاهین" },
      { "id": "saipa-atlas", "fa": "اطلس" }
    ] },
    { "id": "renault", "fa": "رنو", "group": "domestic", "models": [
      { "id": "renault-l90", "fa": "تندر ۹۰" },
      { "id": "renault-pars-tondar", "fa": "پارس تندر" },
      { "id": "renault-sandero", "fa": "ساندرو" },
      { "id": "renault-stepway", "fa": "ساندرو استپ‌وی" },
      { "id": "renault-megane", "fa": "مگان" }
    ] },
    { "id": "haima", "fa": "هایما", "group": "domestic", "models": [
      { "id": "haima-s5", "fa": "S5" },
      { "id": "haima-s7", "fa": "S7" },
      { "id": "haima-8s", "fa": "8S" }
    ] },
    { "id": "mvm", "fa": "ام‌وی‌ام", "group": "domestic", "models": [
      { "id": "mvm-110", "fa": "۱۱۰" },
      { "id": "mvm-315", "fa": "۳۱۵" },
      { "id": "mvm-x22", "fa": "X22" },
      { "id": "mvm-x33", "fa": "X33" },
      { "id": "mvm-x55", "fa": "X55" }
    ] },
    { "id": "chery", "fa": "چری و فونیکس", "group": "domestic", "models": [
      { "id": "chery-tiggo-5", "fa": "تیگو ۵" },
      { "id": "chery-tiggo-7", "fa": "تیگو ۷" },
      { "id": "chery-arrizo-5", "fa": "آریزو ۵" },
      { "id": "fownix-tiggo-7-pro", "fa": "فونیکس تیگو ۷ پرو" }
    ] },
    { "id": "jac", "fa": "جک", "group": "domestic", "models": [
      { "id": "jac-j4", "fa": "J4" },
      { "id": "jac-s3", "fa": "S3" },
      { "id": "jac-s5", "fa": "S5" }
    ] },
    { "id": "brilliance", "fa": "برلیانس", "group": "domestic", "models": [
      { "id": "brilliance-h220", "fa": "H220" },
      { "id": "brilliance-h230", "fa": "H230" },
      { "id": "brilliance-h320", "fa": "H320" },
      { "id": "brilliance-h330", "fa": "H330" }
    ] },
    { "id": "lifan", "fa": "لیفان", "group": "domestic", "models": [
      { "id": "lifan-x50", "fa": "X50" },
      { "id": "lifan-x60", "fa": "X60" },
      { "id": "lifan-620", "fa": "۶۲۰" }
    ] },
    { "id": "changan", "fa": "چانگان", "group": "domestic", "models": [
      { "id": "changan-cs35", "fa": "CS35" }
    ] },
    { "id": "dongfeng", "fa": "دانگ‌فنگ", "group": "domestic", "models": [
      { "id": "dongfeng-h30-cross", "fa": "H30 کراس" }
    ] },
    { "id": "zamyad", "fa": "زامیاد", "group": "domestic", "models": [
      { "id": "zamyad-z24", "fa": "وانت زامیاد (نیسان)" }
    ] },
    { "id": "paykan", "fa": "پیکان", "group": "domestic", "models": [
      { "id": "paykan-sedan", "fa": "پیکان" },
      { "id": "paykan-pickup", "fa": "وانت پیکان" }
    ] },
    { "id": "toyota", "fa": "تویوتا", "group": "imported", "models": [
      { "id": "toyota-corolla", "fa": "کرولا" },
      { "id": "toyota-camry", "fa": "کمری" },
      { "id": "toyota-yaris", "fa": "یاریس" },
      { "id": "toyota-prado", "fa": "پرادو" },
      { "id": "toyota-rav4", "fa": "RAV4" },
      { "id": "toyota-hilux", "fa": "هایلوکس" }
    ] },
    { "id": "hyundai", "fa": "هیوندای", "group": "imported", "models": [
      { "id": "hyundai-elantra", "fa": "النترا" },
      { "id": "hyundai-sonata", "fa": "سوناتا" },
      { "id": "hyundai-azera", "fa": "آزرا" },
      { "id": "hyundai-tucson", "fa": "توسان" },
      { "id": "hyundai-santafe", "fa": "سانتافه" },
      { "id": "hyundai-accent", "fa": "اکسنت" },
      { "id": "hyundai-i20", "fa": "i20" }
    ] },
    { "id": "kia", "fa": "کیا", "group": "imported", "models": [
      { "id": "kia-cerato", "fa": "سراتو" },
      { "id": "kia-optima", "fa": "اپتیما" },
      { "id": "kia-sportage", "fa": "اسپورتیج" },
      { "id": "kia-sorento", "fa": "سورنتو" },
      { "id": "kia-rio", "fa": "ریو" },
      { "id": "kia-picanto", "fa": "پیکانتو" }
    ] },
    { "id": "nissan", "fa": "نیسان", "group": "imported", "models": [
      { "id": "nissan-maxima", "fa": "ماکسیما" },
      { "id": "nissan-qashqai", "fa": "قشقایی" },
      { "id": "nissan-xtrail", "fa": "ایکس‌تریل" },
      { "id": "nissan-juke", "fa": "جوک" },
      { "id": "nissan-teana", "fa": "تینا" },
      { "id": "nissan-patrol", "fa": "پاترول" }
    ] },
    { "id": "mazda", "fa": "مزدا", "group": "imported", "models": [
      { "id": "mazda-3", "fa": "مزدا ۳" },
      { "id": "mazda-6", "fa": "مزدا ۶" },
      { "id": "mazda-cx5", "fa": "CX-5" }
    ] },
    { "id": "mitsubishi", "fa": "میتسوبیشی", "group": "imported", "models": [
      { "id": "mitsubishi-lancer", "fa": "لنسر" },
      { "id": "mitsubishi-asx", "fa": "ASX" },
      { "id": "mitsubishi-outlander", "fa": "اوت‌لندر" },
      { "id": "mitsubishi-pajero", "fa": "پاجرو" }
    ] },
    { "id": "mercedes", "fa": "مرسدس بنز", "group": "imported", "models": [
      { "id": "mercedes-c-class", "fa": "C کلاس" },
      { "id": "mercedes-e-class", "fa": "E کلاس" }
    ] },
    { "id": "bmw", "fa": "بی‌ام‌و", "group": "imported", "models": [
      { "id": "bmw-3-series", "fa": "سری ۳" },
      { "id": "bmw-5-series", "fa": "سری ۵" },
      { "id": "bmw-x5", "fa": "X5" }
    ] }
  ]
};
