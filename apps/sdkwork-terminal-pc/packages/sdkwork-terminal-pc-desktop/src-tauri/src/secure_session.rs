//! Secure session payload store backed by the OS keyring.
//!
//! Design (per SECURITY_SPEC §"Sensitive tokens SHOULD be stored in secure
//! host storage where available"):
//! - **Encryption**: AES-256-GCM with HKDF-SHA256-derived per-slot keys. The
//!   master key is a 32-byte CSPRNG value stored in a dedicated keyring entry.
//!   Payloads are encrypted at rest in addition to the OS keyring's own
//!   confidentiality guarantees, providing defense-in-depth.
//! - **Versioning**: Every stored envelope is prefixed with `v1:` so future
//!   format migrations can detect the version and upgrade without data loss.
//! - **TTL**: Each envelope carries `created_at` and `expires_at` timestamps.
//!   Expired sessions are treated as absent on read and cleared lazily.
//! - **Multi-slot**: Named slots (`default`, `work`, ...) isolate independent
//!   sessions. Each slot has its own keyring entry and derived encryption key.
//!
//! Envelope format (at rest): `v1:<base64(nonce || ciphertext)>` where the
//! decrypted plaintext is a JSON object:
//! ```json
//! {
//!   "version": 1,
//!   "slot": "default",
//!   "created_at": 1719500000,
//!   "expires_at": 1719503600,
//!   "payload": "<caller payload>"
//! }
//! ```

use sdkwork_utils_rust::crypto::{aes_gcm_decrypt, aes_gcm_encrypt, derive_aes_256_key};
use sdkwork_utils_rust::id::random_string;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// Keyring service name. All sdkwork-terminal credentials live under this
/// service so they can be audited and cleared together.
const SERVICE_NAME: &str = "com.sdkwork.sdkwork.terminal.desktop";

/// Account name for the master key entry. The master key is a 32-byte
/// CSPRNG value, base64-encoded, used as HKDF input material for per-slot
/// encryption keys.
const MASTER_KEY_ACCOUNT: &str = "sdkwork-terminal.iam.master-key";

/// Account name prefix for session slots. The full account name is
/// `sdkwork-terminal.iam.session.<slot>`.
const SESSION_ACCOUNT_PREFIX: &str = "sdkwork-terminal.iam.session.";

/// Envelope version. Increment when the plaintext JSON schema changes.
const ENVELOPE_VERSION: u8 = 1;

/// Envelope version prefix stored at rest before the encrypted payload.
const ENVELOPE_VERSION_PREFIX: &str = "v1:";

/// Default slot name when callers do not specify one.
const DEFAULT_SLOT: &str = "default";

/// Default session TTL: 7 days. Keeps session persistence ergonomic for
/// desktop usage while bounding the window in which a stolen keyring entry
/// remains useful.
const DEFAULT_TTL_SECONDS: u64 = 7 * 24 * 60 * 60;

/// Maximum slot name length. Bounds keyring account names and prevents
/// abuse of the slot parameter as a storage vector.
const MAX_SLOT_LEN: usize = 64;

/// HKDF salt for per-slot key derivation. Mixed with the slot name in the
/// `info` parameter so each slot derives an independent key.
const HKDF_SALT: &[u8] = b"sdkwork-terminal-secure-session-v1";

/// Plaintext envelope stored inside the encrypted payload.
#[derive(Debug, Serialize, Deserialize)]
struct SessionEnvelope {
    version: u8,
    slot: String,
    created_at: u64,
    expires_at: u64,
    payload: String,
}

/// Validate a slot name. Slot names MUST be non-empty, alphanumeric with
/// dashes/underscores, and bounded in length so keyring account names stay
/// within OS limits and cannot be abused as a storage vector.
fn validate_slot(slot: &str) -> Result<(), String> {
    if slot.is_empty() {
        return Err("slot name must not be empty".to_string());
    }
    if slot.len() > MAX_SLOT_LEN {
        return Err(format!(
            "slot name must not exceed {MAX_SLOT_LEN} characters"
        ));
    }
    if !slot
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(
            "slot name must contain only alphanumeric characters, dashes, or underscores"
                .to_string(),
        );
    }
    Ok(())
}

fn normalize_slot(slot: Option<&str>) -> Result<&str, String> {
    match slot {
        Some(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                return Err("slot name must not be empty".to_string());
            }
            validate_slot(trimmed)?;
            Ok(trimmed)
        }
        None => Ok(DEFAULT_SLOT),
    }
}

fn session_account(slot: &str) -> String {
    format!("{SESSION_ACCOUNT_PREFIX}{slot}")
}

fn now_unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn keyring_entry(account: &str) -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE_NAME, account).map_err(|error| error.to_string())
}

