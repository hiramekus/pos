import { useState, useEffect } from 'react'
import { Search, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Product } from '../types'

const ProductMasterScreen = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editData, setEditData] = useState({ barcode: '', name: '', price: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setProducts(data)
    setLoading(false)
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
    
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id))
    }
  }

  const startEdit = (product: Product) => {
    setEditingProduct(product)
    setEditData({
      barcode: product.barcode,
      name: product.name,
      price: String(product.price),
    })
  }

  const closeEdit = () => {
    if (saving) return
    setEditingProduct(null)
    setEditData({ barcode: '', name: '', price: '' })
  }

  const saveProduct = async () => {
    if (!editingProduct) return

    const barcode = editData.barcode.trim()
    const name = editData.name.trim()
    const price = Number(editData.price)

    if (!barcode || !name || !Number.isInteger(price) || price < 0) {
      alert('バーコード、商品名、0円以上の価格を入力してください。')
      return
    }

    setSaving(true)
    const { data, error } = await supabase
      .from('products')
      .update({ barcode, name, price })
      .eq('id', editingProduct.id)
      .select()
      .single()

    setSaving(false)

    if (error) {
      console.error(error)
      alert('商品の更新に失敗しました。バーコードの重複やSupabaseの設定を確認してください。')
      return
    }

    setProducts(prev => prev.map(product => product.id === editingProduct.id ? data : product))
    closeEdit()
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.barcode.includes(searchTerm)
  )

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-24" style={{ marginBottom: '24px' }}>
        <h2>商品マスタ管理</h2>
        <div className="flex gap-12 items-center">
          <div style={{ position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              className="card" 
              style={{ paddingLeft: '40px', padding: '10px 10px 10px 40px', borderRadius: 'var(--radius-sm)' }}
              placeholder="商品名・バーコードで検索"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>バーコード</th>
              <th style={{ padding: '12px' }}>商品名</th>
              <th style={{ padding: '12px' }}>価格</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center" style={{ padding: '40px' }}>読み込み中...</td></tr>
            ) : filteredProducts.length === 0 ? (
              <tr><td colSpan={4} className="text-center" style={{ padding: '40px' }}>商品がありません</td></tr>
            ) : filteredProducts.map(product => (
              <tr key={product.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '12px' }}>{product.barcode}</td>
                <td style={{ padding: '12px', fontWeight: 700 }}>{product.name}</td>
                <td style={{ padding: '12px' }}>¥{product.price}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div className="flex gap-12 justify-center">
                    <button className="button button-outline" style={{ padding: '8px' }} onClick={() => startEdit(product)}>
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="button button-outline" 
                      style={{ padding: '8px', color: '#ef4444', borderColor: '#ef4444' }}
                      onClick={() => deleteProduct(product.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingProduct && (
        <div className="modal-backdrop">
          <div className="card product-edit-dialog">
            <h2>商品を編集</h2>
            <div className="product-edit-form">
              <label>
                <span>バーコード</span>
                <input
                  value={editData.barcode}
                  onChange={e => setEditData({ ...editData, barcode: e.target.value })}
                />
              </label>
              <label>
                <span>商品名</span>
                <input
                  value={editData.name}
                  onChange={e => setEditData({ ...editData, name: e.target.value })}
                />
              </label>
              <label>
                <span>価格</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={editData.price}
                  onChange={e => setEditData({ ...editData, price: e.target.value })}
                />
              </label>
              <div className="flex gap-12">
                <button className="button button-primary flex-1" onClick={saveProduct} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </button>
                <button className="button button-outline" onClick={closeEdit} disabled={saving}>
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductMasterScreen
