# Terminal App API Route

Public application-ingress Terminal session routes. The route crate reuses
`sdkwork-terminal-runtime-node::RuntimeNodeHost`, requires framework-injected
`WebRequestContext`, and scopes every session operation to the authenticated
tenant, organization, and subject.