/// Read (or lazily create) the master key from the keyring. The master key
/// is a 32-byte CSPRNG value, base64-encoded. On first use a new key is
/// generated and stored so subsequent reads are deterministic.
fn ensure_master_key() -> Result<[u8; 32], String> {
    let entry = keyring_entry(MASTER_KEY_ACCOUNT)?;
    let existing = match entry.get_password() {
        Ok(value) => Some(value),
        Err(keyring::Error::NoEntry) => None,
        Err(error) => return Err(error.to_string()),
    };

    if let Some(encoded) = existing.filter(|v| !v.trim().is_empty()) {
        return decode_master_key(&encoded);
    }

    // First-use: generate a high-entropy master key. 43 base64-url characters
    // decode to ~32 bytes of entropy; we derive the AES key via HKDF so the
    // exact length is not critical as long as entropy is sufficient.
    let generated = random_string(43);
    entry
        .set_password(&generated)
        .map_err(|error| error.to_string())?;
    let mut key = [0u8; 32];
    let salt = HKDF_SALT;
    let info = b"master-key";
    let derived = derive_aes_256_key(generated.as_bytes(), salt, info);
    key.copy_from_slice(&derived);
    Ok(key)
}

fn decode_master_key(encoded: &str) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    let derived = derive_aes_256_key(encoded.trim().as_bytes(), HKDF_SALT, b"master-key");
    key.copy_from_slice(&derived);
    Ok(key)
}

/// Derive a per-slot AES-256 key from the master key. Each slot gets an
/// independent key via HKDF info binding, so compromising one slot's key
/// does not reveal other slots.
fn derive_slot_key(master_key: &[u8; 32], slot: &str) -> [u8; 32] {
    let info = format!("session-slot:{slot}");
    derive_aes_256_key(master_key, HKDF_SALT, info.as_bytes())
}

fn encrypt_envelope(envelope: &SessionEnvelope, slot_key: &[u8; 32]) -> Result<String, String> {
    let plaintext = serde_json::to_vec(envelope)
        .map_err(|error| format!("serialize session envelope: {error}"))?;
    let ciphertext = aes_gcm_encrypt(slot_key, &plaintext)?;
    Ok(format!("{ENVELOPE_VERSION_PREFIX}{ciphertext}"))
}

fn decrypt_envelope(stored: &str, slot_key: &[u8; 32]) -> Result<SessionEnvelope, String> {
    let encrypted = stored
        .strip_prefix(ENVELOPE_VERSION_PREFIX)
        .ok_or_else(|| "unsupported session envelope version".to_string())?;
    let plaintext = aes_gcm_decrypt(slot_key, encrypted)?;
    let envelope: SessionEnvelope = serde_json::from_slice(&plaintext)
        .map_err(|error| format!("deserialize session envelope: {error}"))?;
    if envelope.version != ENVELOPE_VERSION {
        return Err(format!(
            "unsupported session envelope version field: {}",
            envelope.version
        ));
    }
    Ok(envelope)
}

/// Read a session payload from the given slot. Returns `Ok(None)` when the
/// slot is empty or the envelope has expired (expired entries are cleared
/// lazily on read).
pub fn read_secure_session_payload(slot: Option<&str>) -> Result<Option<String>, String> {
    let slot = normalize_slot(slot)?;
    let entry = keyring_entry(&session_account(slot))?;
    let stored = match entry.get_password() {
        Ok(value) => value,
        Err(keyring::Error::NoEntry) => return Ok(None),
        Err(error) => return Err(error.to_string()),
    };

    if stored.trim().is_empty() {
        return Ok(None);
    }

    let master_key = ensure_master_key()?;
    let slot_key = derive_slot_key(&master_key, slot);

    let envelope = match decrypt_envelope(&stored, &slot_key) {
        Ok(value) => value,
        Err(_) => {
            // Invalid envelope (legacy format, corruption, or wrong key).
            // Clear the entry so the slot returns to a clean state per the
            // "no technical debt" principle: we do not retain unreadable
            // credentials.
            let _ = entry.delete_credential();
            return Ok(None);
        }
    };

    if envelope.slot != slot {
        // Slot mismatch indicates cross-slot corruption; clear and return None.
        let _ = entry.delete_credential();
        return Ok(None);
    }

    let now = now_unix_seconds();
    if envelope.expires_at <= now {
        // Expired: clear lazily and report absent.
        let _ = entry.delete_credential();
        return Ok(None);
    }

    Ok(Some(envelope.payload))
}

