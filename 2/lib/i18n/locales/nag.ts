import type { Dictionary } from './en';

/**
 * Nagamese — the Assamese-lexified contact language of Nagaland (Latin script).
 * Partial coverage — core strings only; the rest falls back to English.
 */
const nag: Partial<Dictionary> = {
  'common.tagline': 'Mon te thaka kotha khan sabhal kori kene',
  'common.continue': 'Age jabo',
  'common.back': 'Pichete',
  'common.next': 'Iyar pichete',
  'common.cancel': 'Nalage',
  'common.save': 'Rakhi lobo',
  'common.close': 'Bondh koribo',
  'common.done': 'Hoi gise',
  'common.start': 'Shuru koribo',
  'common.today': 'Aji',
  'common.help': 'Modot',
  'common.settings': 'Setting',
  'common.loading': 'Load kori ase…',
  'common.retry': 'Aru ekbar koribo',

  'welcome.getStarted': 'Shuru koribo',
  'welcome.body':
    'Din laga kaam, mon te rakha kheli aru ghor manu logote thaki bole modot kore.',
  'language.title': 'Apuni laga bhasa basi lobi',

  'role.title': 'Moi ekjon…',
  'role.patient.title': 'Bemar / Dangor manu',
  'role.patient.desc': 'Moi din laga kaam aru mon te rakha kheli te modot lage.',
  'role.caregiver.title': 'Sabhal kora manu / Ghor manu',
  'role.caregiver.desc': 'Moi moi laga morom manu ke sabhal koribo mon ase.',

  'auth.login': 'Login koribo',
  'auth.signup': 'Notun account',
  'auth.password': 'Password',

  'nav.home': 'Ghor',
  'nav.games': 'Kheli',
  'nav.myDay': 'Moi laga din',
  'nav.reminders': 'Mon te rakhibole',
  'nav.more': 'Aru',
  'nav.progress': 'Age barha',
  'nav.settings': 'Setting',
  'nav.signOut': 'Ulai jabo',

  'home.greeting.morning': 'Bhal phojur, {name}',
  'home.greeting.afternoon': 'Bhal dinte, {name}',
  'home.greeting.evening': 'Bhal hanja, {name}',
  'home.todaysPlan': 'Aji laga plan',
  'home.whatWouldYouLike': 'Apuni ki koribo mon ase?',
  'home.allDone': 'Aji laga sob kaam hoi gise. Bisi bhal!',

  'games.title': 'Kheli aru kaam',
  'games.subtitle': 'Aste aste koribi. Ghori nai, jor nai.',
  'games.memory': 'Mon te rakha kheli',
  'games.attention': 'Dhyan diya kheli',
  'games.play': 'Kheli lobi',
  'games.playAgain': 'Aru ekbar kheli lobi',
  'games.backToGames': 'Kheli te wapas jabo',

  'feedback.wellDone': 'Bisi bhal hoise!',
  'feedback.greatJob': 'Bahut bhal kaam!',
  'feedback.thatsRight': 'Ekdom thik!',
  'feedback.oneMore': 'Ahok aru ekta koribo.',
  'feedback.takeYourTime': 'Somoi loi kene koribi.',
  'feedback.keepGoing': 'Apuni bhal kori ase. Age jabi!',

  'myDay.title': 'Moi laga din',
  'myDay.morning': 'Phojur',
  'myDay.afternoon': 'Dinte',
  'myDay.evening': 'Hanja',
  'myDay.markDone': 'Hoi gise',

  'reminders.title': 'Mon te rakhibole',
  'reminders.type.medicine': 'Dawai',
  'reminders.type.water': 'Pani',
  'reminders.type.appointment': 'Lok kora',
  'reminders.type.activity': 'Kaam',

  'progress.title': 'Apuni kineka kori ase',
  'settings.title': 'Setting',
  'settings.language': 'Bhasa',

  'companion.name': 'Modot kora sathi',
  'companion.askMe': 'Moi kineka modot koribo?',
  'companion.speak': 'Moke kobi',
  'companion.typeHere': 'Ki lage likhibi…',
  'companion.state.listening': 'Huni ase…',
  'companion.state.thinking': 'Bhabi ase…',
  'companion.state.speaking': 'Koi ase',
  'companion.say.help': 'Moi kheli, mon te rakhibole, apuni laga din nohoile age barha dikhabo pare.',
};

export default nag;
