import type { Dictionary } from './en';

/**
 * A·chik / Garo (Latin script).
 * Partial coverage — core strings only; the rest falls back to English.
 */
const grt: Partial<Dictionary> = {
  'common.tagline': 'Ku·nachengara ge·et·aniko nianga',
  'common.continue': 'Chong·mota',
  'common.back': 'Gisik',
  'common.next': 'Ua ja·man',
  'common.cancel': 'Ra·doka',
  'common.save': 'Donga',
  'common.close': 'Kambea',
  'common.done': 'Ong·jok',
  'common.start': 'Chachata',
  'common.today': 'Sal·gni',
  'common.help': 'Dakgipa',
  'common.settings': 'Setting',
  'common.loading': 'Ra·enga…',

  'welcome.getStarted': 'Chachata',
  'language.title': 'Na·a ku·siko sikna',

  'role.title': 'Anga dongenga…',
  'role.patient.title': 'Dukgipa / Bimingatgipa',
  'role.caregiver.title': 'Nikgipa / Nokdang',

  'auth.login': 'Login',
  'auth.signup': 'Sign up',
  'auth.password': 'Password',

  'nav.home': 'Nok',
  'nav.games': 'Kamal·aniko',
  'nav.myDay': 'Anga sal',
  'nav.reminders': 'Ku·nachenganiko',
  'nav.more': 'Gita',
  'nav.progress': 'Chong·mothaniko',
  'nav.settings': 'Setting',
  'nav.signOut': 'Wat·ata',

  'home.greeting.morning': 'Namen prinang, {name}',
  'home.greeting.afternoon': 'Namen sal, {name}',
  'home.greeting.evening': 'Namen attam, {name}',
  'home.todaysPlan': 'Sal·gnini kamrang',
  'home.whatWouldYouLike': 'Na·a maiko ka·sako?',

  'games.title': 'Kamal·aniko',
  'games.memory': 'Ku·nachenganini kamal·ani',
  'games.attention': 'Nianini kamal·ani',
  'games.play': 'Kamal·ata',
  'games.playAgain': 'Wal·gipa kamal·ata',

  'feedback.wellDone': 'Namen ong·jok!',
  'feedback.greatJob': 'Bak·bak namgipa!',
  'feedback.thatsRight': 'Ong·a!',
  'feedback.takeYourTime': 'Sokate ka·na.',
  'feedback.keepGoing': 'Na·a namen ka·enga. Chong·mota!',

  'myDay.title': 'Anga sal',
  'myDay.morning': 'Prinang',
  'myDay.afternoon': 'Sal·gitchak',
  'myDay.evening': 'Attam',
  'myDay.markDone': 'Ong·jok',

  'reminders.title': 'Ku·nachenganiko',
  'reminders.type.medicine': 'Sam',
  'reminders.type.water': 'Chi',
  'reminders.type.appointment': 'Nikani',
  'reminders.type.activity': 'Kam',

  'progress.title': 'Na·ani chong·mothaniko',
  'settings.title': 'Setting',
  'settings.language': 'Ku·si',

  'companion.name': 'Dakgipa bandhu',
  'companion.askMe': 'Anga bata dakgen?',
  'companion.speak': 'Angna agana',
  'companion.state.listening': 'Knaenga…',
  'companion.state.thinking': 'Nikenga…',
  'companion.state.speaking': 'Aganenga',
};

export default grt;
