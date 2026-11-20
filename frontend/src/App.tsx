import styles from './App.module.css'
import { Calculator } from './components/Calculator/Calculator'

function App() {
  return (
    <main className={styles.app}>
      <h1 className={styles.title}>Calculator</h1>
      <Calculator />
      <p className={styles.hint}>
        Keyboard: 0–9 · . · + − * / ^ · % · r for √ · Enter · Backspace · Esc
      </p>
    </main>
  )
}

export default App
