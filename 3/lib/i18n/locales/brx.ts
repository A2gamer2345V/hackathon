import type { Dictionary } from './en';

/**
 * बर’ / Bodo (Devanagari script).
 * Partial coverage — core strings only; the rest falls back to English.
 */
const brx: Partial<Dictionary> = {
  'common.tagline': 'गोसोखांनायखौ रैखा खालामनाय',
  'common.continue': 'थाबाय थां',
  'common.back': 'फिन',
  'common.next': 'उननि',
  'common.cancel': 'नेवसि',
  'common.save': 'दोन',
  'common.close': 'बन्द खालाम',
  'common.done': 'जाबाय',
  'common.start': 'जागाय',
  'common.today': 'दिनै',
  'common.help': 'मदद',
  'common.settings': 'सेटिं',
  'common.loading': 'लादिं दं…',

  'welcome.getStarted': 'जागाय',
  'language.title': 'नोंथांनि राव सायख',

  'role.title': 'आं मोनसे…',
  'role.patient.title': 'बिरामी / बुरै-बुरा',
  'role.caregiver.title': 'रैखाग्रा / नखर',

  'auth.login': 'लगइन',
  'auth.signup': 'साइन आप',
  'auth.password': 'पासवर्ड',

  'nav.home': 'नो',
  'nav.games': 'गेलेनाय',
  'nav.myDay': 'आंनि सान',
  'nav.reminders': 'गोसोखां',
  'nav.more': 'गोबां',
  'nav.progress': 'थाखाय',
  'nav.settings': 'सेटिं',
  'nav.signOut': 'ओंखार',

  'home.greeting.morning': 'गुबुन फुं, {name}',
  'home.greeting.afternoon': 'नमस्कार, {name}',
  'home.greeting.evening': 'गुबुन बेलासे, {name}',
  'home.todaysPlan': 'दिननि थांखि',
  'home.whatWouldYouLike': 'नोंथाङा मा मावनो लुबैयो?',

  'games.title': 'गेलेनाय',
  'games.memory': 'गोसोखांनायनि गेलेनाय',
  'games.attention': 'गोसो होनायनि गेलेनाय',
  'games.play': 'गेले',
  'games.playAgain': 'फिन गेले',

  'feedback.wellDone': 'गोजौ जाबाय!',
  'feedback.greatJob': 'जोबोर मोजां!',
  'feedback.thatsRight': 'थार!',
  'feedback.takeYourTime': 'लासैनो मावबाय थां।',
  'feedback.keepGoing': 'नोंथाङा मोजां मावदों। थाबाय थां!',

  'myDay.title': 'आंनि सान',
  'myDay.morning': 'फुं',
  'myDay.afternoon': 'सानजा',
  'myDay.evening': 'बेलासे',
  'myDay.markDone': 'जाबाय',

  'reminders.title': 'गोसोखां',
  'reminders.type.medicine': 'मेडिसिन',
  'reminders.type.water': 'दै',
  'reminders.type.appointment': 'नुनाय',
  'reminders.type.activity': 'खामानि',

  'progress.title': 'नोंथांनि थाखाय',
  'settings.title': 'सेटिं',
  'settings.language': 'राव',

  'companion.name': 'मददग्रा',
  'companion.askMe': 'आं माबोरै मदद खालामगोन?',
  'companion.speak': 'आंनो बुं',
  'companion.state.listening': 'खोनासंगासिनो दं…',
  'companion.state.thinking': 'सानगासिनो दं…',
  'companion.state.speaking': 'बुंगासिनो दं',
};

export default brx;
