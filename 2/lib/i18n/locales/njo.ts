import type { Dictionary } from './en';

/**
 * Ao (Mongsen/Chungli, Latin script).
 * Partial coverage — core strings only; the rest falls back to English.
 */
const njo: Partial<Dictionary> = {
  'common.continue': 'Aser ang',
  'common.back': 'Nüngi',
  'common.next': 'Alem',
  'common.cancel': 'Mapok',
  'common.save': 'Tema',
  'common.close': 'Kongdak',
  'common.done': 'Anaro',
  'common.start': 'Ajak',
  'common.today': 'Ani',
  'common.help': 'Nemtsü',
  'common.settings': 'Setting',
  'common.loading': 'Alu…',

  'welcome.getStarted': 'Ajak',
  'language.title': 'Na tenyu asen',

  'role.title': 'Ni ka…',
  'role.patient.title': 'Aliba / Atsüjungla',
  'role.caregiver.title': 'Nemtsüba / Ki-tepzü',

  'auth.login': 'Login',
  'auth.signup': 'Sign up',
  'auth.password': 'Password',

  'nav.home': 'Ki',
  'nav.games': 'Kechi',
  'nav.myDay': 'Ni ani',
  'nav.reminders': 'Anungtet',
  'nav.more': 'Alem',
  'nav.progress': 'Aser',
  'nav.settings': 'Setting',
  'nav.signOut': 'Ozü',

  'home.greeting.morning': 'Amtsüla, {name}',
  'home.greeting.afternoon': 'Aniba, {name}',
  'home.greeting.evening': 'Ayimla, {name}',
  'home.todaysPlan': 'Ani kaket',
  'home.whatWouldYouLike': 'Na kechi tesa?',

  'games.title': 'Kechi',
  'games.memory': 'Anungtet kechi',
  'games.attention': 'Ayong kechi',
  'games.play': 'Kechi',
  'games.playAgain': 'Aser kechi',

  'feedback.wellDone': 'Asangba!',
  'feedback.greatJob': 'Asang tema!',
  'feedback.thatsRight': 'Alemtet!',
  'feedback.takeYourTime': 'Meyu meyu jaka.',
  'feedback.keepGoing': 'Na asang aser. Aser ang!',

  'myDay.title': 'Ni ani',
  'myDay.morning': 'Amtsü',
  'myDay.afternoon': 'Aniba',
  'myDay.evening': 'Ayim',
  'myDay.markDone': 'Anaro',

  'reminders.title': 'Anungtet',
  'reminders.type.medicine': 'Anen',
  'reminders.type.water': 'Tzü',
  'reminders.type.appointment': 'Ayong',
  'reminders.type.activity': 'Ozüng',

  'progress.title': 'Na aser',
  'settings.title': 'Setting',
  'settings.language': 'Tenyu',

  'companion.name': 'Nemtsüba',
  'companion.askMe': 'Ni kechi nemtsü?',
  'companion.speak': 'Ni den ajak',
  'companion.state.listening': 'Ayong…',
  'companion.state.thinking': 'Asem…',
  'companion.state.speaking': 'Ajak',
};

export default njo;
