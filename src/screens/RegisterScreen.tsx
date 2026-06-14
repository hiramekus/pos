import { useState, useRef, useCallback } from 'react'
import { Plus, Minus, Camera, CheckCircle2, ShoppingBag, ReceiptText, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Product, CartItem } from '../types'
import BarcodeScanner from '../components/BarcodeScanner'
import scanStartVoiceUrl from '../../001_ずんだもん（ノーマル）_商品をスキャンする….wav'
import sameProductVoiceUrl from '../../002_ずんだもん（ノーマル）_同じ商品がスキャン….wav'
import checkoutCompleteVoiceUrl from '../../003_ずんだもん（ノーマル）_お買い上げ、ありが….wav'
import scanBeepUrl from '../../レジが通る音.mp3'

const audioUrls = [
  scanStartVoiceUrl,
  scanBeepUrl,
  sameProductVoiceUrl,
  checkoutCompleteVoiceUrl,
]

const RegisterScreen = () => {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isScannerActive, setIsScannerActive] = useState(false)
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'processing' | 'succeeded'>('idle')
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [showRegForm, setShowRegForm] = useState(false)
  const [regData, setRegData] = useState({ name: '', price: '' })

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)

  const lastScanTimeRef = useRef<number>(0)
  const lastAcceptedBarcodeRef = useRef<string | null>(null)
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map())

  const getAudioElement = useCallback((url: string) => {
    const audioElements = audioElementsRef.current
    const existing = audioElements.get(url)
    if (existing) return existing

    const audio = new Audio(url)
    audio.preload = 'auto'
    audioElements.set(url, audio)
    return audio
  }, [])

  const prepareAudio = useCallback(() => {
    audioUrls.forEach(url => {
      getAudioElement(url).load()
    })
  }, [getAudioElement])

  const playAudio = useCallback((url: string) => {
    const audio = getAudioElement(url)
    audio.pause()
    audio.currentTime = 0
    audio.play().catch(error => {
      console.warn('Audio playback failed', error)
    })
  }, [getAudioElement])

  const playAudioUntilEnded = useCallback((url: string) => {
    const audio = getAudioElement(url)
    audio.pause()
    audio.currentTime = 0

    return new Promise<void>(resolve => {
      const cleanup = () => {
        audio.removeEventListener('ended', handleEnded)
        audio.removeEventListener('error', handleError)
        window.clearTimeout(timeoutId)
      }
      const handleEnded = () => {
        cleanup()
        resolve()
      }
      const handleError = () => {
        cleanup()
        resolve()
      }
      const timeoutId = window.setTimeout(() => {
        cleanup()
        resolve()
      }, 6000)

      audio.addEventListener('ended', handleEnded)
      audio.addEventListener('error', handleError)
      audio.play().catch(error => {
        console.warn('Audio playback failed', error)
        cleanup()
        resolve()
      })
    })
  }, [getAudioElement])

  const playAudioAfter = useCallback((url: string, delayMs: number) => {
    window.setTimeout(() => playAudio(url), delayMs)
  }, [playAudio])

  const handleStartScanner = useCallback(() => {
    prepareAudio()
    lastAcceptedBarcodeRef.current = null
    playAudio(scanStartVoiceUrl)
    setIsScannerActive(true)
  }, [playAudio, prepareAudio])

  // Handle Scan
  const handleScan = useCallback(async (barcode: string) => {
    const now = Date.now()
    // クールダウン時間を少し短く（1.5秒）にしてみます
    if (now - lastScanTimeRef.current < 1500) return 
    lastScanTimeRef.current = now

    console.log("Scanned:", barcode) // デバッグ用に残します

    const isSameConsecutiveProduct = lastAcceptedBarcodeRef.current === barcode
    lastAcceptedBarcodeRef.current = barcode

    playAudio(scanBeepUrl)
    if (isSameConsecutiveProduct) {
      playAudioAfter(sameProductVoiceUrl, 350)
    }

    setLastScannedCode(barcode)

    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single()

    if (product) {
      addToCart(product)
    } else {
      setIsScannerActive(false)
      setShowRegForm(true)
    }
  }, [playAudio, playAudioAfter])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta)
        return { ...item, quantity: newQty }
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const handleCheckout = async () => {
    if (cart.length === 0 || checkoutStatus !== 'idle') return

    try {
      setCheckoutStatus('processing')
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({ total_amount: totalAmount })
        .select()
        .single()

      if (saleError) throw saleError

      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      setCheckoutStatus('succeeded')
      await playAudioUntilEnded(checkoutCompleteVoiceUrl)
      setCart([])
      lastAcceptedBarcodeRef.current = null
      setCheckoutStatus('idle')
    } catch (err) {
      console.error(err)
      alert('エラーが発生しました。オフラインモードか、Supabaseの設定を確認してください。')
      
      // Fallback for local play if Supabase fails
      if (confirm('デモモードとして会計を完了しますか？（データは保存されません）')) {
         setCheckoutStatus('succeeded')
         await playAudioUntilEnded(checkoutCompleteVoiceUrl)
         setCart([])
         lastAcceptedBarcodeRef.current = null
      }
      setCheckoutStatus('idle')
    }
  }

  const handleRegisterProduct = async () => {
    if (!lastScannedCode || !regData.name || !regData.price) return

    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          barcode: lastScannedCode,
          name: regData.name,
          price: parseInt(regData.price)
        })
        .select()
        .single()

      if (error) throw error

      addToCart(data)
      setShowRegForm(false)
      setRegData({ name: '', price: '' })
    } catch (err) {
      alert('登録に失敗しました。')
      console.error(err)
    }
  }

  return (
    <div className="register-layout">
      <section className="register-panel cart-panel">
        <div className="register-panel-header">
          <div>
            <div className="section-kicker">ITEMS</div>
            <h2 className="section-title">
              <ShoppingBag size={26} />
              お買い上げ商品
            </h2>
          </div>
          <button className="button button-primary scan-button" onClick={handleStartScanner}>
            <Camera size={24} /> スキャン
          </button>
        </div>

        <div className="cart-list">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ReceiptText size={48} />
              <div>商品をスキャンしてください</div>
            </div>
          ) : (
            <div className="cart-table">
              <div className="cart-table-head">
                <span>商品</span>
                <span>数量</span>
                <span>金額</span>
              </div>
              {cart.map(item => (
                <div key={item.id} className="cart-row">
                  <div className="cart-item-main">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-code">{item.barcode}</div>
                  </div>
                  <div className="quantity-control">
                    <button className="icon-button" aria-label="数量を減らす" onClick={() => updateQuantity(item.id, -1)}>
                      <Minus size={18} />
                    </button>
                    <span>{item.quantity}</span>
                    <button className="icon-button" aria-label="数量を増やす" onClick={() => updateQuantity(item.id, 1)}>
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="cart-row-price">¥{item.price * item.quantity}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isScannerActive && (
          <div className="modal-backdrop scanner-backdrop">
             <div className="scanner-dialog">
               <BarcodeScanner onScan={handleScan} onClose={() => setIsScannerActive(false)} />
             </div>
          </div>
        )}

        {showRegForm && (
          <div className="modal-backdrop">
             <div className="card register-dialog">
               <h2>新規商品登録</h2>
               <p style={{ margin: '8px 0 20px', color: 'var(--color-text-muted)' }}>バーコード: {lastScannedCode}</p>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <input 
                   className="card" 
                   style={{ width: '100%', boxSizing: 'border-box', borderWidth: '2px' }} 
                   placeholder="商品名 (例: うまい棒)"
                   value={regData.name}
                   onChange={e => setRegData({...regData, name: e.target.value})}
                 />
                 <input 
                   type="number"
                   className="card" 
                   style={{ width: '100%', boxSizing: 'border-box', borderWidth: '2px' }} 
                   placeholder="価格 (例: 15)"
                   value={regData.price}
                   onChange={e => setRegData({...regData, price: e.target.value})}
                 />
                 <div className="flex gap-12">
                   <button className="button button-primary flex-1" onClick={handleRegisterProduct}>登録して追加</button>
                   <button className="button button-outline" onClick={() => setShowRegForm(false)}>キャンセル</button>
                 </div>
               </div>
             </div>
          </div>
        )}
      </section>

      <aside className={`register-panel payment-panel ${checkoutStatus !== 'idle' ? `payment-panel-${checkoutStatus}` : ''}`}>
        <div>
          <div className="section-kicker">PAYMENT</div>
          <h2 className="section-title">お支払い</h2>
        </div>

        <div className="summary-list">
          <div>
            <span>小計</span>
            <strong>¥{totalAmount}</strong>
          </div>
          <div>
            <span>点数</span>
            <strong>{totalQuantity}点</strong>
          </div>
        </div>

        <div className="total-box">
          <span>合計</span>
          <div>
            ¥{totalAmount}
          </div>
        </div>

        <button 
          className="button checkout-button" 
          onClick={handleCheckout}
          disabled={cart.length === 0 || checkoutStatus !== 'idle'}
        >
          {checkoutStatus === 'processing' ? (
            <LoaderCircle size={34} className="button-spinner" />
          ) : (
            <CheckCircle2 size={34} />
          )}
          {checkoutStatus === 'processing' ? '処理中' : '会計へ進む'}
        </button>

        {checkoutStatus !== 'idle' && (
          <div className={`checkout-status checkout-status-${checkoutStatus}`} aria-live="polite">
            <div className="checkout-status-icon">
              {checkoutStatus === 'processing' ? (
                <LoaderCircle size={72} />
              ) : (
                <CheckCircle2 size={78} />
              )}
            </div>
            <div className="checkout-status-copy">
              <div className="checkout-status-title">
                {checkoutStatus === 'processing' ? '会計処理中' : '会計完了'}
              </div>
              <div className="checkout-status-text">
                {checkoutStatus === 'processing' ? 'お支払いを確定しています' : 'ありがとうございました'}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

export default RegisterScreen
