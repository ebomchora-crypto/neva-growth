# Execução de projetos com back-end e terminal — arquitetura proposta (NÃO implementada)

**Estado: projetado, não iniciado.** Hoje a IDE roda projetos **estáticos** (HTML/CSS/JS) em iframe com `sandbox` e CSP `sandbox`.
O "Console JavaScript" da IDE executa uma expressão em um iframe descartável: **não é um terminal** e não deve ser apresentado como tal.
Nenhum código de usuário é executado no processo do servidor.

## Requisitos
Rodar projetos com Node/Python (front + back), instalar dependências e abrir um terminal, sem risco para o servidor, para a rede interna ou para outros usuários.

## Desenho
```
Navegador ──HTTPS──▶ Neva API (Express)          Runner Service (processo/host separado, sem acesso ao banco)
                       │  autenticação + permissões        │  fila de jobs, 1 sandbox por sessão
                       │  gRPC/HTTP interno (mTLS)         ▼
                       └────────────────────────▶  Sandbox efêmera (microVM Firecracker/gVisor ou contêiner rootless)
                                                      • FS temporário com os arquivos do projeto (cópia, não bind do host)
                                                      • usuário sem privilégios, sem capabilities, seccomp/AppArmor
                                                      • limites: CPU, memória, PIDs, disco, tempo de vida (ex.: 30 min ociosos)
                                                      • rede: egress desligado por padrão; allowlist opcional (registro de pacotes via proxy)
                                                      • sem segredos do servidor no ambiente
                                                      • terminal via PTY + WebSocket autenticado, preview por subdomínio isolado
```
## Decisões
1. **Isolamento forte** (microVM/gVisor) em vez de `child_process` no servidor; o Runner roda em host/rede separados.
2. **Cota por plano** (já existe a infraestrutura de planos): minutos de execução, projetos simultâneos, CPU/RAM.
3. **Preview** em origem própria (`*.preview.<domínio>`), nunca na origem do app, para impedir acesso a cookies/API.
4. **Auditoria**: log de início/fim de sessões, comandos de instalação e consumo.
5. **Sincronização de arquivos**: o banco continua sendo a fonte da verdade; a sandbox recebe um snapshot e devolve alterações por endpoint autenticado (com histórico de versões já existente).
6. **Entrega incremental**: (a) executar scripts Node de curta duração com saída em streaming; (b) terminal interativo; (c) servidores de longa duração com preview.

## Por que não foi implementado agora
Exige infraestrutura fora deste repositório (hosts de execução, rede, isolamento de kernel). Implementar `exec` no processo do servidor seria inseguro e foi explicitamente evitado.
