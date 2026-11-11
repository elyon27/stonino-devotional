// Optional cloud configuration. Leave blank to run in private guest mode.
window.STONINO_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  // When using Netlify, the included secure deletion function is available here:
  deleteAccountEndpoint: '/.netlify/functions/delete-account'
};
