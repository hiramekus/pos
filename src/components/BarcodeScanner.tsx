import { useEffect, useRef, useState } from 'react'
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from 'html5-qrcode'

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void
  onClose?: () => void
}

const supportedBarcodeFormats = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
]

const getBarcodeQrbox = (viewfinderWidth: number, viewfinderHeight: number) => ({
  width: Math.floor(Math.min(viewfinderWidth * 0.92, 760)),
  height: Math.floor(Math.min(viewfinderHeight * 0.48, 340)),
})

const frontCameraConstraints: MediaTrackConstraints = {
  facingMode: { ideal: 'user' },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
}

const BarcodeScanner = ({ onScan, onClose }: BarcodeScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const elementId = 'barcode-reader-target'

  useEffect(() => {
    let isMounted = true
    const html5QrCode = new Html5Qrcode(elementId, {
      formatsToSupport: supportedBarcodeFormats,
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    })
    scannerRef.current = html5QrCode

    const startScanner = async () => {
      // 少し待機して、前のインスタンスのクリーンアップ時間を確保する
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (!isMounted) return

      try {
        await html5QrCode.start(
          frontCameraConstraints,
          {
            fps: 20,
            qrbox: getBarcodeQrbox,
            aspectRatio: 16 / 9,
            disableFlip: false,
          },
          (decodedText) => {
            if (isMounted) onScan(decodedText)
          },
          () => { /* ignore */ }
        )
      } catch (err) {
        if (isMounted) {
          console.error("Scanner Error:", err)
          setInitError("カメラの起動に失敗しました。再読み込みしてください。")
        }
      }
    }

    startScanner()

    return () => {
      isMounted = false
      const scanner = scannerRef.current
      scannerRef.current = null

      if (!scanner) return

      const clearScanner = () => {
        try {
          scanner.clear()
        } catch (e) {
          console.warn("Cleanup error", e)
        }
      }

      if (scanner.isScanning) {
        scanner.stop().then(clearScanner).catch(e => console.warn("Cleanup error", e))
      } else {
        clearScanner()
      }
    }
  }, [onScan])

  return (
    <div className="card scanner-view">
      {initError ? (
        <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>
          {initError}
          <button className="button button-primary" style={{ marginTop: '20px' }} onClick={() => window.location.reload()}>再読み込み</button>
        </div>
      ) : (
        <div id={elementId} style={{ width: '100%' }}></div>
      )}
      
      <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(0,0,0,0.6)', borderRadius: '20px', color: '#fff', fontSize: '0.9rem' }}>
          バーコードをスキャン
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex' }}>
        {onClose && (
          <button 
            className="button" 
            onClick={onClose}
            style={{ flex: 1, borderRadius: 0, background: '#fff', color: '#000', height: '60px' }}
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  )
}

export default BarcodeScanner
