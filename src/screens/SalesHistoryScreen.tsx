import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { Sale } from '../types'

const SalesHistoryScreen = () => {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('sales')
      .select('*')
      .order('sale_datetime', { ascending: false })
    
    if (data) setSales(data)
    setLoading(false)
  }

  return (
    <div className="card">
      <h2 style={{ marginBottom: '24px' }}>売上履歴</h2>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>会計日時</th>
              <th style={{ padding: '12px' }}>合計金額</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center" style={{ padding: '40px' }}>読み込み中...</td></tr>
            ) : sales.length === 0 ? (
              <tr><td colSpan={3} className="text-center" style={{ padding: '40px' }}>売上履歴がありません</td></tr>
            ) : sales.map(sale => (
              <tr key={sale.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px' }}>
                  {format(new Date(sale.sale_datetime), 'yyyy/MM/dd HH:mm:ss')}
                </td>
                <td style={{ padding: '12px', fontWeight: 800, fontSize: '1.2rem' }}>
                  ¥{sale.total_amount}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <button className="button button-outline" style={{ padding: '8px 16px', fontSize: '0.9rem', margin: '0 auto' }}>
                    詳細
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default SalesHistoryScreen
