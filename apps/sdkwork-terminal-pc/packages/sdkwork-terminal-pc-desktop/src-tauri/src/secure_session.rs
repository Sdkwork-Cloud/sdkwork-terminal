const SERVICE_NAME: &str = "com.sdkwork.sdkwork.terminal.desktop";
const ACCOUNT_NAME: &str = "sdkwork-terminal.iam.session";

fn keyring_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE_NAME, ACCOUNT_NAME).map_err(|error| error.to_string())
}

pub fn read_secure_session_payload() -> Result<Option<String>, String> {
    let entry = keyring_entry()?;
    match entry.get_password() {
        Ok(payload) => Ok(Some(payload)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

pub fn write_secure_session_payload(payload: String) -> Result<(), String> {
    if payload.trim().is_empty() {
        return clear_secure_session_payload();
    }

    keyring_entry()?
        .set_password(&payload)
        .map_err(|error| error.to_string())
}

pub fn clear_secure_session_payload() -> Result<(), String> {
    let entry = keyring_entry()?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}
