// Supabase configuration for account access.
window.STONINO_CONFIG = {
  supabaseUrl: 'https://ooxuleheoijrolfxqlju.supabase.co',
  supabaseAnonKey: 'sb_publishable_4RBWDj3boR-Fi5aRaGrhyQ_fQ_0ui_W',
  prayerPackReceiveQr: {
    20: { image: 'assets/gcash-packs/20-fixed.jpg', amountEncoded: true },
    50: { image: 'assets/gcash-packs/50.jpg', amountEncoded: true },
    100: { image: 'assets/gcash-packs/100.jpg', amountEncoded: true },
    200: { image: 'assets/gcash-packs/200.jpg', amountEncoded: true }
  },
  // When using Netlify, the included secure deletion function is available here:
  deleteAccountEndpoint: '/.netlify/functions/delete-account'
};
