import type { Dictionary } from './en';

/**
 * Kokborok / Tripuri (Latin script).
 * Partial coverage — core strings only; the rest falls back to English.
 */
const trp: Partial<Dictionary> = {
  'common.tagline': 'Kaisa khumnaini rwchapmung',
  'common.continue': 'Thangdi',
  'common.back': 'Phaidi',
  'common.next': 'Uni bade',
  'common.cancel': 'Nokhainai',
  'common.save': 'Thandi',
  'common.close': 'Bandhwi',
  'common.done': 'Jaisali',
  'common.start': 'Hamjakdi',
  'common.today': 'Tini',
  'common.help': 'Rwchapmung',
  'common.settings': 'Setting',
  'common.loading': 'Load jakwi…',

  'welcome.getStarted': 'Hamjakdi',
  'language.title': 'Nwng bwsa kok bwsagwi',

  'role.title': 'Ang bwrwi…',
  'role.patient.title': 'Nokhwrwk / Burui-Burwi',
  'role.caregiver.title': 'Rwchapnaimung / Nokma',

  'auth.login': 'Login',
  'auth.signup': 'Sign up',
  'auth.password': 'Password',

  'nav.home': 'Nok',
  'nav.games': 'Lamsa',
  'nav.myDay': 'Ang sal',
  'nav.reminders': 'Khumnai',
  'nav.more': 'Batwi',
  'nav.progress': 'Thangnai',
  'nav.settings': 'Setting',
  'nav.signOut': 'Bwrwi',

  'home.greeting.morning': 'Hamjakma phung, {name}',
  'home.greeting.afternoon': 'Hamjakma sal, {name}',
  'home.greeting.evening': 'Hamjakma sanja, {name}',
  'home.todaysPlan': 'Tinini kamani',
  'home.whatWouldYouLike': 'Nwng tamo kaimani?',

  'games.title': 'Lamsa',
  'games.memory': 'Khumnaini lamsa',
  'games.attention': 'Nainaini lamsa',
  'games.play': 'Lamdi',
  'games.playAgain': 'Bar lamdi',

  'feedback.wellDone': 'Hamjakma!',
  'feedback.greatJob': 'Bwsa hamjak!',
  'feedback.thatsRight': 'Ai bwsa!',
  'feedback.takeYourTime': 'Kwrwi kwrwi kaidi.',
  'feedback.keepGoing': 'Nwng hamjak kaiwi. Thangdi!',

  'myDay.title': 'Ang sal',
  'myDay.morning': 'Phung',
  'myDay.afternoon': 'Sal',
  'myDay.evening': 'Sanja',
  'myDay.markDone': 'Jaisali',

  'reminders.title': 'Khumnai',
  'reminders.type.medicine': 'Bwswrwi',
  'reminders.type.water': 'Twi',
  'reminders.type.appointment': 'Nainai',
  'reminders.type.activity': 'Kam',

  'progress.title': 'Nwngni thangnai',
  'settings.title': 'Setting',
  'settings.language': 'Kok',

  'companion.name': 'Rwchapnaimung',
  'companion.askMe': 'Ang bwrwi rwchapnai?',
  'companion.speak': 'Angni kwtal',
  'companion.state.listening': 'Khenaiwi…',
  'companion.state.thinking': 'Sikhawi…',
  'companion.state.speaking': 'Kwtalwi',
};

export default trp;
