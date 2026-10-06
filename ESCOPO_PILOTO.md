# Vizi Vendas — escopo: demo gratuita × piloto pago

Este documento descreve o que muda entre a demonstração gratuita de 7
dias e o piloto contratado. Não contém valores — isso é definido à
parte.

## Comparação

| | Demo gratuita (7 dias) | Piloto pago |
|---|---|---|
| Ambiente | Compartilhado, de testes (Supabase da Natilla) | Próprio e separado — novo projeto Supabase, região Europa (menor latência pra Moçambique) |
| Dados | Fictícios, só pra avaliação | Reais — produtos, estoque e vendas do quiosque de verdade |
| Usuários | 4 contas de demonstração fixas | Contas reais do gestor e dos funcionários do quiosque |
| Prazo | Expira sozinho em 7 dias | Sem data de expiração, enquanto a mensalidade estiver em dia |
| Permissões | Modelo padrão (gestor não vende, só vê estoque/produtos/cancelamentos) | Pode ser ajustado à rotina real do quiosque (ver "Melhorias sugeridas" abaixo) |
| Suporte | Nenhum formal — é só teste | Treinamento inicial do gestor + suporte contínuo |
| Backups | Nenhum (ambiente de teste, pode ser resetado) | Backups regulares do banco de dados |

## O que muda, em detalhe

- **Ambiente próprio e separado.** O piloto roda num projeto Supabase
  novo, exclusivo do quiosque — não compartilha banco com a demo nem
  com nenhum outro cliente futuro. Região Europa (mais perto de
  Moçambique que a região atual, usada só pra desenvolvimento).
- **Dados reais.** Cadastro dos produtos de verdade (com preço, categoria,
  tamanho quando aplicável) e do estoque real de abertura.
- **Usuários reais.** Contas de login criadas pro gestor e pros
  funcionários de verdade do quiosque (não mais "Fátima"/"João"/"Manuel"
  fictícios).
- **Sem expiração enquanto a mensalidade estiver em dia.** O mecanismo
  de prazo (`sistema_ativo`) que bloqueia a demo depois de 7 dias é
  desligado no piloto — o acesso continua liberado enquanto o pagamento
  estiver em dia.
- **Treinamento do gestor.** Sessão explicando cada tela e fluxo
  (produtos, estoque, cancelamentos, fechamento de caixa).
- **Suporte.** Canal direto pra dúvidas e problemas durante o uso real.
- **Backups.** Rotina de backup do banco de dados do piloto.

## Melhorias sugeridas para o piloto

Identificadas durante os testes da demo, fazem mais sentido pra um
quiosque pequeno de verdade do que pro modelo padrão:

- **Gestor acompanhar o resumo do dia** (hoje essa tela é só do dono).
- **Gestor também poder vender** (hoje só funcionário abre caixa e
  vende) — em quiosque pequeno o gestor às vezes atende.

Ambas são ajustes de permissão, não recursos novos — tecnicamente já
mapeados, implementação rápida quando o piloto for confirmado.

## Fora do escopo (neste piloto)

- Integração com maquininha de cartão ou carteiras móveis (M-Pesa,
  e-Mola, etc.) — hoje a forma de pagamento é só um registro informativo,
  sem processar a transação de verdade.
- Emissão de documentos fiscais (fatura, recibo oficial).
- Qualquer funcionalidade nova não listada neste documento ou no
  `PLAN.md` — pode ser discutida e orçada separadamente, mas não faz
  parte do piloto inicial.

## Critérios de sucesso do piloto

- O caixa bate no fechamento (valor contado confere com o esperado).
- Os funcionários conseguem usar o sistema sem ajuda depois de uma
  semana de uso.
- O dono consegue acompanhar as vendas à distância (sem precisar estar
  fisicamente no quiosque).

## Propriedade

O sistema e o código-fonte do Vizi Vendas continuam sendo propriedade
da Natilla. O cliente recebe uma licença de uso do sistema, não a
posse do software.
