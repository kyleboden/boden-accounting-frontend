import './App.css'
import FooterComponent from "./components/FooterComponent"
import HeaderComponent from "./components/HeaderComponent"
import HomeComponent from './components/HomeComponent.jsx'
import ListBrokerageTransactionsComponent from "./components/ListBrokerageTransactionsComponent.jsx"
import BrokerageTransactionComponent from './components/BrokerageTransactionComponent.jsx'
import {BrowserRouter, Routes, Route, Navigate} from 'react-router-dom'
import AuthGate from './auth/AuthGate.jsx'
import TransactionsComponent from './components/TransactionsComponent.jsx'
import SettingsComponent from './components/SettingsComponent.jsx'
import BudgetComponent from './components/BudgetComponent.jsx'

function App() {

  return (
    <>
    <BrowserRouter>
      <AuthGate>
        <HeaderComponent />
        <main className="app-content">
          <Routes>
            {/* // http://localhost:3000 */}
            <Route path='/' element={<HomeComponent />}></Route>
            {/* // Brokerage Transaction Page */}
            <Route path='/brokerage-transactions' element = {<ListBrokerageTransactionsComponent />}></Route>
            <Route path='/transactions' element={<TransactionsComponent />}></Route>
            <Route path='/budget' element={<BudgetComponent />}></Route>
            <Route path='/budget-review' element={<Navigate to='/' replace />}></Route>
            <Route path='/settings' element={<SettingsComponent />}></Route>
            <Route path='/bank-connections' element={<Navigate to='/transactions' replace />}></Route>
            <Route path='/add-brokerage-transaction' element = {<BrokerageTransactionComponent />}></Route>
            <Route path='/edit-brokerage-transaction/:id' element = {<BrokerageTransactionComponent />}></Route>
            {/* // Monthly Review Page*/}
            <Route path='/monthly-reviews' element={<Navigate to='/' replace />}></Route>
            <Route path='/add-monthly-review' element={<Navigate to='/' replace />}></Route>
            <Route path='/monthly-review-confirmation' element={<Navigate to='/' replace />}></Route>
            <Route path='/edit-monthly-review/:id' element={<Navigate to='/' replace />}></Route>
          </Routes>
        </main>
        <FooterComponent />
      </AuthGate>
    </BrowserRouter>
    </>
  )
}

export default App
