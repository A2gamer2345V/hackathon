import type { Dictionary } from './en';

/**
 * Mizo ṭawng (Latin script).
 * Partial coverage — core strings only; the rest falls back to English.
 */
const lus: Partial<Dictionary> = {
  'common.tagline': 'Hriatrengte enkawlna, nun tichangtlung',
  'common.continue': 'Kal zel rawh',
  'common.back': 'Hnungtir',
  'common.next': 'A dawt',
  'common.cancel': 'Bansan',
  'common.save': 'Dah',
  'common.close': 'Khar',
  'common.done': 'Zawh e',
  'common.start': 'Tan rawh',
  'common.today': 'Vawiin',
  'common.help': 'Ṭanpuina',
  'common.settings': 'Setting',
  'common.loading': 'Load mek…',
  'common.retry': 'Tum leh rawh',

  'welcome.getStarted': 'Tan rawh',
  'welcome.body':
    'Nitin hnathawh, hriatrengna intihchakna leh chhungte nena inzawmna atana ṭanpuitu.',
  'language.title': 'I ṭawng thlang rawh',

  'role.title': 'Kei hi…',
  'role.patient.title': 'Damlo / Upa',
  'role.patient.desc': 'Nitin hnathawh leh hriatrengna intihchaknaah ṭanpuina ka mamawh.',
  'role.caregiver.title': 'Enkawltu / Chhungkaw',
  'role.caregiver.desc': 'Ka hmangaih ṭanpui leh en ka duh.',

  'auth.login': 'Lut rawh',
  'auth.signup': 'Account siam',
  'auth.password': 'Password',

  'nav.home': 'In',
  'nav.games': 'Infiamna',
  'nav.myDay': 'Ka nichhun',
  'nav.reminders': 'Hriatchhuahna',
  'nav.more': 'A dang',
  'nav.progress': 'Hmasawnna',
  'nav.settings': 'Setting',
  'nav.signOut': 'Chhuak',

  'home.greeting.morning': 'Zing ṭha, {name}',
  'home.greeting.afternoon': 'Chawhnu ṭha, {name}',
  'home.greeting.evening': 'Tlai ṭha, {name}',
  'home.todaysPlan': 'Vawiina ruahmanna',
  'home.whatWouldYouLike': 'Eng nge ti i duh?',
  'home.allDone': 'Vawiin hna zawng zawng a zawh tawh. A ṭha em em!',

  'games.title': 'Infiamna leh hnathawh',
  'games.subtitle': 'Muang takin ti rawh. Darkar awm lo, tihkhawhthlawh awm lo.',
  'games.memory': 'Hriatrengna infiamna',
  'games.attention': 'Ngaihvenna infiamna',
  'games.play': 'Infiam',
  'games.playAgain': 'Infiam leh',
  'games.backToGames': 'Infiamna lam kir',

  'feedback.wellDone': 'A ṭha khawp mai!',
  'feedback.greatJob': 'Hna ṭha tak!',
  'feedback.thatsRight': 'A dik e!',
  'feedback.oneMore': 'Khat leh i tum ang u.',
  'feedback.takeYourTime': 'Hun i neih ang zelin.',
  'feedback.keepGoing': 'I ti ṭha hle. Kal zel rawh!',

  'myDay.title': 'Ka nichhun',
  'myDay.morning': 'Zing',
  'myDay.afternoon': 'Chawhnu',
  'myDay.evening': 'Tlai',
  'myDay.markDone': 'Ka ti tawh',

  'reminders.title': 'Hriatchhuahna',
  'reminders.type.medicine': 'Damdawi',
  'reminders.type.water': 'Tui',
  'reminders.type.appointment': 'Inhmuhna',
  'reminders.type.activity': 'Hnathawh',

  'progress.title': 'I hmasawnna',
  'settings.title': 'Setting',
  'settings.language': 'Ṭawng',

  'companion.name': 'Ṭanpuitu',
  'companion.askMe': 'Engtin nge ka ṭanpui ang che?',
  'companion.speak': 'Mi hrilh rawh',
  'companion.typeHere': 'I mamawh chu ziak rawh…',
  'companion.state.listening': 'Ngaithla mek…',
  'companion.state.thinking': 'Ngaihtuah mek…',
  'companion.state.speaking': 'Sawi mek',
};

export default lus;
