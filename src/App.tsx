import { useState } from 'react'
import { ShoppingBag, Database, History } from 'lucide-react'
import RegisterScreen from './screens/RegisterScreen.tsx'
import ProductMasterScreen from './screens/ProductMasterScreen.tsx'
import SalesHistoryScreen from './screens/SalesHistoryScreen.tsx'

type Screen = 'REGISTER' | 'PRODUCTS' | 'HISTORY'

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('REGISTER')

  const renderScreen = () => {
    switch (currentScreen) {
      case 'REGISTER':
        return <RegisterScreen />
      case 'PRODUCTS':
        return <ProductMasterScreen />
      case 'HISTORY':
        return <SalesHistoryScreen />
      default:
        return <RegisterScreen />
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-mark">
          <div className="brand-square">POS<br />REG</div>
          <h1 className="brand-title">ひらめ商店 POS</h1>
        </div>
        <nav className="top-nav">
          <button 
            className={`button ${currentScreen === 'REGISTER' ? 'button-primary' : 'button-outline'}`}
            onClick={() => setCurrentScreen('REGISTER')}
          >
            <ShoppingBag size={20} /> レジ
          </button>
          <button 
            className={`button ${currentScreen === 'PRODUCTS' ? 'button-primary' : 'button-outline'}`}
            onClick={() => setCurrentScreen('PRODUCTS')}
          >
            <Database size={20} /> 商品管理
          </button>
          <button 
            className={`button ${currentScreen === 'HISTORY' ? 'button-primary' : 'button-outline'}`}
            onClick={() => setCurrentScreen('HISTORY')}
          >
            <History size={20} /> 売上履歴
          </button>
        </nav>
      </header>

      <main className="flex-1">
        {renderScreen()}
      </main>
      
      <footer className="text-center" style={{ padding: '8px 0', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
        © 2026 どんきょん商店 - Home POS System
      </footer>
    </div>
  )
}

export default App
