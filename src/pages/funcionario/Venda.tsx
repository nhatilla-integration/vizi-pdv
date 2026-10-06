import { useMemo, useState } from 'react'
import { useProdutos, useEstoque } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'
import { formatMT } from '../../lib/format'
import type { FormaPagamento, Turno } from '../../lib/types'

const FORMAS: { id: FormaPagamento; label: string }[] = [
  { id: 'numerario', label: 'Numerário' },
  { id: 'carteira_movel', label: 'Carteira móvel' },
  { id: 'cartao', label: 'Cartão' },
]

export default function Venda({ turno, onFecharCaixa }: { turno: Turno; onFecharCaixa: () => void }) {
  const { produtos, loading: carregandoProdutos } = useProdutos()
  const { estoque, loading: carregandoEstoque, refetch: refetchEstoque } = useEstoque()
  const [carrinho, setCarrinho] = useState<Record<string, number>>({})
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('numerario')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [finalizando, setFinalizando] = useState(false)

  const categorias = useMemo(
    () => Array.from(new Set(produtos.map((p) => p.categoria))),
    [produtos]
  )

  const produtosFiltrados = categoriaAtiva ? produtos.filter((p) => p.categoria === categoriaAtiva) : produtos

  const itensCarrinho = useMemo(
    () =>
      Object.entries(carrinho)
        .filter(([, qtd]) => qtd > 0)
        .map(([produtoId, qtd]) => {
          const produto = produtos.find((p) => p.id === produtoId)
          return produto ? { produto, quantidade: qtd } : null
        })
        .filter((x): x is { produto: (typeof produtos)[number]; quantidade: number } => x !== null),
    [carrinho, produtos]
  )

  const total = itensCarrinho.reduce((soma, item) => soma + item.produto.preco * item.quantidade, 0)

  function adicionar(produtoId: string) {
    const saldo = estoque[produtoId] ?? 0
    const atual = carrinho[produtoId] ?? 0
    if (atual >= saldo) return
    setCarrinho((prev) => ({ ...prev, [produtoId]: atual + 1 }))
  }

  function remover(produtoId: string) {
    setCarrinho((prev) => {
      const atual = prev[produtoId] ?? 0
      if (atual <= 1) {
        const { [produtoId]: _omitido, ...resto } = prev
        return resto
      }
      return { ...prev, [produtoId]: atual - 1 }
    })
  }

  async function finalizarVenda() {
    setErro('')
    setSucesso('')

    if (itensCarrinho.length === 0) {
      setErro('Adicione pelo menos um produto ao carrinho.')
      return
    }

    setFinalizando(true)

    const { error } = await supabase.rpc('registrar_venda', {
      p_itens: itensCarrinho.map((item) => ({ produto_id: item.produto.id, quantidade: item.quantidade })),
      p_forma_pagamento: formaPagamento,
    })

    setFinalizando(false)

    if (error) {
      setErro(error.message)
      return
    }

    setCarrinho({})
    setSucesso('Venda registrada com sucesso.')
    refetchEstoque()
    setTimeout(() => setSucesso(''), 3000)
  }

  const carregando = carregandoProdutos || carregandoEstoque

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Nova venda</h1>
            <p className="text-xs text-slate-400">
              Caixa aberto às{' '}
              {new Date(turno.aberto_em).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onClick={onFecharCaixa}
            className="text-sm font-medium text-slate-500 hover:text-brand-blue-dark border border-slate-300 rounded-lg px-4 py-2"
          >
            Fechar caixa
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setCategoriaAtiva(null)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
              categoriaAtiva === null
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border ${
                categoriaAtiva === cat
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="text-slate-400 text-sm">Carregando produtos...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {produtosFiltrados.map((produto) => {
              const saldo = estoque[produto.id] ?? 0
              const noCarrinho = carrinho[produto.id] ?? 0
              const esgotado = saldo <= 0

              return (
                <button
                  key={produto.id}
                  onClick={() => adicionar(produto.id)}
                  disabled={esgotado || noCarrinho >= saldo}
                  className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-brand-blue disabled:opacity-40 disabled:cursor-not-allowed transition-colors relative"
                >
                  {noCarrinho > 0 && (
                    <span className="absolute -top-2 -right-2 bg-brand-orange text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                      {noCarrinho}
                    </span>
                  )}
                  <p className="font-semibold text-slate-900 text-sm leading-tight mb-1">
                    {produto.nome}
                    {produto.tamanho && <span className="font-normal text-slate-400"> ({produto.tamanho})</span>}
                  </p>
                  <p className="text-brand-blue font-bold">{formatMT(produto.preco)}</p>
                  <p className={`text-xs mt-1 ${esgotado ? 'text-red-600' : 'text-slate-400'}`}>
                    {esgotado ? 'Sem estoque' : `${saldo} em estoque`}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sticky top-4">
        <h2 className="font-bold text-slate-900 mb-3">Carrinho</h2>

        {itensCarrinho.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-6 text-center">Nenhum item adicionado</p>
        ) : (
          <div className="flex flex-col gap-3 mb-4 max-h-80 overflow-y-auto">
            {itensCarrinho.map(({ produto, quantidade }) => (
              <div key={produto.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {produto.nome}
                    {produto.tamanho && ` (${produto.tamanho})`}
                  </p>
                  <p className="text-xs text-slate-400">{formatMT(produto.preco)} cada</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => remover(produto.id)}
                    className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 font-bold"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-sm font-semibold">{quantidade}</span>
                  <button
                    onClick={() => adicionar(produto.id)}
                    disabled={quantidade >= (estoque[produto.id] ?? 0)}
                    className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 font-bold disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 pt-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-xl font-bold text-slate-900">{formatMT(total)}</span>
          </div>
        </div>

        <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Forma de pagamento</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {FORMAS.map((forma) => (
            <button
              key={forma.id}
              onClick={() => setFormaPagamento(forma.id)}
              className={`text-xs font-medium rounded-lg py-2.5 border ${
                formaPagamento === forma.id
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              {forma.label}
            </button>
          ))}
        </div>

        {erro && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{erro}</p>
        )}
        {sucesso && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
            {sucesso}
          </p>
        )}

        <button
          onClick={finalizarVenda}
          disabled={finalizando || itensCarrinho.length === 0}
          className="w-full bg-brand-orange hover:bg-brand-orange-dark transition-colors text-white font-semibold rounded-lg py-3.5 disabled:opacity-50"
        >
          {finalizando ? 'Registrando...' : `Finalizar venda — ${formatMT(total)}`}
        </button>
      </div>
    </div>
  )
}
