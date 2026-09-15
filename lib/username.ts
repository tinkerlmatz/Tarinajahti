// Nimimerkin normalisointi kirjautumisavaimeksi (synteettistä sähköpostia varten).
// Näyttönimi (profiles.username) säilyy alkuperäisenä ääkkösineen; tämä tuottaa
// vain ascii-avaimen jolla kirjautuminen tapahtuu.

// HUOM: käytä kelvollista TLD:tä — Supabase hylkää esim. ".local".
const EMAIL_DOMAIN = "tarinajahti.fi";

/** Nimimerkki → ascii-avain: pienet kirjaimet, diakriitit pois, vain a-z0-9_-. */
export function usernameKey(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // poista diakriitit (ä→a, ö→o, å→a, é→e)
    .replace(/[^a-z0-9_-]/g, ""); // vain sallitut merkit
}

/** Nimimerkki → synteettinen sähköposti Supabase-Authia varten. */
export function usernameToEmail(username: string): string {
  return `${usernameKey(username)}@${EMAIL_DOMAIN}`;
}
