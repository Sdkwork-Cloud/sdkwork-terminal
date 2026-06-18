FROM rust:1-bookworm AS builder
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
RUN cargo build --release --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml --bin sdkwork-terminal-runtime-node

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /src/target/release/sdkwork-terminal-runtime-node /usr/local/bin/sdkwork-terminal-runtime-node
ENV SDKWORK_RUNTIME_NODE_BIND_ADDR=127.0.0.1:9620
EXPOSE 9620
HEALTHCHECK CMD curl -f http://127.0.0.1:9620/healthz || exit 1
ENTRYPOINT ["sdkwork-terminal-runtime-node"]
