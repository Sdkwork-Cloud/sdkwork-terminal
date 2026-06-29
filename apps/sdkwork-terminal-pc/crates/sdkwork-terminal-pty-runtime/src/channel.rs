use crate::constants::SESSION_EVENT_CHANNEL_CAPACITY;
use crate::types::LocalShellSessionEvent;
use std::sync::mpsc;

pub type SessionEventSender = mpsc::SyncSender<LocalShellSessionEvent>;

pub fn create_session_event_channel() -> (SessionEventSender, mpsc::Receiver<LocalShellSessionEvent>)
{
    mpsc::sync_channel(SESSION_EVENT_CHANNEL_CAPACITY)
}
