import type { Dictionary } from './en';

/**
 * Mishing / Mising (Latin script).
 * Partial coverage — core strings only; the rest falls back to English.
 */
const mrg: Partial<Dictionary> = {
  'common.continue': 'Gilangdung',
  'common.back': 'Kolang',
  'common.next': 'Aídé',
  'common.cancel': 'Ma:né',
  'common.save': 'Dukpé',
  'common.close': 'Bandhpé',
  'common.done': 'Aiyé',
  'common.start': 'Lukané',
  'common.today': 'Silo',
  'common.help': 'Migbo',
  'common.settings': 'Setting',
  'common.loading': 'Load la:dung…',

  'welcome.getStarted': 'Lukané',
  'language.title': 'Nó agom pé:né',

  'role.title': 'Ngo…',
  'role.patient.title': 'Amìn / Ta:tó',
  'role.caregiver.title': 'Migbóné / Okum',

  'auth.login': 'Login',
  'auth.signup': 'Sign up',
  'auth.password': 'Password',

  'nav.home': 'Okum',
  'nav.games': 'Erné',
  'nav.myDay': 'Ngo lo',
  'nav.reminders': 'Migom',
  'nav.more': 'Aídé',
  'nav.progress': 'Gilangnam',
  'nav.settings': 'Setting',
  'nav.signOut': 'Ilangdung',

  'home.greeting.morning': 'Ayé arloni, {name}',
  'home.greeting.afternoon': 'Ayé silo, {name}',
  'home.greeting.evening': 'Ayé abbé, {name}',
  'home.todaysPlan': 'Silo ané',
  'home.whatWouldYouLike': 'Nó ído mané?',

  'games.title': 'Erné',
  'games.memory': 'Migom erné',
  'games.attention': 'Kenné erné',
  'games.play': 'Erpé',
  'games.playAgain': 'Alu erpé',

  'feedback.wellDone': 'Ayé pé!',
  'feedback.greatJob': 'Ayé aíné!',
  'feedback.thatsRight': 'Aídé!',
  'feedback.takeYourTime': 'Amka amka aíné.',
  'feedback.keepGoing': 'Nó ayé aídung. Gilangdung!',

  'myDay.title': 'Ngo lo',
  'myDay.morning': 'Arloni',
  'myDay.afternoon': 'Silo',
  'myDay.evening': 'Abbé',
  'myDay.markDone': 'Aiyé',

  'reminders.title': 'Migom',
  'reminders.type.medicine': 'Osin',
  'reminders.type.water': 'Asi',
  'reminders.type.appointment': 'Kenné',
  'reminders.type.activity': 'Aíné',

  'progress.title': 'Nó gilangnam',
  'settings.title': 'Setting',
  'settings.language': 'Agom',

  'companion.name': 'Migbóné',
  'companion.askMe': 'Ngo ído migbo?',
  'companion.speak': 'Ngom kené',
  'companion.state.listening': 'Takdung…',
  'companion.state.thinking': 'Mindung…',
  'companion.state.speaking': 'Kendung',
};

export default mrg;
