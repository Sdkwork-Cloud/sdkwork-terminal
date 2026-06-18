{{- define "sdkwork-terminal-runtime-node.name" -}}
sdkwork-terminal-runtime-node
{{- end -}}

{{- define "sdkwork-terminal-runtime-node.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "sdkwork-terminal-runtime-node.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
