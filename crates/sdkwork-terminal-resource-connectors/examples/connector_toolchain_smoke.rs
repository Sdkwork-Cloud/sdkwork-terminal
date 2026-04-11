use sdkwork_terminal_resource_connectors::{
    run_toolchain_smoke, ConnectorSmokeStatus, SystemCommandRunner,
};

fn main() {
    let runner = SystemCommandRunner;
    let mut failed = false;

    for target_kind in target_kinds_from_args() {
        match run_toolchain_smoke(&target_kind, &runner) {
            Ok(report) => {
                println!(
                    "[{}] {} => {} {} :: {}",
                    smoke_status_label(report.status),
                    report.target_kind,
                    report.command.program,
                    report.command.args.join(" "),
                    report.details
                );

                if matches!(report.status, ConnectorSmokeStatus::Failed) {
                    failed = true;
                }
            }
            Err(error) => {
                eprintln!("[invalid] {} => {:?}", target_kind, error);
                failed = true;
            }
        }
    }

    if failed {
        std::process::exit(1);
    }
}

fn target_kinds_from_args() -> Vec<String> {
    let args = std::env::args().skip(1).collect::<Vec<_>>();
    if args.is_empty() {
        vec![
            "ssh".to_string(),
            "docker-exec".to_string(),
            "kubernetes-exec".to_string(),
        ]
    } else {
        args
    }
}

fn smoke_status_label(status: ConnectorSmokeStatus) -> &'static str {
    match status {
        ConnectorSmokeStatus::Passed => "passed",
        ConnectorSmokeStatus::Failed => "failed",
        ConnectorSmokeStatus::Skipped => "skipped",
    }
}
