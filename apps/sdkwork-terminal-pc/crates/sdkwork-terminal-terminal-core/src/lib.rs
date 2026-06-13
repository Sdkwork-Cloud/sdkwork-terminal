pub const CRATE_ID: &str = "sdkwork-terminal-terminal-core";

pub fn crate_id() -> &'static str {
    CRATE_ID
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TerminalViewport {
    pub cols: u16,
    pub rows: u16,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TerminalLine {
    pub kind: TerminalLineKind,
    pub text: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TerminalLineKind {
    Input,
    Output,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TerminalSelection {
    pub start_line: usize,
    pub start_column: usize,
    pub end_line: usize,
    pub end_column: usize,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TerminalSearchMatch {
    pub line_index: usize,
    pub start_column: usize,
    pub end_column: usize,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TerminalSnapshot {
    pub viewport: TerminalViewport,
    pub visible_lines: Vec<TerminalLine>,
    pub total_lines: usize,
    pub selection: Option<TerminalSelection>,
    pub selected_text: Option<String>,
    pub search_query: Option<String>,
    pub matches: Vec<TerminalSearchMatch>,
}

#[derive(Debug, Clone)]
pub struct TerminalCore {
    viewport: TerminalViewport,
    scrollback_limit: usize,
    lines: Vec<TerminalLine>,
    selection: Option<TerminalSelection>,
    selected_text: Option<String>,
    search_query: Option<String>,
    matches: Vec<TerminalSearchMatch>,
}

impl TerminalCore {
    pub fn new(viewport: TerminalViewport, scrollback_limit: usize) -> Self {
        Self {
            viewport,
            scrollback_limit,
            lines: Vec::new(),
            selection: None,
            selected_text: None,
            search_query: None,
            matches: Vec::new(),
        }
    }

    pub fn write_output(&mut self, chunk: &str) {
        self.append_lines(chunk, TerminalLineKind::Output);
    }

    pub fn write_input(&mut self, input: &str) {
        self.append_lines(&format!("$ {input}"), TerminalLineKind::Input);
    }

    pub fn resize(&mut self, viewport: TerminalViewport) {
        self.viewport = viewport;
    }

    pub fn search(&mut self, query: &str) -> Vec<TerminalSearchMatch> {
        let trimmed = query.trim();
        self.search_query = (!trimmed.is_empty()).then(|| trimmed.to_string());
        self.refresh_matches();
        self.matches.clone()
    }

    pub fn select(&mut self, selection: TerminalSelection) {
        let normalized = self.normalize_selection(selection);
        self.selection = Some(normalized);
        self.selected_text = self.extract_selection_text(normalized);
    }

    pub fn copy_selection(&self) -> Option<String> {
        self.selected_text.clone()
    }

    pub fn snapshot(&self) -> TerminalSnapshot {
        TerminalSnapshot {
            viewport: self.viewport,
            visible_lines: self
                .lines
                .iter()
                .cloned()
                .rev()
                .take(self.viewport.rows as usize)
                .collect::<Vec<_>>()
                .into_iter()
                .rev()
                .collect(),
            total_lines: self.lines.len(),
            selection: self.selection,
            selected_text: self.selected_text.clone(),
            search_query: self.search_query.clone(),
            matches: self.matches.clone(),
        }
    }

    fn append_lines(&mut self, chunk: &str, kind: TerminalLineKind) {
        for line in chunk.split('\n').filter(|line| !line.is_empty()) {
            self.lines.push(TerminalLine {
                kind,
                text: line.replace('\r', ""),
            });
        }

        if self.lines.len() > self.scrollback_limit {
            let keep_from = self.lines.len() - self.scrollback_limit;
            self.lines.drain(0..keep_from);
        }

        self.refresh_matches();

        if let Some(selection) = self.selection {
            let normalized = self.normalize_selection(selection);
            self.selection = Some(normalized);
            self.selected_text = self.extract_selection_text(normalized);
        }
    }

    fn refresh_matches(&mut self) {
        let Some(query) = self.search_query.clone() else {
            self.matches.clear();
            return;
        };

        let needle = query.to_lowercase();
        self.matches = self
            .lines
            .iter()
            .enumerate()
            .filter_map(|(line_index, line)| {
                let start_column = line.text.to_lowercase().find(&needle)?;
                Some(TerminalSearchMatch {
                    line_index,
                    start_column,
                    end_column: start_column + needle.len(),
                    text: line.text[start_column..start_column + needle.len()].to_string(),
                })
            })
            .collect();
    }

    fn normalize_selection(&self, selection: TerminalSelection) -> TerminalSelection {
        if self.lines.is_empty() {
            return TerminalSelection {
                start_line: 0,
                start_column: 0,
                end_line: 0,
                end_column: 0,
            };
        }

        let starts_after_end = selection.start_line > selection.end_line
            || (selection.start_line == selection.end_line
                && selection.start_column > selection.end_column);

        let normalized = if starts_after_end {
            TerminalSelection {
                start_line: selection.end_line,
                start_column: selection.end_column,
                end_line: selection.start_line,
                end_column: selection.start_column,
            }
        } else {
            selection
        };

        let start_line = normalized.start_line.min(self.lines.len() - 1);
        let end_line = normalized.end_line.min(self.lines.len() - 1);

        TerminalSelection {
            start_line,
            start_column: normalized
                .start_column
                .min(self.lines[start_line].text.len()),
            end_line,
            end_column: normalized.end_column.min(self.lines[end_line].text.len()),
        }
    }

    fn extract_selection_text(&self, selection: TerminalSelection) -> Option<String> {
        if self.lines.is_empty() {
            return None;
        }

        let mut selected = Vec::new();

        for line_index in selection.start_line..=selection.end_line {
            let line = self.lines.get(line_index)?;

            if selection.start_line == selection.end_line {
                selected.push(line.text[selection.start_column..selection.end_column].to_string());
                continue;
            }

            if line_index == selection.start_line {
                selected.push(line.text[selection.start_column..].to_string());
                continue;
            }

            if line_index == selection.end_line {
                selected.push(line.text[..selection.end_column].to_string());
                continue;
            }

            selected.push(line.text.clone());
        }

        Some(selected.join("\n"))
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
    fn terminal_core_tracks_scrollback_search_and_selection() {
        let mut core = TerminalCore::new(TerminalViewport { cols: 80, rows: 3 }, 6);

        core.write_output("server ready\nsession resumed\ncodex attached\nsearch markers");
        core.write_input("help");
        core.resize(TerminalViewport { cols: 132, rows: 4 });
        let matches = core.search("session");
        core.select(TerminalSelection {
            start_line: 1,
            start_column: 0,
            end_line: 1,
            end_column: 7,
        });

        let snapshot = core.snapshot();

        assert_eq!(snapshot.viewport.cols, 132);
        assert_eq!(snapshot.total_lines, 5);
        assert_eq!(snapshot.visible_lines.len(), 4);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].text, "session");
        assert_eq!(core.copy_selection().as_deref(), Some("session"));
    }

    #[test]
    fn terminal_core_enforces_scrollback_limit() {
        let mut core = TerminalCore::new(TerminalViewport { cols: 80, rows: 2 }, 3);

        core.write_output("line-1\nline-2\nline-3\nline-4");

        let snapshot = core.snapshot();

        assert_eq!(snapshot.total_lines, 3);
        assert_eq!(
            snapshot
                .visible_lines
                .iter()
                .map(|line| line.text.as_str())
                .collect::<Vec<_>>(),
            vec!["line-3", "line-4"]
        );
    }
}
