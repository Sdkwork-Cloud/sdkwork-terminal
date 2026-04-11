pub const CRATE_ID: &str = "sdkwork-terminal-replay-store";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReplayEventKind {
    Output,
    Marker,
    State,
    Warning,
    Exit,
}

impl ReplayEventKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Output => "output",
            Self::Marker => "marker",
            Self::State => "state",
            Self::Warning => "warning",
            Self::Exit => "exit",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "output" => Some(Self::Output),
            "marker" => Some(Self::Marker),
            "state" => Some(Self::State),
            "warning" => Some(Self::Warning),
            "exit" => Some(Self::Exit),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReplayEntry {
    pub session_id: String,
    pub sequence: u64,
    pub cursor: String,
    pub kind: ReplayEventKind,
    pub payload: String,
    pub occurred_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReplaySlice {
    pub session_id: String,
    pub from_cursor: Option<String>,
    pub next_cursor: String,
    pub entries: Vec<ReplayEntry>,
    pub has_more: bool,
}

#[derive(Debug, Clone, Default)]
pub struct ReplayStore {
    session_id: String,
    entries: Vec<ReplayEntry>,
    next_sequence: u64,
}

impl ReplayStore {
    pub fn new(session_id: impl Into<String>) -> Self {
        Self {
            session_id: session_id.into(),
            entries: Vec::new(),
            next_sequence: 1,
        }
    }

    pub fn from_entries(session_id: impl Into<String>, mut entries: Vec<ReplayEntry>) -> Self {
        entries.sort_by_key(|entry| entry.sequence);
        let next_sequence = entries.last().map_or(1, |entry| entry.sequence + 1);

        Self {
            session_id: session_id.into(),
            entries,
            next_sequence,
        }
    }

    pub fn append(
        &mut self,
        kind: ReplayEventKind,
        payload: impl Into<String>,
        occurred_at: impl Into<String>,
    ) -> ReplayEntry {
        let sequence = self.next_sequence;
        self.next_sequence += 1;

        let entry = ReplayEntry {
            session_id: self.session_id.clone(),
            sequence,
            cursor: sequence.to_string(),
            kind,
            payload: payload.into(),
            occurred_at: occurred_at.into(),
        };

        self.entries.push(entry.clone());
        entry
    }

    pub fn replay_from(&self, from_cursor: Option<&str>, limit: usize) -> ReplaySlice {
        let start_after = from_cursor
            .and_then(|cursor| cursor.parse::<u64>().ok())
            .unwrap_or(0);
        let requested = if limit == 0 { 1 } else { limit };
        let remaining = self
            .entries
            .iter()
            .filter(|entry| entry.sequence > start_after)
            .cloned()
            .collect::<Vec<_>>();
        let has_more = remaining.len() > requested;
        let entries = remaining.into_iter().take(requested).collect::<Vec<_>>();
        let next_cursor = entries
            .last()
            .map(|entry| entry.cursor.clone())
            .unwrap_or_else(|| from_cursor.unwrap_or("0").to_string());

        ReplaySlice {
            session_id: self.session_id.clone(),
            from_cursor: from_cursor.map(ToString::to_string),
            next_cursor,
            entries,
            has_more,
        }
    }

    pub fn latest_cursor(&self) -> String {
        self.entries
            .last()
            .map(|entry| entry.cursor.clone())
            .unwrap_or_else(|| "0".to_string())
    }

    pub fn entries(&self) -> &[ReplayEntry] {
        &self.entries
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn exposes_crate_id() {
        assert_eq!(crate_id(), CRATE_ID);
    }

    #[test]
    fn replays_incremental_entries_from_cursor() {
        let mut store = ReplayStore::new("session-1");

        store.append(
            ReplayEventKind::Output,
            "line-1",
            "2026-04-09T00:00:00.000Z",
        );
        store.append(
            ReplayEventKind::Output,
            "line-2",
            "2026-04-09T00:00:01.000Z",
        );

        let first = store.replay_from(None, 1);

        assert_eq!(first.entries.len(), 1);
        assert_eq!(first.entries[0].payload, "line-1");
        assert!(first.has_more);

        let second = store.replay_from(Some(first.next_cursor.as_str()), 10);

        assert_eq!(second.entries.len(), 1);
        assert_eq!(second.entries[0].payload, "line-2");
        assert!(!second.has_more);
    }
}
