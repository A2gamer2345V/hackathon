import type { Dictionary } from './en';

/**
 * মৈতৈলোন্ / Meiteilon (Manipuri).
 * Partial coverage — core navigation and encouragement strings are localised;
 * everything else falls back to English so no screen is ever left blank.
 */
const mni: Partial<Dictionary> = {
  'common.tagline': 'নিংশিংবা য়েংশিনবা, পুন্সি নুংশিবা',
  'common.continue': 'মখা চৎথৌ',
  'common.back': 'হন্থৌ',
  'common.next': 'মথং',
  'common.cancel': 'থাদোকউ',
  'common.save': 'থমজিন্নবা',
  'common.close': 'থিংজিল্লু',
  'common.done': 'লোয়রে',
  'common.start': 'হৌরকউ',
  'common.today': 'ঙসি',
  'common.help': 'মতেং',
  'common.settings': 'শেমদোক-শেমজিন',
  'common.loading': 'লোড তৌরি…',

  'welcome.getStarted': 'হৌরকউ',
  'language.title': 'নহাক্কী লোল খল্লু',

  'role.title': 'ঐহাক্না…',
  'role.patient.title': 'অনাবা / অহল',
  'role.caregiver.title': 'য়েংশিনবা / ইমুং',

  'auth.login': 'লোগইন',
  'auth.signup': 'ময়ুম কৌবা',
  'auth.password': 'পাসৱার্দ',

  'nav.home': 'য়ুম',
  'nav.games': 'শান্নবা',
  'nav.myDay': 'ঐগী নুমিৎ',
  'nav.reminders': 'নিংশিংবা',
  'nav.more': 'মখা',
  'nav.progress': 'মায় পাকপা',
  'nav.settings': 'শেমদোক',
  'nav.signOut': 'থোকপা',

  'home.greeting.morning': 'অয়ুক নুংশি, {name}',
  'home.greeting.afternoon': 'নুংথিল খুরুমজরি, {name}',
  'home.greeting.evening': 'নুমিদাংৱাইরম নুংশি, {name}',
  'home.todaysPlan': 'ঙসিগী থৌরাং',
  'home.whatWouldYouLike': 'নহাক্না করি তৌনিংবগে?',

  'games.title': 'শান্নবা',
  'games.memory': 'নিংশিংবগী শান্নবা',
  'games.attention': 'পুক্নিং চংবগী শান্নবা',
  'games.play': 'শান্নবা',
  'games.playAgain': 'অমুক শান্নবা',

  'feedback.wellDone': 'য়াম্না ফরে!',
  'feedback.greatJob': 'অফবা থবক!',
  'feedback.thatsRight': 'অচুম্বনি!',
  'feedback.takeYourTime': 'তপ্না তৌবিয়ু।',
  'feedback.keepGoing': 'নহাক্না ফনা তৌরি. মখা চৎথৌ!',

  'myDay.title': 'ঐগী নুমিৎ',
  'myDay.morning': 'অয়ুক',
  'myDay.afternoon': 'নুংথিল',
  'myDay.evening': 'নুমিদাং',
  'myDay.markDone': 'লোয়রে',

  'reminders.title': 'নিংশিংবা',
  'reminders.type.medicine': 'হিদাক',
  'reminders.type.water': 'ঈশিং',
  'reminders.type.appointment': 'উনবা',
  'reminders.type.activity': 'থবক',

  'progress.title': 'নহাক্কী মায় পাকপা',
  'settings.title': 'শেমদোক-শেমজিন',
  'settings.language': 'লোল',

  'companion.name': 'মতেং পাংবা',
  'companion.askMe': 'ঐনা করম্না মতেং পাংগে?',
  'companion.speak': 'ঐঙোন্দা হায়বিয়ু',
  'companion.state.listening': 'তারি…',
  'companion.state.thinking': 'খল্লরি…',
  'companion.state.speaking': 'হায়রি',
};

export default mni;
