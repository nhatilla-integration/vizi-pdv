import { useState } from 'react'
import Layout from '../components/Layout'
import { useTurnoAberto } from '../lib/hooks'
import AbrirCaixa from './funcionario/AbrirCaixa'
import Venda from './funcionario/Venda'
import FecharCaixa from './funcionario/FecharCaixa'

export default function FuncionarioHome() {
  const { turno, loading, refetch } = useTurnoAberto()
  const [fechando, setFechando] = useState(false)

  if (loading) {
    return (
      <Layout>
        <p className="text-slate-400 text-sm">Carregando...</p>
      </Layout>
    )
  }

  if (!turno) {
    return (
      <Layout>
        <AbrirCaixa onAberto={refetch} />
      </Layout>
    )
  }

  if (fechando) {
    return (
      <Layout>
        <FecharCaixa
          turno={turno}
          onCancelar={() => setFechando(false)}
          onFechado={() => {
            setFechando(false)
            refetch()
          }}
        />
      </Layout>
    )
  }

  return (
    <Layout>
      <Venda turno={turno} onFecharCaixa={() => setFechando(true)} />
    </Layout>
  )
}