/// Write a session payload to the given slot with an optional TTL. When
/// `payload` is empty, the slot is cleared. When `ttl_seconds` is `None`,
/// the default TTL (`DEFAULT_TTL_SECONDS`) is applied.
pub fn write_secure_session_payload(
    payload: String,
    slot: Option<&str>,
    ttl_seconds: Option<u64>,
) -> Result<(), String> {
    if payload.trim().is_empty() {
        return clear_secure_session_payload(slot);
    }

    let slot = normalize_slot(slot)?;
    let ttl = ttl_seconds.unwrap_or(DEFAULT_TTL_SECONDS);
    let now = now_unix_seconds();
    let expires_at = now.saturating_add(ttl);

    let envelope = SessionEnvelope {
        version: ENVELOPE_VERSION,
        slot: slot.to_string(),
        created_at: now,
        expires_at,
        payload,
    };

    let master_key = ensure_master_key()?;
    let slot_key = derive_slot_key(&master_key, slot);
    let stored = encrypt_envelope(&envelope, &slot_key)?;

    keyring_entry(&session_account(slot))?
        .set_password(&stored)
        .map_err(|error| error.to_string())
}

/// Clear a session payload from the given slot. Returns `Ok(())` when the
/// slot was already empty.
pub fn clear_secure_session_payload(slot: Option<&str>) -> Result<(), String> {
    let slot = normalize_slot(slot)?;
    let entry = keyring_entry(&session_account(slot))?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_slot_rejects_empty_and_oversized() {
        assert!(validate_slot("").is_err());
        assert!(validate_slot(&"a".repeat(MAX_SLOT_LEN + 1)).is_err());
        assert!(validate_slot("default").is_ok());
        assert!(validate_slot("work-profile_1").is_ok());
    }

    #[test]
    fn validate_slot_rejects_special_characters() {
        assert!(validate_slot("default slot").is_err());
        assert!(validate_slot("default/slot").is_err());
        assert!(validate_slot("default.slot").is_err());
        assert!(validate_slot("default:slot").is_err());
    }

    #[test]
    fn normalize_slot_defaults_to_default() {
        assert_eq!(normalize_slot(None).unwrap(), DEFAULT_SLOT);
        assert_eq!(
            normalize_slot(Some("  ")).unwrap_err(),
            "slot name must not be empty"
        );
        assert_eq!(normalize_slot(Some("custom")).unwrap(), "custom");
    }

    #[test]
    fn session_account_includes_slot() {
        assert_eq!(
            session_account("default"),
            "sdkwork-terminal.iam.session.default"
        );
        assert_eq!(session_account("work"), "sdkwork-terminal.iam.session.work");
    }

    #[test]
    fn envelope_round_trip_preserves_payload() {
        let master_key = [0x42u8; 32];
        let slot = "test-round-trip";
        let slot_key = derive_slot_key(&master_key, slot);
        let now = now_unix_seconds();
        let envelope = SessionEnvelope {
            version: ENVELOPE_VERSION,
            slot: slot.to_string(),
            created_at: now,
            expires_at: now + 3600,
            payload: "{\"sessionId\":\"abc-123\"}".to_string(),
        };
        let stored = encrypt_envelope(&envelope, &slot_key).expect("encrypt");
        assert!(stored.starts_with(ENVELOPE_VERSION_PREFIX));
        let decrypted = decrypt_envelope(&stored, &slot_key).expect("decrypt");
        assert_eq!(decrypted.payload, envelope.payload);
        assert_eq!(decrypted.slot, envelope.slot);
        assert_eq!(decrypted.version, ENVELOPE_VERSION);
    }

    #[test]
    fn decrypt_rejects_legacy_payload_without_version_prefix() {
        let master_key = [0x42u8; 32];
        let slot_key = derive_slot_key(&master_key, "legacy");
        let result = decrypt_envelope("raw-legacy-payload", &slot_key);
        assert!(result.is_err());
    }

    #[test]
    fn decrypt_rejects_corrupt_envelope() {
        let master_key = [0x42u8; 32];
        let slot_key = derive_slot_key(&master_key, "corrupt");
        // Valid prefix but invalid base64/ciphertext.
        let result = decrypt_envelope(&format!("{ENVELOPE_VERSION_PREFIX}!!!invalid"), &slot_key);
        assert!(result.is_err());
    }

    #[test]
    fn derive_slot_key_isolation_between_slots() {
        let master_key = [0x42u8; 32];
        let key_default = derive_slot_key(&master_key, "default");
        let key_work = derive_slot_key(&master_key, "work");
        assert_ne!(key_default, key_work, "slots must derive independent keys");
    }

    #[test]
    fn envelope_rejects_wrong_slot_key() {
        let master_key = [0x42u8; 32];
        let slot_a_key = derive_slot_key(&master_key, "slot-a");
        let slot_b_key = derive_slot_key(&master_key, "slot-b");

        let envelope = SessionEnvelope {
            version: ENVELOPE_VERSION,
            slot: "slot-a".to_string(),
            created_at: now_unix_seconds(),
            expires_at: now_unix_seconds() + 3600,
            payload: "secret".to_string(),
        };
        let stored = encrypt_envelope(&envelope, &slot_a_key).expect("encrypt");
        // Decrypting with the wrong slot key MUST fail (AEAD authentication).
        assert!(decrypt_envelope(&stored, &slot_b_key).is_err());
    }
}
