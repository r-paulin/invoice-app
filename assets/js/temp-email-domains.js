/**
 * Denylist of temporary/disposable email domains. Keep in sync with assets/data/temp-email-domains.txt
 */
var TEMP_EMAIL_DOMAINS = [
  '10minutemail.com', '10minutemail.net', 'guerrillamail.com', 'guerrillamail.net',
  'mailinator.com', 'temp-mail.org', 'tempmail.com', 'throwaway.email', 'yopmail.com',
  'getnada.com', 'fakeinbox.com', 'trashmail.com', 'sharklasers.com', 'guerrillamail.org',
  'maildrop.cc', 'tempail.com', 'dispostable.com', 'mailnesia.com'
];

if (typeof window !== 'undefined') {
  window.InvioTempEmailDomains = TEMP_EMAIL_DOMAINS;
}
