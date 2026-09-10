import type { Dictionary } from './en';

/**
 * Karbi / Arleng (Latin script).
 * Partial coverage — core strings only; the rest falls back to English.
 */
const mjw: Partial<Dictionary> = {
  'common.continue': 'Damthu',
  'common.back': 'Kelang',
  'common.next': 'Aphi',
  'common.cancel': 'Kave',
  'common.save': 'Cheklo',
  'common.close': 'Kangthur',
  'common.done': 'Kadam',
  'common.start': 'Kepathe',
  'common.today': 'Aning',
  'common.help': 'Kroi',
  'common.settings': 'Setting',
  'common.loading': 'Load lo…',

  'welcome.getStarted': 'Kepathe',
  'language.title': 'Nangli lam thekpi',

  'role.title': 'Ne la…',
  'role.patient.title': 'Aduk / Aso-arni',
  'role.caregiver.title': 'Kroipi / Hemphu',

  'auth.login': 'Login',
  'auth.signup': 'Sign up',
  'auth.password': 'Password',

  'nav.home': 'Hem',
  'nav.games': 'Kelang-ke',
  'nav.myDay': 'Ne aning',
  'nav.reminders': 'Kachiroi',
  'nav.more': 'Aphi',
  'nav.progress': 'Kedam',
  'nav.settings': 'Setting',
  'nav.signOut': 'Kelo',

  'home.greeting.morning': 'Kardom aphi, {name}',
  'home.greeting.afternoon': 'Kardom aning, {name}',
  'home.greeting.evening': 'Kardom arni, {name}',
  'home.todaysPlan': 'Aning aphan',
  'home.whatWouldYouLike': 'Nang komat klem?',

  'games.title': 'Kelang-ke',
  'games.memory': 'Kachiroi kelang',
  'games.attention': 'Kangtui kelang',
  'games.play': 'Kelang',
  'games.playAgain': 'Aphi kelang',

  'feedback.wellDone': 'Kardom!',
  'feedback.greatJob': 'Mesen kardom!',
  'feedback.thatsRight': 'Kethe!',
  'feedback.takeYourTime': 'Ahut chelo.',
  'feedback.keepGoing': 'Nang mesen klem. Damthu!',

  'myDay.title': 'Ne aning',
  'myDay.morning': 'Aphi',
  'myDay.afternoon': 'Aning',
  'myDay.evening': 'Arni',
  'myDay.markDone': 'Kadam',

  'reminders.title': 'Kachiroi',
  'reminders.type.medicine': 'Osai',
  'reminders.type.water': 'Lang',
  'reminders.type.appointment': 'Kangtui',
  'reminders.type.activity': 'Kelam',

  'progress.title': 'Nangli kedam',
  'settings.title': 'Setting',
  'settings.language': 'Lam',

  'companion.name': 'Kroipi',
  'companion.askMe': 'Ne komat kroi?',
  'companion.speak': 'Ne aphan pu',
  'companion.state.listening': 'Kangtui lo…',
  'companion.state.thinking': 'Kepen lo…',
  'companion.state.speaking': 'Pu lo',
};

export default mjw;
