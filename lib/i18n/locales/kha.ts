import type { Dictionary } from './en';

/**
 * Khasi (Latin script).
 * Partial coverage — core strings only; the rest falls back to English.
 */
const kha: Partial<Dictionary> = {
  'common.tagline': 'Ban ri ïa ki jingkynmaw, ban pyndonkam ïa ka jingim',
  'common.continue': 'Iaid shaphrang',
  'common.back': 'Phai noh',
  'common.next': 'Ka bat',
  'common.cancel': 'Bret noh',
  'common.save': 'Buh',
  'common.close': 'Khang',
  'common.done': 'La lah',
  'common.start': 'Sdang',
  'common.today': 'Mynta ka sngi',
  'common.help': 'Jingïarap',
  'common.settings': 'Ki jingsiew',
  'common.loading': 'Dang pyndap…',
  'common.retry': 'Yn pyrshang biang',

  'welcome.getStarted': 'Sdang',
  'welcome.body':
    'Ka nongïarap ba suk na ka bynta ki kam bad ki jingpyrshang jingkynmaw ka sngi ka sngi.',
  'language.title': 'Jied ïa ka ktien jong phi',

  'role.title': 'Nga long u/ka…',
  'role.patient.title': 'Nongpang / Nongrim',
  'role.patient.desc': 'Nga donkam jingïarap ha ki kam bad ki jingpyrshang jingkynmaw.',
  'role.caregiver.title': 'Nongri / Ïing-ïap',
  'role.caregiver.desc': 'Nga kwah ban ïarap bad peit ïa u/ka ba nga ieit.',

  'auth.login': 'Rung',
  'auth.signup': 'Thaw akaunt',
  'auth.password': 'Password',

  'nav.home': 'Ïing',
  'nav.games': 'Ki jingkai',
  'nav.myDay': 'Ka sngi jong nga',
  'nav.reminders': 'Ki jingpynkynmaw',
  'nav.more': 'Kiwei',
  'nav.progress': 'Ka jingmih',
  'nav.settings': 'Ki jingsiew',
  'nav.signOut': 'Mih noh',

  'home.greeting.morning': 'Khublei step, {name}',
  'home.greeting.afternoon': 'Khublei sngi, {name}',
  'home.greeting.evening': 'Khublei mynjun, {name}',
  'home.todaysPlan': 'Ka plan jong mynta ka sngi',
  'home.whatWouldYouLike': 'Aiu phi kwah ban leh?',
  'home.allDone': 'La lah baroh mynta ka sngi. Bha eh!',

  'games.title': 'Ki jingkai bad ki kam',
  'games.subtitle': 'Leh suk suk. Ym don ka por, ym don ka jingkynhun.',
  'games.memory': 'Ki jingkai jingkynmaw',
  'games.attention': 'Ki jingkai jingpeit',
  'games.play': 'Kai',
  'games.playAgain': 'Kai biang',
  'games.backToGames': 'Phai sha ki jingkai',

  'feedback.wellDone': 'Bha eh!',
  'feedback.greatJob': 'Kam babha!',
  'feedback.thatsRight': 'Katba hok!',
  'feedback.oneMore': 'To ngi pyrshang shuwa ruh.',
  'feedback.takeYourTime': 'Wad ka por jong phi.',
  'feedback.keepGoing': 'Phi leh bha. Iaid shaphrang!',

  'myDay.title': 'Ka sngi jong nga',
  'myDay.morning': 'Step',
  'myDay.afternoon': 'Miet sngi',
  'myDay.evening': 'Mynjun',
  'myDay.markDone': 'La lah',

  'reminders.title': 'Ki jingpynkynmaw',
  'reminders.type.medicine': 'Dawai',
  'reminders.type.water': 'Um',
  'reminders.type.appointment': 'Jingïakynduh',
  'reminders.type.activity': 'Kam',

  'progress.title': 'Ka jingmih jong phi',
  'settings.title': 'Ki jingsiew',
  'settings.language': 'Ktien',

  'companion.name': 'Nongïarap',
  'companion.askMe': 'Kumno nga lah ban ïarap?',
  'companion.speak': 'Ong ha nga',
  'companion.typeHere': 'Thoh kaba phi donkam…',
  'companion.state.listening': 'Dang sngew…',
  'companion.state.thinking': 'Dang pyrkhat…',
  'companion.state.speaking': 'Dang ong',
};

export default kha;
